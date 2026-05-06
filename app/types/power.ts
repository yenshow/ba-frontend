import type { CategoryModbusConfig } from "~/types/lighting"
import type { ModbusStatusPointDef } from "~/types/location"
import {
	isSnapshotAlarm,
	normalizeSystemUiStatus,
	type SystemUiStatus,
} from "~/utils/monitoringStatus"

export const trimPowerViewCategory = (raw: string | undefined | null): string =>
	String(raw ?? "").trim()

/** 監控中心檢視分類預設（發電機） */
export const DEFAULT_POWER_MONITOR_VIEW_CATEGORY = "generator"

export const LEGACY_POWER_VIEW_CATEGORY_LABELS: Record<string, string> = {
	generator: "發電機",
	oil_level: "油位",
}

export const getPowerViewCategoryDisplayLabel = (raw: string): string => {
	const t = trimPowerViewCategory(raw)
	if (t === "") return "（未分類）"
	return LEGACY_POWER_VIEW_CATEGORY_LABELS[t] ?? t
}

export type PowerEquipmentKind = "generator" | "oil_level"

export interface PowerStatusItem {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	equipmentKind: PowerEquipmentKind | string
	viewCategory: string
	uiStatus: SystemUiStatus
	raw?: Record<string, boolean | undefined>
	error?: string
}

/** 發電機運轉／故障欄（對應 raw.fault）；後端 `uiStatus===warning` 時勿被 raw.fault===false 誤判為正常。 */
export const derivePowerGeneratorRunStatus = (
	item: PowerStatusItem | null | undefined
): PowerStatusItem["uiStatus"] => {
	if (!item) return "warning"
	const top = normalizeSystemUiStatus(item.uiStatus)
	if (top === "warning") return "warning"
	const raw = item.raw || {}
	if (raw.fault === true) return "alarm"
	return "normal"
}

/** 發電機油位欄（高／低油位 DI）；同上依後端連線狀態為準。 */
export const derivePowerGeneratorOilStatus = (
	item: PowerStatusItem | null | undefined
): PowerStatusItem["uiStatus"] => {
	if (!item) return "warning"
	const top = normalizeSystemUiStatus(item.uiStatus)
	if (top === "warning") return "warning"
	const raw = item.raw || {}
	if (raw.highOil === true || raw.lowOil === true) return "alarm"
	return "normal"
}

/** 發電機／獨立油位：與排水幫浦一致，以快照頂層 `uiStatus` 為準。 */
export const derivePowerOverallUiStatus = (
	item: PowerStatusItem | null | undefined
): PowerStatusItem["uiStatus"] => {
	if (!item) return "warning"
	if (isSnapshotAlarm(item)) return "alarm"
	return normalizeSystemUiStatus(item.uiStatus)
}

export interface PowerLocation {
	id?: string
	systemId?: string
	name: string
	sortOrder?: number
	createdAt?: string
	location?: { x: number; y: number }
	description?: string
	deviceId?: number
	modbus?: CategoryModbusConfig
	equipmentKind?: PowerEquipmentKind | string
	viewCategory?: string
	statusPoints?: Record<string, ModbusStatusPointDef>
}

export interface PowerZone {
	id?: string
	name: string
	imageUrl?: string
	sortOrder?: number
	locations: PowerLocation[]
	description?: string
}

export const powerLocationInViewCategory = (loc: PowerLocation, categoryId: string): boolean => {
	const t = trimPowerViewCategory(loc.viewCategory)
	return t !== "" && t === categoryId
}

export type PowerViewFilterOption = { value: string; label: string }

export const buildPowerMonitorViewFilterOptions = (zones: PowerZone[]): PowerViewFilterOption[] => {
	const minMsByCategory = new Map<string, number | null>()
	for (const z of zones) {
		for (const loc of z.locations || []) {
			const id = trimPowerViewCategory(loc.viewCategory)
			if (!id) continue
			const created = loc.createdAt ? Date.parse(loc.createdAt) : NaN
			const ms = Number.isNaN(created) ? null : created
			const prev = minMsByCategory.get(id)
			if (ms != null) {
				if (prev == null || ms < prev) minMsByCategory.set(id, ms)
			} else if (!minMsByCategory.has(id)) {
				minMsByCategory.set(id, null)
			}
		}
	}
	const rows = [...minMsByCategory.entries()].map(([value, minMs]) => ({
		value,
		label: LEGACY_POWER_VIEW_CATEGORY_LABELS[value] || value,
		minMs,
	}))
	rows.sort((a, b) => {
		if (a.minMs != null && b.minMs != null && a.minMs !== b.minMs) return a.minMs - b.minMs
		if (a.minMs != null && b.minMs == null) return -1
		if (a.minMs == null && b.minMs != null) return 1
		return a.value.localeCompare(b.value, "zh-Hant")
	})
	return rows.map(({ value, label }) => ({ value, label }))
}
