import type { Device, CameraDeviceConfig } from "./device";
import type { RTSPStreamInfo } from "./rtsp";

/**
 * 人流統計工地
 */
export interface PeopleCountingSite {
	id: number;
	name: string;
	region: string; // 區域（如：北部、中部、南部）
	status: "active" | "equipment_anomaly" | "intrusion_detected"; // 狀態：正常、設備異常、非名單入侵
	entryCount?: number; // 今日進場人數
	exitCount?: number; // 今日出場人數
	cameras?: SiteCamera[]; // 關聯的攝影機
	units?: PeopleCountingUnit[]; // 關聯的單位
}

/**
 * 工地攝影機（關聯設備）
 */
export interface SiteCamera {
	id: number;
	siteId: number;
	deviceId: number;
	cameraType: "entry" | "exit"; // 進場 / 出場
	position?: string; // 攝影機位置描述
	isActive: boolean;
	// 從 devices 表關聯的資訊
	device?: Device & { config: CameraDeviceConfig };
	streamInfo?: RTSPStreamInfo | null; // RTSP 串流資訊
	isStreaming?: boolean;
}

/**
 * 進場單位
 */
export interface PeopleCountingUnit {
	id: number;
	siteId: number;
	name: string;
	capacity: number; // 容量上限
	currentCount?: number; // 目前人數（計算：進入 - 離開）
}

/**
 * 人員資訊
 */
export interface PeopleCountingPersonnel {
	id: number;
	unitId: number;
	employeeId: string; // 工號
	name: string;
	title?: string; // 職稱
	photoUrl?: string; // 照片 URL
	// 計算欄位
	lastEntryTime?: string; // 最近進場時間
	lastExitTime?: string; // 最近出場時間
	isInside?: boolean; // 是否在場內
}

/**
 * 進出場記錄
 */
export interface PeopleCountingLog {
	id: number;
	siteId: number;
	unitId: number;
	personnelId?: number; // 如果是名單內人員
	deviceId: number; // 攝影機設備 ID
	eventType: "entry" | "exit"; // 進入 / 離開
	employeeId?: string; // 工號（用於非名單人員）
	name?: string; // 姓名（用於非名單人員）
	deviceScreenshotUrl?: string; // 設備截圖
	modelingPhotoUrl?: string; // 建模照片
	timestamp: string;
	// 關聯資料
	unit?: PeopleCountingUnit;
	personnel?: PeopleCountingPersonnel;
	device?: Device;
}

