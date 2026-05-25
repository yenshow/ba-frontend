// 空調（HVAC）— 前端型別 SSOT

import type { LightingSystemConfig, ModbusStatusPointDef } from "~/types/location"
import type { SystemUiStatus } from "~/utils/monitoringStatus"

export interface HvacLocation {
	id?: string
	systemId?: string
	/** 同區域內地點排序（小者在前） */
	sortOrder?: number
	/** 地點列建立時間（ISO 8601） */
	createdAt?: string

	name: string
	location?: { x: number; y: number }
	description?: string

	deviceId?: number
	/** DI/DO 點位（沿用照明的 modbus 結構） */
	modbus?: LightingSystemConfig["modbus"]
	/** 可選：溫度等 holding/input 點位（沿用 drainage 的 statusPoints 形狀） */
	statusPoints?: Record<string, ModbusStatusPointDef>
}

export interface HvacZone {
	id?: string
	name: string
	sortOrder?: number
	imageUrl?: string
	description?: string
	locations: HvacLocation[]
}

export type HvacUiStatus = SystemUiStatus
