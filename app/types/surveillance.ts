import type { Device, CameraDeviceConfig } from "./device";
import type { RTSPStreamInfo } from "./rtsp";

/**
 * 攝影機設備資訊（擴展設備資訊）
 */
export interface SurveillanceCamera extends Device {
	config: CameraDeviceConfig;
	streamInfo?: RTSPStreamInfo | null; // 當前串流資訊
	isStreaming?: boolean; // 是否正在串流
}

/**
 * 攝影機串流狀態
 */
export interface CameraStreamStatus {
	deviceId: number;
	streamId?: string;
	status: "running" | "stopped" | "error" | "loading";
	hlsUrl?: string;
	webrtcUrl?: string;
	error?: string;
}

/**
 * 監控畫面布局模式
 */
export type GridLayout = "1" | "4" | "9";

/**
 * 監控畫面配置
 */
export interface MonitorView {
	deviceId: number; // 設備 ID，如果是測試串流則為 0 或負數
	position: number; // 在網格中的位置（0-based）
	hlsUrl?: string; // 可選：直接用於測試串流的 HLS URL
	streamId?: string; // 可選：串流 ID（用於測試串流）
	isTestStream?: boolean; // 是否為測試串流
}

