import type { CategoryModbusConfig } from "~/types/lighting"
import type { DrainageStatusPointDef } from "~/types/location"
import { normalizeSystemUiStatus, type SystemUiStatus } from "~/types/monitoring"

export interface SmokeAlarmStatusItem {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	equipmentKind: string
	viewCategory: string
	uiStatus: SystemUiStatus
	raw?: Record<string, boolean | undefined>
	error?: string
}

/** 與後端 smokeAlarmStatusService 語意對齊 */
export const deriveSmokeAlarmUiStatus = (
	item: SmokeAlarmStatusItem | null | undefined
): SmokeAlarmStatusItem["uiStatus"] => {
	if (!item) return "warning"
	if (item.uiStatus === "alarm") return "alarm"
	const raw = item.raw || {}
	const keys = Object.keys(raw)
	if (keys.length === 0) return normalizeSystemUiStatus(item.uiStatus)

	const anyRead = keys.some((k) => raw[k] !== undefined && raw[k] !== null)
	if (!anyRead) return "warning"

	if (raw.smoke === true || raw.alarm === true || raw.trigger === true || raw.runningAlarm === true) return "alarm"
	if (raw.fault === true) return "warning"
	return "normal"
}

export interface SmokeAlarmLocation {
	id?: string
	systemId?: string
	name: string
	sortOrder?: number
	createdAt?: string
	location?: { x: number; y: number }
	description?: string
	deviceId?: number
	modbus?: CategoryModbusConfig
	equipmentKind?: string
	viewCategory?: string
	statusPoints?: Record<string, DrainageStatusPointDef>
}

export interface SmokeAlarmZone {
	id?: string
	name: string
	imageUrl?: string
	sortOrder?: number
	locations: SmokeAlarmLocation[]
	description?: string
}

