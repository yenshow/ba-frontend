import type { CategoryModbusConfig } from "~/types/lighting"
import type { ModbusStatusPointDef } from "~/types/location"
import {
	isSnapshotAlarm,
	normalizeSystemUiStatus,
	type SystemUiStatus,
} from "~/utils/monitoringStatus"

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

/** 與後端對齊：`uiStatus` 已含連線／讀值語意；勿用 raw.running===false 推論為正常（離線時後端仍會正規化成 { running:false }）。 */
export const deriveSmokeAlarmUiStatus = (
	item: SmokeAlarmStatusItem | null | undefined
): SmokeAlarmStatusItem["uiStatus"] => {
	if (!item) return "warning"
	if (isSnapshotAlarm(item)) return "alarm"
	return normalizeSystemUiStatus(item.uiStatus)
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
	statusPoints?: Record<string, ModbusStatusPointDef>
}

export interface SmokeAlarmZone {
	id?: string
	name: string
	imageUrl?: string
	sortOrder?: number
	locations: SmokeAlarmLocation[]
	description?: string
}
