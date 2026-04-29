/**
 * 統一地點管理類型定義（多系統架構）
 */

/**
 * 系統類型
 */
export type SystemType = "environment" | "people_counting" | "vehicle_access";

export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
	environment: "環境監測",
	people_counting: "人流統計",
	vehicle_access: "車輛進出"
};

export const getSystemTypeLabel = (systemType: SystemType): string =>
	SYSTEM_TYPE_LABELS[systemType] || String(systemType);

/**
 * 系統配置（根據系統類型不同）
 */
export type SystemConfig =
	| EnvironmentSystemConfig
	| PeopleCountingSystemConfig
	| VehicleAccessSystemConfig;

/**
 * 環境監測系統配置
 */
export interface EnvironmentSystemConfig {
	deviceId?: number;
	/** 感測器設備 ID 列表（複選）；送出時以 deviceIds 為準 */
	deviceIds?: number[];
	parameters: Array<{
		type: string;
		enabled: boolean;
	}>;
}

/**
 * 人流統計系統配置
 * dataSource 為 access_control 時使用 entryDeviceId / exitDeviceId；yscp 時使用 entryDoorId / exitDoorId；isapi_camera 時使用 cameraDeviceId 等。
 */
export interface PeopleCountingSystemConfig {
	personGroupIds?: number[];
	entryDoorIds?: number[];
	exitDoorIds?: number[];
	/** 資料來源：yscp（預設）/ access_control / isapi_camera */
	dataSource?: "yscp" | "access_control" | "isapi_camera";
	/** 本系統門禁設備 ID（devices.id），dataSource 為 access_control 時使用 */
	entryDeviceIds?: number[];
	exitDeviceIds?: number[];
	/**
	 * ISAPI PeopleCounting 攝影機（devices.id）單值（相容欄位）
	 * - **僅作 fallback**：舊資料/舊前端可能只存此欄位
	 * - 新版請以 cameraDeviceIds 為準
	 */
	cameraDeviceId?: number;
	/** ISAPI PeopleCounting 攝影機（devices.id）列表（複選）；**主要欄位** */
	cameraDeviceIds?: number[];
	preferRegion?: boolean;
	/** 門禁人員群組（name + employeeNos），成員限為出入口皆有之人員 */
	accessControlGroups?: Array<{ name: string; employeeNos: string[] }>;
}

/**
 * 車輛進出系統配置（車道來自 vehiclebiz.lane_info；entry_lane_id／exit_lane_id 對應入口／出口車道）
 */
export interface VehicleAccessSystemConfig {
	entryLaneId?: number | null;
	exitLaneId?: number | null;
}

/**
 * 地點系統
 */
export interface LocationSystem {
	id: string;
	systemType: SystemType;
	config: SystemConfig;
}

/**
 * 統一區域
 */
export interface UnifiedZone {
	id: string;
	name: string;
	buildingId?: number;
	imageUrl?: string; // 照明系統專用
	description?: string;
	/** 區域排序（小者在前），由後端與區域表單維護 */
	sortOrder?: number;
	locations: UnifiedLocation[];
}

/**
 * 統一地點（支援多系統）
 */
export interface UnifiedLocation {
	id: string;
	zoneId: string;
	name: string;
	description?: string;
	/** 地點列建立時間（ISO 8601），供前端排序；未持久化前可由前端填入 */
	createdAt?: string;
	/** 同區域內地點排序（小者在前） */
	sortOrder?: number;
	systems: LocationSystem[];
}

/**
 * 地點系統輸入類型（用於創建和更新，系統可能沒有 id）
 */
export type LocationSystemInput = LocationSystem | Omit<LocationSystem, "id">;

/**
 * 統一地點輸入類型（用於創建和更新，地點和系統可能沒有 id）
 */
export type UnifiedLocationInput = Omit<UnifiedLocation, "zoneId" | "systems"> & {
	systems: LocationSystemInput[];
};
