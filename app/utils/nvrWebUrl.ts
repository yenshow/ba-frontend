import type { CameraDeviceConfig, Device } from "~/types/device"

/** 是否為 NVR 分類攝影機（虛擬通道；無自帶 rtsp_url） */
export const isNvrCamera = (
	deviceOrConfig:
		| Pick<CameraDeviceConfig, "is_nvr">
		| Pick<Device, "model_category_code" | "config">
		| null
		| undefined
): boolean => {
	if (!deviceOrConfig) return false
	if ("is_nvr" in deviceOrConfig && deviceOrConfig.is_nvr === true) return true
	const cfg = "config" in deviceOrConfig ? deviceOrConfig.config : null
	if (cfg && typeof cfg === "object" && (cfg as CameraDeviceConfig).is_nvr === true) {
		return true
	}
	if ("model_category_code" in deviceOrConfig) {
		return String(deviceOrConfig.model_category_code || "").trim().toLowerCase() === "nvr"
	}
	return false
}
