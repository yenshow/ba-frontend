/**
 * 統一地點管理類型定義（多系統架構）
 */

/**
 * 系統類型
 */
export type SystemType = "environment" | "lighting" | "people_counting" | "vehicle_access";

/**
 * 系統配置（根據系統類型不同）
 */
export type SystemConfig =
	| EnvironmentSystemConfig
	| LightingSystemConfig
	| PeopleCountingSystemConfig
	| VehicleAccessSystemConfig;

/**
 * 環境監測系統配置
 */
export interface EnvironmentSystemConfig {
	deviceId?: number;
	parameters: Array<{
		type: string;
		enabled: boolean;
	}>;
}

/**
 * 照明系統配置
 */
export interface LightingSystemConfig {
	deviceId?: number;
	location?: {
		x: number;
		y: number;
	};
	modbus?: {
		deviceId?: number;
		points?: Array<{
			address: number;
			type: "DI" | "DO";
			note?: string;
		}>;
	};
}

/**
 * 人流統計系統配置
 * dataSource 為 access_control 時使用 entryDeviceId / exitDeviceId（本系統門禁設備）；為 yscp 時使用 entryDoorId / exitDoorId（YSCP）。
 */
export interface PeopleCountingSystemConfig {
	personGroupIds?: number[];
	entryDoorId?: number;
	exitDoorId?: number;
	/** 資料來源：yscp（預設）或 access_control */
	dataSource?: "yscp" | "access_control";
	/** 本系統門禁設備 ID（devices.id），dataSource 為 access_control 時使用 */
	entryDeviceId?: number;
	exitDeviceId?: number;
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
