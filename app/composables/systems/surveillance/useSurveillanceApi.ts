import type {
	Device,
	CameraDeviceConfig,
	DeviceStreamStartResponse,
	DeviceStreamStatusResponse
} from "~/types/device";
import type { SurveillanceCamera } from "~/types/surveillance";
import { logger } from "~/utils/logger";
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";

const surveillanceLogger = logger.createLogger("Surveillance API");

export const useSurveillanceApi = () => {
	const deviceApi = useDeviceApi();

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
	 * 獲取攝影機列表（用於監視頁面，無串流狀態）
	 */
	const getCamerasWithStreamInfo = async (): Promise<SurveillanceCamera[]> => {
		try {
			const devices = await getCameraDevices();
			return devices
				.filter(
					(device): device is Device & { config: CameraDeviceConfig } =>
						device.config?.type === "camera"
				)
				.map(device => ({
					...device,
					config: device.config as CameraDeviceConfig
				}));
		} catch (error) {
			surveillanceLogger.error("獲取攝影機列表失敗", { error });
			throw error;
		}
	};

	/**
	 * 啟動攝影機串流（MediaMTX），回傳 webrtcUrl
	 */
	const startCameraStream = async (deviceId: number): Promise<DeviceStreamStartResponse> => {
		try {
			return await deviceApi.startStream(deviceId);
		} catch (error) {
			surveillanceLogger.error("啟動串流失敗", { deviceId, error });
			throw error;
		}
	};

	/**
	 * 停止攝影機串流
	 */
	const stopCameraStream = async (deviceId: number): Promise<void> => {
		try {
			await deviceApi.stopStream(deviceId);
		} catch (error) {
			surveillanceLogger.error("停止串流失敗", { deviceId, error });
			throw error;
		}
	};

	/**
	 * 查詢攝影機串流狀態
	 */
	const getCameraStreamStatus = async (
		deviceId: number
	): Promise<DeviceStreamStatusResponse> => {
		try {
			return await deviceApi.getStreamStatus(deviceId);
		} catch (error) {
			surveillanceLogger.error("查詢串流狀態失敗", { deviceId, error });
			throw error;
		}
	};

	return {
		getCameraDevices,
		getCamerasWithStreamInfo,
		startCameraStream,
		stopCameraStream,
		getCameraStreamStatus
	};
};

