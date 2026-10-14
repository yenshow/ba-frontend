import { compareZoneRowsForDialog, zoneSortOrderValue } from "~/utils/sortOrder"
import { stableEqual } from "~/utils/stableStringify"

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

const stripLocationRules = (locations: unknown[]): unknown[] =>
	(Array.isArray(locations) ? locations : []).map((loc) => {
		if (!loc || typeof loc !== "object") return loc
		const { rules: _rules, ...rest } = loc as Record<string, unknown>
		return rest
	})

const locationRulesOf = (locations: unknown[]): unknown[] =>
	(Array.isArray(locations) ? locations : []).map((loc) => {
		if (!loc || typeof loc !== "object") return null
		return (loc as { rules?: unknown }).rules ?? null
	})

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

	/**
	 * 寫入草稿；若與 original 深相等則清除（還原編輯後不再顯示「未儲存」）。
	 * 新增區域（temp-）一律保留。
	 */
	const commitDraft = (zoneId: string, zone: TZone, original?: TZone | null) => {
		if (!zoneId) return
		if (!zoneId.startsWith("temp-") && original != null && stableEqual(original, zone)) {
			deleteDraft(zoneId)
			return
		}
		setDraft(zoneId, zone)
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
		let sortOrderChanged = false

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

			if (
				zoneSortOrderValue(zone as { sortOrder?: number | null }) !==
				zoneSortOrderValue(originalZone as { sortOrder?: number | null })
			) {
				sortOrderChanged = true
			}

			const originalLocations = args.getLocations(originalZone)
			const pendingLocations = args.getLocations(zone)
			if (stableEqual(originalLocations, pendingLocations)) return

			const coreEqual = stableEqual(
				stripLocationRules(originalLocations as unknown[]),
				stripLocationRules(pendingLocations as unknown[]),
			)
			const rulesEqual = stableEqual(
				locationRulesOf(originalLocations as unknown[]),
				locationRulesOf(pendingLocations as unknown[]),
			)

			if (!coreEqual) {
				fields.push(`${args.locationLabel}列表`)
			}
			if (!rulesEqual) {
				fields.push("時段規則")
			}
			if (coreEqual && rulesEqual) {
				fields.push(`${args.locationLabel}列表`)
			}
		})

		if (sortOrderChanged) {
			fields.push("區域排序")
		}
		return [...new Set(fields)]
	}

	const buildChangeSummary = (args: {
		pendingChanges: Map<string, unknown>
		changedFields: string[]
	}): string => {
		const count = args.pendingChanges.size
		if (count <= 0) return ""

		const hasNew = Array.from(args.pendingChanges.keys()).some((id) => id.startsWith("temp-"))
		const fields = args.changedFields

		if (fields.length === 1 && fields[0] === "區域排序") {
			return "區域排序尚未儲存"
		}

		if (hasNew && count === 1 && fields.some((f) => f.startsWith("新增區域"))) {
			return "新增區域尚未儲存"
		}

		if (fields.length > 0 && fields.length <= 2 && !hasNew) {
			return `尚未儲存：${fields.join("、")}`
		}

		if (hasNew) {
			return count === 1
				? "有未儲存的變更（含新增區域）"
				: `${count} 個區域有未儲存的變更（含新增）`
		}

		if (count === 1) {
			return fields.length > 0 ? `尚未儲存：${fields[0]}` : "有未儲存的變更"
		}

		return `${count} 個區域有未儲存的變更`
	}

	/** API 已持久化變更後，父頁重載 props 與草稿地點列表一致時清除草稿 */
	const reconcileDraftWhenPropsLocationsMatch = (
		zoneId: string,
		args: {
			originalZones: () => readonly TZone[]
			getZoneId: (zone: TZone) => string
			getLocations: (zone: TZone) => TLocation[]
		},
	) => {
		const stop = watch(
			() => {
				const zone = args.originalZones().find((z) => args.getZoneId(z) === zoneId)
				return zone ? args.getLocations(zone) : undefined
			},
			(propsLocations) => {
				if (!propsLocations) return
				const draft = pendingChanges.value.get(zoneId)
				if (!draft) {
					stop()
					return
				}
				if (stableEqual(propsLocations, args.getLocations(draft))) {
					deleteDraft(zoneId)
					stop()
				}
			},
			{ deep: true },
		)
	}

	return {
		pendingChanges,
		expandedZones,
		hasUnsavedChanges,
		clearAllDrafts,
		setDraft,
		commitDraft,
		deleteDraft,
		createMergedZones,
		createSortedZones,
		buildChangedFieldsList,
		buildChangeSummary,
		reconcileDraftWhenPropsLocationsMatch,
	}
}
