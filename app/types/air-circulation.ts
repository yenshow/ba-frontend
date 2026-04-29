// 空氣循環系統（Air Circulation）— 前端型別 SSOT（獨立於 HVAC）

import type { LightingSystemConfig, DrainageStatusPointDef } from "~/types/location"
import type { SystemUiStatus } from "~/types/monitoring"

export type AirCirculationEquipmentKind = "pump" | "tank"

export interface AirCirculationLocation {
	id?: string
	systemId?: string
	/** 同區域內地點排序（小者在前） */
	sortOrder?: number
	/** 地點列建立時間（ISO 8601） */
	createdAt?: string

	name: string
	location?: { x: number; y: number }
	description?: string

	/** 控制器設備 ID（建議與 modbus.deviceId 一致） */
	deviceId?: number
	/** DI/DO 點位（沿用照明的 modbus 結構） */
	modbus?: LightingSystemConfig["modbus"]
	/** 可選：溫度/風量/壓差等 holding/input 點位 */
	statusPoints?: Record<string, DrainageStatusPointDef>
	/** 與 fire/drainage 對齊的設備語意 */
	equipmentKind?: AirCirculationEquipmentKind
	/** 監控中心分組語意（可選） */
	viewCategory?: string
}

export interface AirCirculationZone {
	id?: string
	name: string
	sortOrder?: number
	imageUrl?: string
	description?: string
	locations: AirCirculationLocation[]
}

export type AirCirculationUiStatus = SystemUiStatus

