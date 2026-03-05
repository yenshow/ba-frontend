import type { Device, CameraDeviceConfig } from "~/types/device";
import type { DevicePreviewUrlResponse } from "~/types/device";
import type { SurveillanceCamera } from "~/types/surveillance";
import { logger } from "~/utils/logger";

const surveillanceLogger = logger.createLogger("Surveillance API");

import { useDeviceApi } from "~/composables/systems/useDeviceApi";

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
	 * 取得設備 MJPEG 預覽 URL
	 */
	const getPreviewUrl = async (deviceId: number): Promise<DevicePreviewUrlResponse> => {
		try {
			return await deviceApi.getPreviewUrl(deviceId);
		} catch (error) {
			surveillanceLogger.error("取得預覽 URL 失敗", { deviceId, error });
			throw error;
		}
	};

	return {
		getCameraDevices,
		getCamerasWithStreamInfo,
		getPreviewUrl
	};
};
