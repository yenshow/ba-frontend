/** 門禁人員群組（群組內成員限為入口與出口設備皆有之人員，以 employeeNo 識別） */
export interface AccessControlGroup {
	name: string;
	employeeNos: string[];
}

/**
 * 人流統計地點（工地位置）
 * 參考 EnvironmentLocation，用於地點管理系統
 * 
 * 包含配置信息和業務統計信息
 */
export interface PeopleCountingLocation {
	// 配置信息（來自地點管理系統）
	id?: string;
	/** 同區域內地點排序（小者在前） */
	sortOrder?: number;
	name: string; // 地點名稱（工地名稱）
	locationType?: "people_counting"; // 地點類型
	personGroupIds?: number[]; // 對應的 person_group.id 列表（YSCP）
	entryDoorIds?: number[]; // 入口設備 IDs（YSCP）
	exitDoorIds?: number[]; // 出口設備 IDs（YSCP）
	/** 資料來源：yscp（預設）/ access_control / isapi_camera */
	dataSource?: "yscp" | "access_control" | "isapi_camera";
	/** 本系統門禁設備 IDs（dataSource 為 access_control 時使用） */
	entryDeviceIds?: number[];
	exitDeviceIds?: number[];
	/** 攝影機設備 ID（dataSource 為 isapi_camera 時使用） */
	cameraDeviceId?: number;
	/** 攝影機設備 ID 列表（dataSource 為 isapi_camera 時使用；複選） */
	cameraDeviceIds?: number[];
	/** 優先使用 RegionList 當作進場單位（true=依區域/單位統計與顯示） */
	preferRegion?: boolean;
	/** 門禁人員群組（後端相容保留；門禁設備之人員與權限已改由「人員管理」處理，此地點表單不再編輯此欄） */
	accessControlGroups?: AccessControlGroup[];

	// 業務統計信息（來自業務 API）
	locationId?: number; // 業務層的地點 ID（數字格式，用於 API 調用）
	region?: string; // 區域（如：北部、中部、南部）
	status?: "active" | "equipment_anomaly" | "intrusion_detected"; // 狀態：正常、設備異常、非名單入侵
	entryCount?: number; // 今日進場人數
	exitCount?: number; // 今日出場人數
	units?: PeopleCountingUnit[]; // 關聯的單位
	// 注意：cameras 已移除（不會有攝影機串流功能）
}

/**
 * 人流統計樓層
 * 參考 EnvironmentZone，用於地點管理系統
 */
export interface PeopleCountingZone {
	id?: string;
	name: string; // 樓層名稱（如：1F、2F）
	/** 區域排序（小者在前） */
	sortOrder?: number;
	locations: PeopleCountingLocation[]; // 地點列表（工地列表）
}

/**
 * 進場單位
 */
export interface PeopleCountingUnit {
	id: number;
	locationId: number;
	name: string;
	capacity: number;
	currentCount?: number;
	/** 攝影機（isapi_camera）各 Region 累計進場人數 */
	entryCount?: number;
	/** 攝影機（isapi_camera）各 Region 累計出場人數 */
	exitCount?: number;
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
	// 計算欄位
	lastEntryTime?: string; // 最近進場時間（完整格式）
	lastExitTime?: string; // 最近出場時間（完整格式）
	lastEntryDate?: string; // 最近進場日期（不含時分秒，如：2026/01/19）
	entryTime?: string; // 進場時間（時分秒，如：09:30:00）
	exitTime?: string; // 離場時間（時分秒，如：17:30:00）
	isPresent?: boolean; // 在場狀態
	isTodayEntry?: boolean; // 是否為今日進場
}

/**
 * 進出場記錄
 */
export interface PeopleCountingLog {
	id: string | number; // 支援字串或數字（實際資料沒有 id，需要生成）
	locationId: number; // 改為 locationId（對應 PeopleCountingLocation）
	unitId: number;
	personnelId?: number; // 如果是名單內人員
	deviceId: number; // 攝影機設備 ID
	eventType: "entry" | "exit" | "failed"; // 進入 / 離開 / 失敗（未註冊或無法判定）
	employeeId?: string; // 工號（用於非名單人員）
	personName?: string; // 姓名
	deviceScreenshotUrl?: string; // 設備截圖
	deviceName?: string; // 出入口設備名稱（來自 deviceaccess.door dev_name）
	/** 後端可能仍帶此欄；畫面已不顯示「人次」，僅依事件類型判斷進／出 */
	count?: number;
	// 注意：不包含 modelingPhotoUrl（建模照片），根據規劃已移除此欄位
	timestamp: string;
	// 關聯資料
	unit?: PeopleCountingUnit;
	unitName?: string; // 進場單位名稱（支援直接提供，避免需要關聯查詢）
	personnel?: PeopleCountingPersonnel;
	// 注意：device 已移除（不會有攝影機串流功能）
}

