import type { CategoryModbusConfig } from "~/types/lighting"
import type { DrainageStatusPointDef } from "~/types/location"

export interface EmergencyRescueStatusItem {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	equipmentKind: string
	viewCategory: string
	uiStatus: "normal" | "warning" | "alarm" | "offline" | "unknown"
	raw?: Record<string, boolean | undefined>
	error?: string
}

/** 與後端 emergencyRescueStatusService 語意對齊 */
export const deriveEmergencyRescueUiStatus = (
	item: EmergencyRescueStatusItem | null | undefined
): EmergencyRescueStatusItem["uiStatus"] => {
	if (!item) return "unknown"
	const raw = item.raw || {}
	const keys = Object.keys(raw)
	if (keys.length === 0) return item.uiStatus ?? "unknown"

	const anyRead = keys.some((k) => raw[k] !== undefined && raw[k] !== null)
	if (!anyRead) return "warning"

	if (raw.sos === true || raw.trigger === true || raw.running === true) return "alarm"
	if (raw.fault === true) return "warning"
	return "normal"
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
	statusPoints?: Record<string, DrainageStatusPointDef>
}

export interface EmergencyRescueZone {
	id?: string
	name: string
	imageUrl?: string
	sortOrder?: number
	locations: EmergencyRescueLocation[]
	description?: string
}
