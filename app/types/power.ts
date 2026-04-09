import type { CategoryModbusConfig } from "~/types/lighting"
import type { DrainageStatusPointDef } from "~/types/location"

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
	uiStatus: "normal" | "warning" | "alarm" | "offline" | "unknown"
	raw?: Record<string, boolean | undefined>
	error?: string
}

/** 發電機：子狀態（供監控中心列與 tooltip；彙總仍用單一 uiStatus） */
export const derivePowerGeneratorRunStatus = (
	item: PowerStatusItem | null | undefined
): PowerStatusItem["uiStatus"] => {
	if (!item) return "unknown"
	const raw = item.raw || {}
	if (raw.fault === true) return "alarm"
	const hasSig =
		raw.fault !== undefined || raw.running !== undefined
	return hasSig ? "normal" : "warning"
}

export const derivePowerGeneratorOilStatus = (
	item: PowerStatusItem | null | undefined
): PowerStatusItem["uiStatus"] => {
	if (!item) return "warning"
	const raw = item.raw || {}
	if (
		raw.lowOil === true ||
		raw.highOil === true ||
		raw.oilLevelAlarm === true
	) {
		return "alarm"
	}
	const hasAny =
		raw.lowOil !== undefined ||
		raw.highOil !== undefined ||
		raw.oilLevelAlarm !== undefined
	return hasAny ? "normal" : "warning"
}

export const derivePowerOverallUiStatus = (
	item: PowerStatusItem | null | undefined
): PowerStatusItem["uiStatus"] => {
	if (!item) return "unknown"
	const kind = item.equipmentKind === "oil_level" ? "oil_level" : "generator"
	if (kind === "oil_level") {
		const raw = item.raw || {}
		if (raw.oilLevelAlarm === true) return "alarm"
		const anyRead = Object.keys(raw).some((k) => raw[k] !== undefined && raw[k] !== null)
		return anyRead ? "normal" : "warning"
	}
	const run = derivePowerGeneratorRunStatus(item)
	const oil = derivePowerGeneratorOilStatus(item)
	if (run === "alarm" || oil === "alarm") return "alarm"
	if (run === "warning" || oil === "warning") return "warning"
	return "normal"
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
	statusPoints?: Record<string, DrainageStatusPointDef>
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
