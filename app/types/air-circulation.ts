// 空氣循環系統（Air Circulation）— 前端型別 SSOT（獨立於 HVAC）

import type { ModbusStatusPointDef } from "~/types/location"
import type { SystemUiStatus } from "~/utils/monitoringStatus"

/** `viewCategory` 字串正規化（空白視為無分類） */
export const trimAirCirculationViewCategory = (raw: string | undefined | null): string =>
	String(raw ?? "").trim()

/** 監控中心檢視分類下拉預設值（對齊後端預設值） */
export const DEFAULT_AIR_CIRCULATION_MONITOR_VIEW_CATEGORY = "air_circulation"

/**
 * 常見檢視分類鍵 → 顯示用標籤
 * - 注意：分類值實際以 zone.location[*].viewCategory 為準；此處僅做「常見鍵」友善顯示。
 */
export const LEGACY_AIR_CIRCULATION_VIEW_CATEGORY_LABELS: Record<string, string> = {
	air_circulation: "空氣循環",
	supply_air: "送風",
	exhaust_air: "排風",
	return_air: "回風",
	fresh_air: "新風",
} as const

/** 單一儲存字串的顯示標題（未分類、常見鍵友善名、其餘原樣） */
export const getAirCirculationViewCategoryDisplayLabel = (raw: string): string => {
	const t = trimAirCirculationViewCategory(raw)
	if (t === "") return "（未分類）"
	return LEGACY_AIR_CIRCULATION_VIEW_CATEGORY_LABELS[t] ?? t
}

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

	/** 控制器設備 ID */
	deviceId?: number
	/** 後端若仍回傳舊欄位時可能出現；新資料請勿依賴，請用 `statusPoints.running` */
	modbus?: {
		deviceId?: number
		points?: Array<{ address: number; type: "DI" | "DO" }>
	}
	/** 監控讀點：與煙霧／緊急求救相同，為 `running`（discrete／coil） */
	statusPoints?: Record<string, ModbusStatusPointDef>
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

/** 與 GET /air-circulation/status 單筆設備快照一致（對齊 drainage/power 等 status item） */
export interface AirCirculationStatusItem {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	equipmentKind?: string
	viewCategory?: string
	uiStatus: SystemUiStatus
	/** 與煙霧／緊急求救一致：通常僅 `{ running?: boolean }` */
	raw?: Record<string, boolean | undefined>
	error?: string
}

/** 供排序用：地點 `createdAt`（對應後端 created_at）轉成時間戳，無效則 null */
export const parseAirCirculationLocationCreatedAtMs = (
	loc: AirCirculationLocation
): number | null => {
	if (!loc.createdAt) return null
	const t = Date.parse(loc.createdAt)
	return Number.isNaN(t) ? null : t
}

/** 地點是否屬於指定檢視分類（無 `viewCategory` 不算匹配） */
export const airCirculationLocationInViewCategory = (
	loc: AirCirculationLocation,
	categoryId: string
): boolean => {
	const t = trimAirCirculationViewCategory(loc.viewCategory)
	return t !== "" && t === categoryId
}

export type AirCirculationViewFilterOption = { value: string; label: string }

/**
 * 監控中心下拉選項：不含「全部」；
 * 排序為各分類內地點最早 `createdAt` 在上，同序則依 value 字串。
 */
export const buildAirCirculationMonitorViewFilterOptions = (
	zones: AirCirculationZone[]
): AirCirculationViewFilterOption[] => {
	const minMsByCategory = new Map<string, number | null>()
	for (const z of zones || []) {
		for (const loc of z.locations || []) {
			const id = trimAirCirculationViewCategory(loc.viewCategory)
			if (!id) continue
			const ms = parseAirCirculationLocationCreatedAtMs(loc)
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
		label: LEGACY_AIR_CIRCULATION_VIEW_CATEGORY_LABELS[value] || value,
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
