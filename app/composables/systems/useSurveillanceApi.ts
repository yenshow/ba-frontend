import type { Device, CameraDeviceConfig } from "~/types/device";
import type { RTSPStreamInfo } from "~/types/rtsp";
import type { SurveillanceCamera, CameraStreamStatus } from "~/types/surveillance";
import { logger } from "~/utils/logger";

const surveillanceLogger = logger.createLogger("Surveillance API");

/**
 * 從設備配置生成 RTSP URL
 */
const buildRtspUrl = (config: CameraDeviceConfig): string | null => {
	// 如果已經有完整的 RTSP URL，直接使用
	if (config.rtsp_url && config.rtsp_url.startsWith("rtsp://")) {
		return config.rtsp_url;
	}

	// 否則根據 IP、端口、用戶名、密碼構建
	if (!config.ip_address) {
		return null;
	}

	const port = config.port || 554;
	const auth = config.username && config.password 
		? `${config.username}:${config.password}@` 
		: "";

	// 如果 rtsp_url 是相對路徑（以 / 開頭），則與基礎 URL 組合
	if (config.rtsp_url && !config.rtsp_url.startsWith("rtsp://")) {
		const path = config.rtsp_url.startsWith("/") ? config.rtsp_url : `/${config.rtsp_url}`;
		return `rtsp://${auth}${config.ip_address}:${port}${path}`;
	}

	// 如果沒有 rtsp_url，使用預設路徑（根據常見的攝影機配置）
	// 注意：這只是一個預設值，實際應該在設備配置中提供完整的 RTSP URL
	const defaultPath = "/Streaming/Channels/101"; // 海康威視常見路徑
	return `rtsp://${auth}${config.ip_address}:${port}${defaultPath}`;
};

import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { useRtspApi } from "~/composables/systems/useRtsp";

export const useSurveillanceApi = () => {
	const deviceApi = useDeviceApi();
	const rtspApi = useRtspApi();

	/**
	 * 獲取所有攝影機設備
	 */
	const getCameraDevices = async (): Promise<Device[]> => {
		try {
			const response = await deviceApi.getDevices({
				type_code: "camera"
			});
			return response.devices || [];
		} catch (error) {
			surveillanceLogger.error("獲取攝影機設備失敗", { error });
			throw error;
		}
	};

	/**
	 * 獲取攝影機設備並包含串流資訊
	 */
	const getCamerasWithStreamInfo = async (): Promise<SurveillanceCamera[]> => {
		try {
			const devices = await getCameraDevices();
			const streams = await rtspApi.getAllStreamStatus();

			// 建立 RTSP URL 到串流資訊的映射
			const streamMap = new Map<string, RTSPStreamInfo>();
			streams.forEach(stream => {
				streamMap.set(stream.rtspUrl, stream);
			});

			return devices
				.filter((device): device is Device & { config: CameraDeviceConfig } => 
					device.config.type === "camera"
				)
				.map(device => {
					const rtspUrl = buildRtspUrl(device.config as CameraDeviceConfig);
					const streamInfo = rtspUrl ? streamMap.get(rtspUrl) : null;

					return {
						...device,
						config: device.config as CameraDeviceConfig,
						streamInfo: streamInfo || null,
						isStreaming: streamInfo?.status === "running" || false
					};
				});
		} catch (error) {
			surveillanceLogger.error("獲取攝影機與串流資訊失敗", { error });
			throw error;
		}
	};

	/**
	 * 根據設備 ID 啟動攝影機串流
	 */
	const startCameraStream = async (deviceId: number): Promise<RTSPStreamInfo> => {
		try {
			// 獲取設備資訊
			const deviceResponse = await deviceApi.getDevice(deviceId);
			const device = deviceResponse.device;

			if (device.config.type !== "camera") {
				throw new Error("設備不是攝影機類型");
			}

			const config = device.config as CameraDeviceConfig;
			const rtspUrl = buildRtspUrl(config);

			if (!rtspUrl) {
				throw new Error("無法構建 RTSP URL，請檢查設備配置");
			}

			// 啟動串流
			const streamInfo = await rtspApi.startStream(rtspUrl);
			return streamInfo;
		} catch (error) {
			surveillanceLogger.error("啟動攝影機串流失敗", { deviceId, error });
			throw error;
		}
	};

	/**
	 * 根據設備 ID 停止攝影機串流
	 */
	const stopCameraStream = async (deviceId: number): Promise<void> => {
		try {
			// 獲取設備資訊
			const deviceResponse = await deviceApi.getDevice(deviceId);
			const device = deviceResponse.device;

			if (device.config.type !== "camera") {
				throw new Error("設備不是攝影機類型");
			}

			const config = device.config as CameraDeviceConfig;
			const rtspUrl = buildRtspUrl(config);

			if (!rtspUrl) {
				throw new Error("無法構建 RTSP URL");
			}

			// 從 RTSP URL 找到對應的串流
			const streams = await rtspApi.getAllStreamStatus();
			const stream = streams.find(s => s.rtspUrl === rtspUrl);

			if (!stream) {
				surveillanceLogger.warn("未找到對應的串流", { deviceId });
				return;
			}

			// 停止串流
			await rtspApi.stopStream(stream.streamId);
		} catch (error) {
			surveillanceLogger.error("停止攝影機串流失敗", { deviceId, error });
			throw error;
		}
	};

	/**
	 * 根據設備 ID 獲取攝影機串流狀態
	 */
	const getCameraStreamStatus = async (deviceId: number): Promise<CameraStreamStatus | null> => {
		try {
			// 獲取設備資訊
			const deviceResponse = await deviceApi.getDevice(deviceId);
			const device = deviceResponse.device;

			if (device.config.type !== "camera") {
				return null;
			}

			const config = device.config as CameraDeviceConfig;
			const rtspUrl = buildRtspUrl(config);

			if (!rtspUrl) {
				return {
					deviceId,
					status: "error",
					error: "無法構建 RTSP URL"
				};
			}

			// 從所有串流中找到對應的串流
			const streams = await rtspApi.getAllStreamStatus();
			const stream = streams.find(s => s.rtspUrl === rtspUrl);

			if (!stream) {
				return {
					deviceId,
					status: "stopped"
				};
			}

			return {
				deviceId,
				streamId: stream.streamId,
				status: stream.status === "running" ? "running" : "stopped",
				hlsUrl: stream.hlsUrl
			};
		} catch (error) {
			surveillanceLogger.error("獲取攝影機串流狀態失敗", { deviceId, error });
			return {
				deviceId,
				status: "error",
				error: error instanceof Error ? error.message : "未知錯誤"
			};
		}
	};

	/**
	 * 批量獲取多個攝影機的串流狀態
	 */
	const getMultipleCameraStreamStatus = async (deviceIds: number[]): Promise<CameraStreamStatus[]> => {
		try {
			const statuses = await Promise.all(
				deviceIds.map(id => getCameraStreamStatus(id))
			);
			return statuses.filter((s): s is CameraStreamStatus => s !== null);
		} catch (error) {
			surveillanceLogger.error("批量獲取串流狀態失敗", { error });
			return [];
		}
	};

	return {
		getCameraDevices,
		getCamerasWithStreamInfo,
		startCameraStream,
		stopCameraStream,
		getCameraStreamStatus,
		getMultipleCameraStreamStatus,
		buildRtspUrl
	};
};

