import type { UnifiedZone } from "~/types/location"
import { compareZoneRowsForDialog } from "~/utils/sortOrder"
import { stableEqual } from "~/utils/stableStringify"

// ──────────────────────────────────────────
// 單一 UnifiedZone 草稿（用於 LocationManagementDialog）
// ──────────────────────────────────────────

export type UnifiedZoneDraftState = {
	pendingZone: Ref<UnifiedZone | null>
	hasUnsavedChanges: ComputedRef<boolean>
	changedFieldsList: ComputedRef<string[]>
	changeSummary: ComputedRef<string>
	resetToSource: () => void
}

const deepClone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export function useUnifiedZoneDraft(args: { sourceZone: ComputedRef<UnifiedZone | null> }): UnifiedZoneDraftState {
	const pendingZone = ref<UnifiedZone | null>(null)

	const syncFromSource = (zone: UnifiedZone | null) => {
		pendingZone.value = zone ? deepClone(zone) : null
	}

	watch(
		() => args.sourceZone.value,
		(newZone) => syncFromSource(newZone),
		{ immediate: true, deep: true }
	)

	const hasUnsavedChanges = computed(() => {
		const src = args.sourceZone.value
		const pending = pendingZone.value
		if (!src || !pending) return false
		return (
			pending.name !== src.name ||
			pending.imageUrl !== src.imageUrl ||
			!stableEqual(pending.locations, src.locations)
		)
	})

	const changedFieldsList = computed(() => {
		const src = args.sourceZone.value
		const pending = pendingZone.value
		if (!src || !pending) return []
		const fields: string[] = []
		if (pending.name !== src.name) fields.push(`區域名稱: ${src.name} → ${pending.name}`)
		if (pending.imageUrl !== src.imageUrl) fields.push("區域示意圖")
		if (!stableEqual(pending.locations, src.locations)) fields.push("地點列表")
		return fields
	})

	const changeSummary = computed(() => {
		const count = changedFieldsList.value.length
		if (count === 0) return ""
		return `有 ${count} 個欄位已修改`
	})

	const resetToSource = () => {
		syncFromSource(args.sourceZone.value)
	}

	return {
		pendingZone,
		hasUnsavedChanges,
		changedFieldsList,
		changeSummary,
		resetToSource,
	}
}

// ──────────────────────────────────────────
// 多區域草稿 Map（用於 ZoneManagementDialog）
// ──────────────────────────────────────────

export type ZoneDraftsChangedFieldsArgs<TZone, TLocation> = {
	originalZones: TZone[]
	pendingChanges: Map<string, TZone>
	getZoneId: (zone: TZone) => string
	getZoneName: (zone: TZone) => string
	getZoneImageUrl: (zone: TZone) => unknown
	getLocations: (zone: TZone) => TLocation[]
	locationLabel: string
}

export function useZoneDrafts<TZone extends { name: string }, TLocation>() {
	const pendingChanges = ref<Map<string, TZone>>(new Map()) as Ref<Map<string, TZone>>
	const expandedZones = ref<Set<string>>(new Set())

	const clearAllDrafts = () => {
		pendingChanges.value.clear()
		expandedZones.value.clear()
	}

	const setDraft = (zoneId: string, zone: TZone) => {
		if (!zoneId) return
		pendingChanges.value.set(zoneId, zone)
	}

	const deleteDraft = (zoneId: string) => {
		if (!zoneId) return
		pendingChanges.value.delete(zoneId)
		expandedZones.value.delete(zoneId)
	}

	const hasUnsavedChanges = computed(() => pendingChanges.value.size > 0)

	const createMergedZones = (args: { originalZones: TZone[]; getZoneId: (z: TZone) => string }) => {
		const zonesMap = new Map<string, TZone>()
		args.originalZones.forEach((zone) => {
			const id = args.getZoneId(zone)
			if (!id) return
			zonesMap.set(id, { ...zone })
		})
		pendingChanges.value.forEach((zone, id) => {
			zonesMap.set(id, { ...zone } as TZone)
		})
		return Array.from(zonesMap.values())
	}

	const createSortedZones = <T extends TZone>(args: {
		mergedZones: T[]
		getZoneId: (z: T) => string
		getLocations: (z: T) => unknown[]
	}): T[] => {
		if (!args.mergedZones?.length) return []
		const zonesWithLocations = args.mergedZones.filter((zone) => {
			const id = args.getZoneId(zone)
			const hasLocations = (args.getLocations(zone) || []).length > 0
			const isNewZone = id?.startsWith("temp-")
			return hasLocations || isNewZone
		})
		const zonesToShow = zonesWithLocations.length > 0 ? zonesWithLocations : args.mergedZones
		return [...zonesToShow].sort((a, b) => compareZoneRowsForDialog(a, b, args.getZoneId))
	}

	const buildChangedFieldsList = <T extends TZone, L extends TLocation>(
		args: ZoneDraftsChangedFieldsArgs<T, L>
	): string[] => {
		const fields: string[] = []
		args.pendingChanges.forEach((zone, zoneId) => {
			const originalZone = args.originalZones.find((z) => args.getZoneId(z) === zoneId)
			if (!originalZone) {
				fields.push(`新增區域: ${args.getZoneName(zone) || "未命名"}`)
				return
			}

			if (args.getZoneName(zone) !== args.getZoneName(originalZone)) {
				fields.push(`區域名稱: ${args.getZoneName(originalZone)} → ${args.getZoneName(zone)}`)
			}

			if (!stableEqual(args.getZoneImageUrl(zone), args.getZoneImageUrl(originalZone))) {
				fields.push("區域示意圖")
			}

			const originalLocations = args.getLocations(originalZone)
			const pendingLocations = args.getLocations(zone)
			if (!stableEqual(originalLocations, pendingLocations)) {
				fields.push(`${args.locationLabel}列表`)
			}
		})
		return fields
	}

	const buildChangeSummary = (args: { pendingChanges: Map<string, unknown> }): string => {
		const count = args.pendingChanges.size
		const hasNew = Array.from(args.pendingChanges.keys()).some((id) => id.startsWith("temp-"))
		if (hasNew) return `有 ${count} 個區域已修改，包含新增的區域`
		return `有 ${count} 個區域已修改`
	}

	return {
		pendingChanges,
		expandedZones,
		hasUnsavedChanges,
		clearAllDrafts,
		setDraft,
		deleteDraft,
		createMergedZones,
		createSortedZones,
		buildChangedFieldsList,
		buildChangeSummary,
	}
}
