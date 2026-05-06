/**
 * 統一地點管理類型定義（多系統架構）
 */

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

export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
	environment: "環境監測",
	lighting: "照明系統",
	drainage: "衛生排水",
	hvac: "空調系統",
	air_circulation: "空氣循環系統",
	power: "電力系統",
	fire: "消防系統",
	emergency_rescue: "緊急求救",
	smoke_alarm: "煙霧警報",
	people_counting: "人流統計",
	vehicle_access: "車輛進出",
}

export const getSystemTypeLabel = (systemType: SystemType): string =>
	SYSTEM_TYPE_LABELS[systemType] || String(systemType)

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

/**
 * 環境監測系統配置
 */
export interface EnvironmentSystemConfig {
	deviceId?: number
	/** 感測器設備 ID 列表（複選）；送出時以 deviceIds 為準 */
	deviceIds?: number[]
	parameters: Array<{
		type: string
		enabled: boolean
	}>
}

/**
 * 照明系統配置
 */
export interface LightingSystemConfig {
	deviceId?: number
	location?: {
		x: number
		y: number
	}
	modbus?: {
		deviceId?: number
		points?: Array<{
			address: number
			type: "DI" | "DO"
			note?: string
		}>
	}
}

/**
 * 空調（HVAC）系統配置
 *
 * - `modbus`：沿用 lighting 的 DI/DO 點位（可用於 ON/OFF 回授與控制）
 * - `statusPoints`：沿用 drainage/fire 的彈性點位定義（可用於溫度等 holding/input）
 */
export interface HvacSystemConfig {
	deviceId?: number
	location?: { x: number; y: number }
	modbus?: LightingSystemConfig["modbus"]
	statusPoints?: Record<string, ModbusStatusPointDef>
}

/**
 * 空氣循環系統配置（獨立於 HVAC）
 *
 * - `statusPoints`：監控主讀點（通常 `running`，discrete／coil），對齊緊急求救／煙霧警報
 * - `modbus`：僅相容舊版照明式 `points[]`；新資料請以 `status_points` 為準
 */
export interface AirCirculationSystemConfig {
	deviceId?: number
	location?: { x: number; y: number }
	modbus?: {
		deviceId?: number
		points?: Array<{ address: number; type: "DI" | "DO" }>
	}
	statusPoints?: Record<string, ModbusStatusPointDef>
	/** 與排水/消防對齊的設備語意（目前後端已支援） */
	equipmentKind?: "pump" | "tank"
	/** 檢視分類（使用者自訂字串；後端預設為 air_circulation） */
	viewCategory?: string
}

/** 排水狀態點位（對應後端 status_points）；可每點獨立指定控制器 */
export interface ModbusStatusPointDef {
	registerType: "coil" | "discrete" | "holding" | "input"
	address: number
	length?: number
	/** 若省略則使用地點層級的 deviceId */
	deviceId?: number
}

/**
 * 衛生排水系統配置
 */
export interface DrainageSystemConfig {
	deviceId?: number
	location?: { x: number; y: number }
	modbus?: LightingSystemConfig["modbus"]
	equipmentKind?: "pump" | "tank"
	/** 檢視分類（使用者自訂字串；舊資料可能為 pumping／sewage／drainage） */
	viewCategory?: string
	statusPoints?: Record<string, ModbusStatusPointDef>
}

/** 電力系統配置（欄位與排水類似；equipmentKind 為發電機／油位） */
export interface PowerSystemConfig {
	deviceId?: number
	location?: { x: number; y: number }
	modbus?: LightingSystemConfig["modbus"]
	equipmentKind?: "generator" | "oil_level"
	/** 檢視分類（使用者自訂字串） */
	viewCategory?: string
	statusPoints?: Record<string, ModbusStatusPointDef>
}

/** 消防系統配置（欄位與排水相同；以 systemType 區分） */
export type FireSystemConfig = DrainageSystemConfig

/** 緊急求救（與消防／排水相同點位結構；預設檢視分類 sos） */
export type EmergencyRescueSystemConfig = DrainageSystemConfig

/** 煙霧警報（與消防／排水相同點位結構；預設檢視分類 smoke） */
export type SmokeAlarmSystemConfig = DrainageSystemConfig

/**
 * 人流統計系統配置
 * dataSource 為 access_control 時使用 entryDeviceId / exitDeviceId；yscp 時使用 entryDoorId / exitDoorId；isapi_camera 時使用 cameraDeviceId 等。
 */
export interface PeopleCountingSystemConfig {
	personGroupIds?: number[]
	entryDoorIds?: number[]
	exitDoorIds?: number[]
	/** 資料來源：yscp（預設）/ access_control / isapi_camera */
	dataSource?: "yscp" | "access_control" | "isapi_camera"
	/** 本系統門禁設備 ID（devices.id），dataSource 為 access_control 時使用 */
	entryDeviceIds?: number[]
	exitDeviceIds?: number[]
	/**
	 * ISAPI PeopleCounting 攝影機（devices.id）單值（相容欄位）
	 * - **僅作 fallback**：舊資料/舊前端可能只存此欄位
	 * - 新版請以 cameraDeviceIds 為準
	 */
	cameraDeviceId?: number
	/** ISAPI PeopleCounting 攝影機（devices.id）列表（複選）；**主要欄位** */
	cameraDeviceIds?: number[]
	preferRegion?: boolean
	/** 門禁人員群組（name + employeeNos），成員限為出入口皆有之人員 */
	accessControlGroups?: Array<{ name: string; employeeNos: string[] }>
}

/**
 * 車輛進出系統配置（車道來自 vehiclebiz.lane_info；entry_lane_id／exit_lane_id 對應入口／出口車道）
 */
export interface VehicleAccessSystemConfig {
	entryLaneId?: number | null
	exitLaneId?: number | null
}

/**
 * 地點系統
 */
export interface LocationSystem {
	id: string
	systemType: SystemType
	config: SystemConfig
}

/**
 * 統一區域
 */
export interface UnifiedZone {
	id: string
	name: string
	buildingId?: number
	imageUrl?: string // 照明系統專用
	description?: string
	/** 區域排序（小者在前），由後端與區域表單維護 */
	sortOrder?: number
	locations: UnifiedLocation[]
}

/**
 * 統一地點（支援多系統）
 */
export interface UnifiedLocation {
	id: string
	zoneId: string
	name: string
	description?: string
	/** 地點列建立時間（ISO 8601），供前端排序；未持久化前可由前端填入 */
	createdAt?: string
	/** 同區域內地點排序（小者在前） */
	sortOrder?: number
	systems: LocationSystem[]
}

/**
 * 地點系統輸入類型（用於創建和更新，系統可能沒有 id）
 */
export type LocationSystemInput = LocationSystem | Omit<LocationSystem, "id">

/**
 * 統一地點輸入類型（用於創建和更新，地點和系統可能沒有 id）
 */
export type UnifiedLocationInput = Omit<UnifiedLocation, "zoneId" | "systems"> & {
	systems: LocationSystemInput[]
}
