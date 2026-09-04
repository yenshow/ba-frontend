import { reactive } from "vue"
import type { SystemType } from "~/types/location"

export const LOCATION_GROUP_EMPTY_KEY = "__empty__"

export type LocationGroupMode = "none" | "viewCategory" | "floor"

export interface LocationGroupItem<T = unknown> {
	loc: T
	globalIndex: number
}

export interface LocationGroupRow<T = unknown> {
	key: string
	value: string
	displayLabel: string
	items: LocationGroupItem<T>[]
}

export interface LocationGroupDraft {
	id: string
	name: string
}

export type ZoneTreeSelection =
	| { type: "zone"; zoneId: string }
	| { type: "location"; zoneId: string; index: number }

/** 使用 viewCategory 分組的系統（Central 地圖型子集） */
export const VIEW_CATEGORY_SYSTEMS: SystemType[] = [
	"drainage",
	"power",
	"fire",
	"air_circulation",
]

const LEGACY_VIEW_CATEGORY_LABELS: Record<string, string> = {
	generator: "發電機",
	oil_level: "油位",
}

export const getLocationGroupMode = (systemType: SystemType): LocationGroupMode => {
	if (VIEW_CATEGORY_SYSTEMS.includes(systemType)) return "viewCategory"
	if (systemType === "access_security") return "floor"
	return "none"
}

export const buildZoneSelectionKey = (zoneId: string) => `zone:${zoneId}`

export const buildLocationSelectionKey = (zoneId: string, index: number) =>
	`location:${zoneId}:${index}`

export const parseZoneTreeSelectionKey = (
	key: string | null | undefined
): ZoneTreeSelection | null => {
	if (!key) return null
	if (key.startsWith("zone:")) {
		const zoneId = key.slice("zone:".length)
		return zoneId ? { type: "zone", zoneId } : null
	}
	if (key.startsWith("location:")) {
		const rest = key.slice("location:".length)
		const lastColon = rest.lastIndexOf(":")
		if (lastColon <= 0) return null
		const zoneId = rest.slice(0, lastColon)
		const index = Number(rest.slice(lastColon + 1))
		if (!zoneId || !Number.isFinite(index) || index < 0) return null
		return { type: "location", zoneId, index }
	}
	return null
}

export const getViewCategoryDisplayLabel = (raw: string): string => {
	const t = String(raw ?? "").trim()
	if (t === "") return "（未分類）"
	return LEGACY_VIEW_CATEGORY_LABELS[t] ?? t
}

export const normalizeGroupFloor = (raw: string | undefined | null): string =>
	String(raw ?? "").trim()

export const getGroupFieldRaw = (
	loc: { viewCategory?: string; floor?: string },
	mode: LocationGroupMode
): string => {
	if (mode === "floor") return normalizeGroupFloor(loc.floor)
	if (mode === "viewCategory") return String(loc.viewCategory ?? "").trim()
	return ""
}

export const getGroupDisplayLabel = (mode: LocationGroupMode, raw: string): string => {
	if (mode === "floor") return raw || "未分類樓層"
	if (mode === "viewCategory") return getViewCategoryDisplayLabel(raw)
	return raw || "未命名"
}

export const groupLocationsByMode = <T extends { viewCategory?: string; floor?: string }>(
	locations: T[],
	mode: LocationGroupMode
): LocationGroupRow<T>[] => {
	if (mode === "none") return []

	const map = new Map<string, LocationGroupRow<T>>()
	const keyOrder: string[] = []

	locations.forEach((loc, globalIndex) => {
		const raw = getGroupFieldRaw(loc, mode)
		const key = raw === "" ? LOCATION_GROUP_EMPTY_KEY : raw
		if (!map.has(key)) {
			map.set(key, {
				key,
				value: raw,
				displayLabel: getGroupDisplayLabel(mode, raw),
				items: [],
			})
			keyOrder.push(key)
		}
		map.get(key)!.items.push({ loc, globalIndex })
	})

	const orderedKeys = keyOrder.filter((k) => k !== LOCATION_GROUP_EMPTY_KEY)
	if (keyOrder.includes(LOCATION_GROUP_EMPTY_KEY)) orderedKeys.push(LOCATION_GROUP_EMPTY_KEY)
	return orderedKeys.map((k) => map.get(k)!)
}

/** 分類／樓層草稿與展開狀態（按 zoneId 分桶） */
export const useLocationGroupDrafts = () => {
	const draftsByZone = reactive<Record<string, LocationGroupDraft[]>>({})
	const groupExpandedByKey = reactive<Record<string, boolean>>({})
	const groupLabels = reactive<Record<string, string>>({})

	const ensureDraftBucket = (zoneId: string) => {
		if (!draftsByZone[zoneId]) draftsByZone[zoneId] = []
	}

	const addDraft = (zoneId: string) => {
		ensureDraftBucket(zoneId)
		const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
		draftsByZone[zoneId]!.unshift({ id, name: "" })
		return id
	}

	const removeDraft = (zoneId: string, draftId: string) => {
		const list = draftsByZone[zoneId]
		if (!list) return
		const i = list.findIndex((d) => d.id === draftId)
		if (i !== -1) list.splice(i, 1)
	}

	const clearAllDrafts = () => {
		for (const key of Object.keys(draftsByZone)) delete draftsByZone[key]
	}

	const isGroupExpanded = (key: string) => groupExpandedByKey[key] !== false
	const toggleGroup = (key: string) => {
		groupExpandedByKey[key] = !isGroupExpanded(key)
	}
	const setGroupExpanded = (key: string, open: boolean) => {
		groupExpandedByKey[key] = open
	}

	return {
		draftsByZone,
		groupLabels,
		addDraft,
		removeDraft,
		clearAllDrafts,
		isGroupExpanded,
		toggleGroup,
		setGroupExpanded,
	}
}
