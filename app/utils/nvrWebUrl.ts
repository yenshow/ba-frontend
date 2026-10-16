import type { CameraDeviceConfig, Device } from "~/types/device"

/** 是否為 NVR 分類攝影機（建檔用；無 RTSP 串流） */
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

/** 由 NVR 攝影機 config 解析瀏覽器回放入口（優先 web_url） */
export const resolveNvrWebUrl = (
	config: Pick<CameraDeviceConfig, "host" | "port" | "web_url" | "use_https"> | null | undefined
): string => {
	if (!config) return ""
	const explicit = String(config.web_url || "").trim()
	if (explicit) return explicit

	const host = String(config.host || "").trim()
	if (!host) return ""

	const useHttps = config.use_https === true
	const port = Number(config.port ?? (useHttps ? 443 : 80))
	const scheme = useHttps ? "https" : "http"
	if (!Number.isFinite(port) || port < 1 || port > 65535) return ""

	const omitDefaultPort = (useHttps && port === 443) || (!useHttps && port === 80)
	return omitDefaultPort ? `${scheme}://${host}/` : `${scheme}://${host}:${port}/`
}

/** 外開 NVR 廠商網頁（回放在該頁操作） */
export const openNvrPlaybackPage = (webUrl: string): void => {
	const url = String(webUrl || "").trim()
	if (!url) return
	window.open(url, "_blank", "noopener,noreferrer")
}
