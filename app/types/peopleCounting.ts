/**
 * 人流統計地點（工地位置）
 * 參考 EnvironmentLocation，用於地點管理系統
 */
export interface PeopleCountingLocation {
	id?: string;
	name: string; // 地點名稱（工地名稱）
	locationType?: "people_counting"; // 地點類型
	personGroupIds?: number[]; // 對應的 person_group.id 列表
	entryDoorId?: number; // 入口設備 ID
	exitDoorId?: number; // 出口設備 ID
}

/**
 * 人流統計樓層
 * 參考 EnvironmentZone，用於地點管理系統
 */
export interface PeopleCountingZone {
	id?: string;
	name: string; // 樓層名稱（如：1F、2F）
	locations: PeopleCountingLocation[]; // 地點列表（工地列表）
}

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
	units?: PeopleCountingUnit[]; // 關聯的單位
	// 注意：cameras 已移除（不會有攝影機串流功能）
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
	// 注意：不包含 title（職稱），根據規劃不需要顯示職稱
	photoUrl?: string; // 照片 URL（Base64 解碼後）
	photo?: string; // 照片（支援兩種命名方式）
	// 計算欄位
	lastEntryTime?: string; // 最近進場時間
	lastExitTime?: string; // 最近出場時間
	lastEntryDate?: string; // 最近進場日期
	entryTime?: string; // 進場時間
	exitTime?: string; // 離場時間
	isInside?: boolean; // 是否在場內
	isPresent?: boolean; // 在場狀態（支援兩種命名方式）
}

/**
 * 進出場記錄
 */
export interface PeopleCountingLog {
	id: string | number; // 支援字串或數字（實際資料沒有 id，需要生成）
	siteId: number;
	unitId: number;
	personnelId?: number; // 如果是名單內人員
	deviceId: number; // 攝影機設備 ID
	eventType: "entry" | "exit"; // 進入 / 離開
	employeeId?: string; // 工號（用於非名單人員）
	personId?: number; // 人員 ID（支援兩種命名方式）
	name?: string; // 姓名（用於非名單人員）
	personName?: string; // 姓名（支援兩種命名方式）
	deviceScreenshotUrl?: string; // 設備截圖
	// 注意：不包含 modelingPhotoUrl（建模照片），根據規劃已移除此欄位
	timestamp: string;
	// 關聯資料
	unit?: PeopleCountingUnit;
	unitName?: string; // 進場單位名稱（支援直接提供，避免需要關聯查詢）
	personnel?: PeopleCountingPersonnel;
	// 注意：device 已移除（不會有攝影機串流功能）
}

