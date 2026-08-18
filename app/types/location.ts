/**
 * 統一地點管理類型定義（多系統架構）
 */

import type {
	ElevatorDeviceRole,
	ElevatorLogicalFloor,
	ElevatorPanelConfig,
} from "~/utils/elevatorFloorModel"

/**
 * 系統類型
 */
export type SystemType =
	| "environment"
	| "lighting"
	| "hvac"
	| "air_circulation"
	| "drainage"
	| "power"
	| "fire"
	| "emergency_rescue"
	| "smoke_alarm"
	| "people_counting"
	| "vehicle_access"
	| "elevator"
	| "access_security";

export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
	environment: "環境監測",
	lighting: "照明系統",
	drainage: "排水系統",
	hvac: "空調系統",
	air_circulation: "空氣循環",
	power: "電力系統",
	fire: "消防系統",
	emergency_rescue: "緊急求救",
	smoke_alarm: "煙霧警報",
	people_counting: "門禁管理",
	vehicle_access: "車輛進出",
	elevator: "電梯管理",
	access_security: "門禁保全",
};

export const getSystemTypeLabel = (systemType: SystemType): string =>
	SYSTEM_TYPE_LABELS[systemType] || String(systemType);

/**
 * 系統配置（根據系統類型不同）
 */
export type SystemConfig =
	| EnvironmentSystemConfig
	| LightingSystemConfig
	| HvacSystemConfig
	| AirCirculationSystemConfig
	| DrainageSystemConfig
	| PowerSystemConfig
	| FireSystemConfig
	| EmergencyRescueSystemConfig
	| SmokeAlarmSystemConfig
	| PeopleCountingSystemConfig
	| VehicleAccessSystemConfig
	| ElevatorSystemConfig
	| AccessSecuritySystemConfig;

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
 * 空調（HVAC）系統配置
 *
 * - `modbus`：沿用 lighting 的 DI/DO 點位（可用於 ON/OFF 回授與控制）
 * - `statusPoints`：沿用 drainage/fire 的彈性點位定義（可用於溫度等 holding/input）
 * - 偵測溫度／設定溫度／風速為同一組 `deviceId`（可與主控制器分離）
 */
export interface HvacSystemConfig {
	deviceId?: number;
	location?: { x: number; y: number };
	modbus?: LightingSystemConfig["modbus"];
	statusPoints?: Record<string, ModbusStatusPointDef>;
}

/**
 * 空氣循環系統配置（獨立於 HVAC）
 *
 * - `statusPoints`：監控主讀點（通常 `running`，discrete／coil），對齊緊急求救／煙霧警報
 * - `modbus`：僅相容舊版照明式 `points[]`；新資料請以 `status_points` 為準
 */
export interface AirCirculationSystemConfig {
	deviceId?: number;
	location?: { x: number; y: number };
	modbus?: {
		deviceId?: number;
		points?: Array<{ address: number; type: "DI" | "DO" }>;
	};
	statusPoints?: Record<string, ModbusStatusPointDef>;
	/** 與排水/消防對齊的設備語意（目前後端已支援） */
	equipmentKind?: "pump" | "tank";
	/** 檢視分類（使用者自訂字串；後端預設為 air_circulation） */
	viewCategory?: string;
}

/** 排水狀態點位（對應後端 status_points）；可每點獨立指定控制器 */
export interface ModbusStatusPointDef {
	registerType: "coil" | "discrete" | "holding" | "input";
	address: number;
	length?: number;
	/** 若省略則使用地點層級的 deviceId */
	deviceId?: number;
	/**
	 * 風速等離散 AO：寫入／顯示用的列舉值（例 `[1,2,3,4]` 或 `[0,33,66,100]`）。
	 * 省略時 UI 預設 `[1,2,3,4]`。
	 */
	levels?: number[];
	/**
	 * 顯示倍率：display = raw * scale（預設 1；例 0.1 表示 raw 260 → 26.0°C）。
	 * 寫入時 raw = round(display / scale)。
	 */
	scale?: number;
}

/**
 * 衛生排水系統配置
 */
