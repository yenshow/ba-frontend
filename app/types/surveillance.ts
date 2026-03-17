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
export type GridLayout = "1" | "4" | "9" | "16";

/**
 * 監控畫面配置（WebRTC：加入畫面時呼叫 stream/start 取得 webrtcUrl）
 */
export interface MonitorView {
	deviceId: number;
	position: number;
	/** WebRTC WHEP URL（由 POST /api/devices/:id/stream/start 取得） */
	webrtcUrl?: string;
	/** 串流 path 名稱（與後端 MediaMTX path 對應） */
	streamId?: string;
	/** 串流狀態 */
	streamStatus?: "running" | "stopped" | "loading" | "error";
}

