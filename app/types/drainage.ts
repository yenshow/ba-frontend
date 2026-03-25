import type { CategoryModbusConfig } from "~/types/lighting"
import type { DrainageStatusPointDef } from "~/types/location"

/** `viewCategory` 字串正規化（空白視為無分類） */
export const trimDrainageViewCategory = (raw: string | undefined | null): string =>
	String(raw ?? "").trim()

/** 監控中心檢視分類下拉預設值（對應「揚水」） */
export const DEFAULT_DRAINAGE_MONITOR_VIEW_CATEGORY = "pumping"

/** 舊版檢視分類鍵 → 顯示用標籤（下拉、樓層管理分組等共用） */
export const LEGACY_DRAINAGE_VIEW_CATEGORY_LABELS: Record<string, string> = {
	pumping: "揚水",
	sewage: "污水",
	drainage: "排水",
}

/** 單一儲存字串的顯示標題（未分類、舊鍵友善名、其餘原樣） */
export const getDrainageViewCategoryDisplayLabel = (raw: string): string => {
	const t = trimDrainageViewCategory(raw)
	if (t === "") return "（未分類）"
	return LEGACY_DRAINAGE_VIEW_CATEGORY_LABELS[t] ?? t
}

export type DrainageEquipmentKind = "pump" | "tank"

/**
 * 後端 GET /drainage/status 單筆設備快照
 */
export interface DrainageStatusItem {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	equipmentKind: DrainageEquipmentKind | string
	viewCategory: string
	uiStatus: "normal" | "warning" | "alarm" | "offline" | "unknown"
	raw?: Record<string, boolean | undefined>
	error?: string
}

const hasBooleanValue = (value: unknown): value is boolean => typeof value === "boolean"

/**
 * 幫浦狀態判斷（前端相容層）：
 * - 優先採用後端 uiStatus
 * - 若後端尚未升級，支援 runningAlarm/fault/running 位元回推 alarm
 */
export const deriveDrainagePumpUiStatus = (
	item: DrainageStatusItem | null | undefined
): DrainageStatusItem["uiStatus"] => {
	if (!item) return "unknown"
	const raw = item.raw || {}
	if (raw.runningAlarm === true || raw.fault === true || raw.running === true) return "alarm"
	return item.uiStatus ?? "unknown"
}

/** 液位單欄狀態（cover / level） */
export const deriveDrainageTankPartUiStatus = (
	item: DrainageStatusItem | null | undefined,
	part: "cover" | "level"
): DrainageStatusItem["uiStatus"] => {
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

/** 液位整體狀態（cover + level 合併） */
export const deriveDrainageTankOverallUiStatus = (
	item: DrainageStatusItem | null | undefined
): DrainageStatusItem["uiStatus"] => {
	const cover = deriveDrainageTankPartUiStatus(item, "cover")
	const level = deriveDrainageTankPartUiStatus(item, "level")
	if (cover === "alarm" || level === "alarm") return "alarm"
	if (cover === "warning" || level === "warning") return "warning"
	return "normal"
}

export interface DrainageLocation {
	id?: string
	systemId?: string
	name: string
	/** 同區域內顯示排序（小者在前） */
	sortOrder?: number
	/** 與統一地點 createdAt 對齊，用於分組／列表排序 */
	createdAt?: string
	location?: { x: number; y: number }
	description?: string
	deviceId?: number
	modbus?: CategoryModbusConfig
	equipmentKind?: DrainageEquipmentKind
	viewCategory?: string
	statusPoints?: Record<string, DrainageStatusPointDef>
}

/** 供排序用：地點 `createdAt`（對應後端 created_at）轉成時間戳，無效則 null */
export const parseDrainageLocationCreatedAtMs = (loc: DrainageLocation): number | null => {
	if (!loc.createdAt) return null
	const t = Date.parse(loc.createdAt)
	return Number.isNaN(t) ? null : t
}

export interface DrainageZone {
	id?: string
	name: string
	imageUrl?: string
	/** 區域列表排序（小者在前） */
	sortOrder?: number
	locations: DrainageLocation[]
	description?: string
}

/** 地點是否屬於指定檢視分類（無 `viewCategory` 不算匹配） */
export const drainageLocationInViewCategory = (loc: DrainageLocation, categoryId: string): boolean => {
	const t = trimDrainageViewCategory(loc.viewCategory)
	return t !== "" && t === categoryId
}

export type DrainageViewFilterOption = { value: string; label: string }

/**
 * 監控中心下拉選項：不含「全部」；排序為各分類內地點最早 `createdAt` 在上，同序則依 value 字串。
 */
export const buildDrainageMonitorViewFilterOptions = (
	zones: DrainageZone[]
): DrainageViewFilterOption[] => {
	const minMsByCategory = new Map<string, number | null>()
	for (const z of zones) {
		for (const loc of z.locations || []) {
			const id = trimDrainageViewCategory(loc.viewCategory)
			if (!id) continue
			const ms = parseDrainageLocationCreatedAtMs(loc)
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
		label: LEGACY_DRAINAGE_VIEW_CATEGORY_LABELS[value] || value,
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
