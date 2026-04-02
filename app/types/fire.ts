import type { CategoryModbusConfig } from "~/types/lighting"
import type { DrainageStatusPointDef } from "~/types/location"

export const trimFireViewCategory = (raw: string | undefined | null): string =>
	String(raw ?? "").trim()

/** 監控中心檢視預設（灑水） */
export const DEFAULT_FIRE_MONITOR_VIEW_CATEGORY = "sprinkler"

export const LEGACY_FIRE_VIEW_CATEGORY_LABELS: Record<string, string> = {
	sprinkler: "灑水",
	foam: "泡沫",
	fire_general: "消防",
}

export const getFireViewCategoryDisplayLabel = (raw: string): string => {
	const t = trimFireViewCategory(raw)
	if (t === "") return "（未分類）"
	return LEGACY_FIRE_VIEW_CATEGORY_LABELS[t] ?? t
}

export type FireEquipmentKind = "pump" | "tank"

export interface FireStatusItem {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	equipmentKind: FireEquipmentKind | string
	viewCategory: string
	uiStatus: "normal" | "warning" | "alarm" | "offline" | "unknown"
	raw?: Record<string, boolean | undefined>
	error?: string
}

const hasBooleanValue = (value: unknown): value is boolean => typeof value === "boolean"

export const deriveFirePumpUiStatus = (
	item: FireStatusItem | null | undefined
): FireStatusItem["uiStatus"] => {
	if (!item) return "unknown"
	const raw = item.raw || {}
	if (raw.runningAlarm === true || raw.fault === true || raw.running === true) return "alarm"
	return item.uiStatus ?? "unknown"
}

export const deriveFireTankPartUiStatus = (
	item: FireStatusItem | null | undefined,
	part: "cover" | "level"
): FireStatusItem["uiStatus"] => {
	if (!item) return "warning"
	const raw = item.raw || {}

	if (part === "cover") {
		if (raw.coverAlarm === true) return "alarm"
		if (!hasBooleanValue(raw.coverAlarm)) return "warning"
		return "normal"
	}

	if (raw.levelOk === false || raw.highLevel === true || raw.lowLevel === true) return "alarm"
	const hasAnyLevelSignal =
		hasBooleanValue(raw.levelOk) || hasBooleanValue(raw.highLevel) || hasBooleanValue(raw.lowLevel)
	return hasAnyLevelSignal ? "normal" : "warning"
}

export const deriveFireTankOverallUiStatus = (
	item: FireStatusItem | null | undefined
): FireStatusItem["uiStatus"] => {
	const cover = deriveFireTankPartUiStatus(item, "cover")
	const level = deriveFireTankPartUiStatus(item, "level")
	if (cover === "alarm" || level === "alarm") return "alarm"
	if (cover === "warning" || level === "warning") return "warning"
	return "normal"
}

export interface FireLocation {
	id?: string
	systemId?: string
	name: string
	sortOrder?: number
	createdAt?: string
	location?: { x: number; y: number }
	description?: string
	deviceId?: number
	modbus?: CategoryModbusConfig
	equipmentKind?: FireEquipmentKind
	viewCategory?: string
	statusPoints?: Record<string, DrainageStatusPointDef>
}

export const parseFireLocationCreatedAtMs = (loc: FireLocation): number | null => {
	if (!loc.createdAt) return null
	const t = Date.parse(loc.createdAt)
	return Number.isNaN(t) ? null : t
}

export interface FireZone {
	id?: string
	name: string
	imageUrl?: string
	sortOrder?: number
	locations: FireLocation[]
	description?: string
}

export const fireLocationInViewCategory = (loc: FireLocation, categoryId: string): boolean => {
	const t = trimFireViewCategory(loc.viewCategory)
	return t !== "" && t === categoryId
}

export type FireViewFilterOption = { value: string; label: string }

export const buildFireMonitorViewFilterOptions = (zones: FireZone[]): FireViewFilterOption[] => {
	const minMsByCategory = new Map<string, number | null>()
	for (const z of zones) {
		for (const loc of z.locations || []) {
			const id = trimFireViewCategory(loc.viewCategory)
			if (!id) continue
			const ms = parseFireLocationCreatedAtMs(loc)
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
		label: LEGACY_FIRE_VIEW_CATEGORY_LABELS[value] || value,
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