export interface DrainageSystemConfig {
	deviceId?: number;
	location?: { x: number; y: number };
	modbus?: LightingSystemConfig["modbus"];
	equipmentKind?: "pump" | "tank";
	/** 檢視分類（使用者自訂字串；舊資料可能為 pumping／sewage／drainage） */
	viewCategory?: string;
	statusPoints?: Record<string, ModbusStatusPointDef>;
}

/** 電力系統配置（欄位與排水類似；equipmentKind 為發電機／油位） */
export interface PowerSystemConfig {
	deviceId?: number;
	location?: { x: number; y: number };
	modbus?: LightingSystemConfig["modbus"];
	equipmentKind?: "generator" | "oil_level";
	/** 檢視分類（使用者自訂字串） */
	viewCategory?: string;
	statusPoints?: Record<string, ModbusStatusPointDef>;
}

/** 消防系統配置（欄位與排水相同；以 systemType 區分） */
export type FireSystemConfig = DrainageSystemConfig;

/** 緊急求救（與消防／排水相同點位結構；預設檢視分類 sos） */
export type EmergencyRescueSystemConfig = DrainageSystemConfig;

/** 煙霧警報（與消防／排水相同點位結構；預設檢視分類 smoke） */
export type SmokeAlarmSystemConfig = DrainageSystemConfig;

/**
 * 人流統計系統配置
 * dataSource 為 access_control 時使用 entryDeviceIds / exitDeviceIds；yscp 時使用 entryDoorIds / exitDoorIds；
 * isapi_camera：people_counting 用 cameraDeviceIds；face_recognition 用 entryCameraDeviceIds / exitCameraDeviceIds。
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
	/** ISAPI 人流統計模式攝影機（devices.id）列表 */
	cameraDeviceIds?: number[];
	/** 人臉辨識：進場攝影機 */
	entryCameraDeviceIds?: number[];
	/** 人臉辨識：出場攝影機 */
	exitCameraDeviceIds?: number[];
	/**
	 * isapi_camera：people_counting（分區）｜ face_recognition（人員群組＋進／出攝影機）
	 */
	cameraMode?: "people_counting" | "face_recognition";
	preferRegion?: boolean;
	/** 門禁人員群組（name + employeeNos），成員限為出入口皆有之人員 */
	accessControlGroups?: Array<{ name: string; employeeNos: string[] }>;
	/** 進出紀錄表格顯示欄位 keys */
	logDisplayColumns?: string[];
}

/**
 * 車輛進出系統配置（車道來自 vehiclebiz.lane_info；entry_lane_id／exit_lane_id 對應入口／出口車道）
 */
export type VehicleAccessOperationMode = "construction_flow" | "parking";

export interface VehicleAccessSystemConfig {
	dataSource?: "yscp" | "isapi_camera";
	/** 營運模式：車流統計（營運日）| 停車場（session + 持續在場） */
	operationMode?: VehicleAccessOperationMode;
	statsEpochStartedAt?: string;
	statsResetAt?: string;
	/** 停車場：在場車輛上限 */
	parkingCapacity?: number;
	entryLaneId?: number | null;
	exitLaneId?: number | null;
	entryCameraDeviceIds?: number[];
	exitCameraDeviceIds?: number[];
	cameraChannelId?: number;
	vehicleGroupIds?: number[];
	logDisplayColumns?: string[];
}

/**
 * 電梯系統配置（邏輯樓層 SSOT；對齊 location_systems.system_config）
 */
export interface ElevatorSystemConfig {
	panel?: ElevatorPanelConfig;
	floors?: ElevatorLogicalFloor[];
	ladderDevice?: ElevatorDeviceRole | null;
	callDevice?: ElevatorDeviceRole | null;
	floorDetection?: ElevatorDeviceRole | null;
	accessDeviceIds?: number[];
	/** 固定 visitor（SDK command 5） */
	callCommandType?: "visitor";
}

/**
 * 門禁保全（視訊對講）地點配置
 * 後端持久化為 system_config.indoor_device_id
 */
export interface AccessSecuritySystemConfig {
	indoorDeviceId?: number;
	/** 與 indoorDeviceId 同義（表單／adapter 相容） */
	deviceId?: number;
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
