/**
 * 統一地點管理類型定義（工地：environment、people_counting、vehicle_access）
 *
 * `SystemType` 仍含 Central 專用鍵，供共用後端 `/api/locations` payload 與 merge 保留其他系統；
 * 工地前端僅實作 `ConstructionLocationSystemType` 的轉換與 UI。
 */

/** 工地前端實作的地點系統 */
export type ConstructionLocationSystemType =
	| "environment"
	| "people_counting"
	| "vehicle_access"

/** 後端 location_systems.system_type（共用 DB 可能含 Central 系統） */
export type SystemType =
	| ConstructionLocationSystemType
	| "lighting"
	| "hvac"
	| "air_circulation"
	| "drainage"
	| "power"
	| "fire"
	| "emergency_rescue"
	| "smoke_alarm"
	| "elevator"
	| "access_security"

const CONSTRUCTION_SYSTEM_TYPE_LABELS: Record<ConstructionLocationSystemType, string> = {
	environment: "環境監測",
	people_counting: "人流統計",
	vehicle_access: "車輛進出",
}

export const getSystemTypeLabel = (systemType: SystemType): string =>
	CONSTRUCTION_SYSTEM_TYPE_LABELS[systemType as ConstructionLocationSystemType] ||
	String(systemType)

export interface EnvironmentSystemConfig {
	deviceId?: number
	deviceIds?: number[]
	parameters: Array<{
		type: string
		enabled: boolean
	}>
}

export interface PeopleCountingSystemConfig {
	personGroupIds?: number[]
	entryDoorIds?: number[]
	exitDoorIds?: number[]
	dataSource?: "yscp" | "access_control" | "isapi_camera"
	entryDeviceIds?: number[]
	exitDeviceIds?: number[]
	entryEventCameraDeviceId?: number | null
	exitEventCameraDeviceId?: number | null
	cameraDeviceIds?: number[]
	entryCameraDeviceIds?: number[]
	exitCameraDeviceIds?: number[]
	cameraMode?: "people_counting" | "face_recognition"
	preferRegion?: boolean
	accessControlGroups?: Array<{ name: string; employeeNos: string[] }>
	logDisplayColumns?: string[]
	faceSimilarityThreshold?: number
}

export type VehicleAccessOperationMode = "construction_flow" | "parking"

export interface VehicleAccessSystemConfig {
	dataSource?: "yscp" | "isapi_camera"
	operationMode?: VehicleAccessOperationMode
	statsEpochStartedAt?: string
	statsResetAt?: string
	parkingCapacity?: number
	entryLaneId?: number | null
	exitLaneId?: number | null
	entryCameraDeviceIds?: number[]
	exitCameraDeviceIds?: number[]
	cameraChannelId?: number
	vehicleGroupIds?: number[]
	logDisplayColumns?: string[]
}

/** 工地實作系統的配置；其餘 systemType 由後端原樣保留 */
export type ConstructionSystemConfig =
	| EnvironmentSystemConfig
	| PeopleCountingSystemConfig
	| VehicleAccessSystemConfig

export type SystemConfig = ConstructionSystemConfig | Record<string, unknown>

export interface LocationSystem {
	id: string
	systemType: SystemType
	config: SystemConfig
}

export interface UnifiedZone {
	id: string
	name: string
	buildingId?: number
	imageUrl?: string
	description?: string
	sortOrder?: number
	locations: UnifiedLocation[]
}

export interface UnifiedLocation {
	id: string
	zoneId: string
	name: string
	description?: string
	createdAt?: string
	sortOrder?: number
	systems: LocationSystem[]
}

export type LocationSystemInput = LocationSystem | Omit<LocationSystem, "id">

export type UnifiedLocationInput = Omit<UnifiedLocation, "zoneId" | "systems"> & {
	systems: LocationSystemInput[]
}
