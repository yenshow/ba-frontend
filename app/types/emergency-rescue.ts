import type { CategoryModbusConfig } from "~/types/lighting"
import type { ModbusStatusPointDef } from "~/types/location"
import {
	isSnapshotAlarm,
	normalizeSystemUiStatus,
	type SystemUiStatus,
} from "~/utils/monitoringStatus"

export interface EmergencyRescueStatusItem {
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

/** 與後端對齊：見 smoke-alarm `deriveSmokeAlarmUiStatus` 註解。 */
export const deriveEmergencyRescueUiStatus = (
	item: EmergencyRescueStatusItem | null | undefined
): EmergencyRescueStatusItem["uiStatus"] => {
	if (!item) return "warning"
	if (isSnapshotAlarm(item)) return "alarm"
	return normalizeSystemUiStatus(item.uiStatus)
}

export interface EmergencyRescueLocation {
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
	statusPoints?: Record<string, ModbusStatusPointDef>
}

export interface EmergencyRescueZone {
	id?: string
	name: string
	imageUrl?: string
	sortOrder?: number
	locations: EmergencyRescueLocation[]
	description?: string
}
