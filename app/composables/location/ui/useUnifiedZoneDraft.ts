import type { UnifiedZone } from "~/types/location"
import { stableEqual } from "~/utils/stableStringify"

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

