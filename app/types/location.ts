/**
 * 統一地點管理類型定義（多系統架構）
 */

/**
 * 系統類型
 */
export type SystemType = "environment" | "lighting" | "people_counting";

/**
 * 系統配置（根據系統類型不同）
 */
export type SystemConfig =
	| EnvironmentSystemConfig
	| LightingSystemConfig
	| PeopleCountingSystemConfig;

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
 */
export interface PeopleCountingSystemConfig {
	personGroupIds: number[];
	entryDoorId?: number;
	exitDoorId?: number;
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
 * 統一樓層
 */
export interface UnifiedFloor {
	id: string;
	name: string;
	buildingId?: number;
	floorNumber?: number;
	imageUrl?: string; // 照明系統專用
	description?: string;
	locations: UnifiedLocation[];
}

/**
 * 統一地點（支援多系統）
 */
export interface UnifiedLocation {
	id: string;
	floorId: string;
	name: string;
	description?: string;
	systems: LocationSystem[];
}

/**
 * 向後兼容：地點類型（已棄用，使用 systems 陣列）
 * @deprecated 使用 UnifiedLocation.systems 替代
 */
export type LocationType = SystemType;

