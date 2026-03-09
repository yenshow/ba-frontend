import type { Device, CameraDeviceConfig } from "./device";

/**
 * 攝影機設備資訊（擴展設備資訊）
 */
export interface SurveillanceCamera extends Device {
	config: CameraDeviceConfig;
}

/**
 * 監控畫面布局模式
 */
export type GridLayout = "1" | "4" | "9";

/**
 * 監控畫面配置（MJPEG 預覽：加入畫面時取得 previewUrl）
 */
export interface MonitorView {
	deviceId: number;
	position: number;
	/** MJPEG 預覽 URL（由 GET /api/devices/:id/preview-url 取得） */
	previewUrl?: string;
}
