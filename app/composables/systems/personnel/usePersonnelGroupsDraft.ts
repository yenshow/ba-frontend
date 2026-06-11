import type { PersonGroup } from "~/types/personnel"
import { stableEqual } from "~/utils/stableStringify"

export type PersonnelGroupDraftChild = {
	uiKey: string
	id?: number
	name: string
}

export type PersonnelGroupDraftMain = {
	uiKey: string
	id?: number
	name: string
	children: PersonnelGroupDraftChild[]
}

const deepClone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

let tempSeq = 0
const nextTempKey = (prefix: string) => `temp-${prefix}-${++tempSeq}`

export const buildPersonnelGroupsDraftFromTree = (
	tree: PersonGroup[]
): PersonnelGroupDraftMain[] =>
	(tree || []).map((main) => ({
		uiKey: `main-${main.id}`,
		id: main.id,
		name: main.name,
		children: (main.children || []).map((child) => ({
			uiKey: `child-${child.id}`,
			id: child.id,
			name: child.name,
		})),
	}))

export const isNewPersonnelGroupDraftMain = (main: PersonnelGroupDraftMain) => main.id == null
export const isNewPersonnelGroupDraftChild = (child: PersonnelGroupDraftChild) => child.id == null

/** 群組草稿儲存前集中驗證；回傳第一個錯誤訊息或 null */
export const validatePersonnelGroupsDraftForSave = (
	mains: PersonnelGroupDraftMain[],
): string | null => {
	for (const main of mains) {
		if (!main.name.trim()) return "主群組名稱為必填"
		for (const child of main.children) {
			if (!child.name.trim()) {
				return `子群組名稱為必填（主群組：${main.name.trim()}）`
			}
		}
	}
	return null
}

const findMainIdForChildId = (
	sourceMains: PersonnelGroupDraftMain[],
	childId: number
): number | null => {
	for (const main of sourceMains) {
		if (main.id == null) continue
		if (main.children.some((c) => c.id === childId)) return main.id
	}
	return null
}

const buildSourceChildById = (sourceMains: PersonnelGroupDraftMain[]) => {
	const map = new Map<number, PersonnelGroupDraftChild>()
	for (const main of sourceMains) {
		for (const child of main.children) {
			if (child.id != null) map.set(child.id, child)
		}
	}
	return map
}

export const usePersonnelGroupsDraft = () => {
	const pendingMains = ref<PersonnelGroupDraftMain[]>([])
	const sourceMains = ref<PersonnelGroupDraftMain[]>([])
	const deletedMainIds = ref<number[]>([])
	const deletedChildIds = ref<number[]>([])
	const expandedMainUiKeys = ref<Set<string>>(new Set())

	const syncFromTree = (tree: PersonGroup[]) => {
		const draft = buildPersonnelGroupsDraftFromTree(tree)
		pendingMains.value = deepClone(draft)
		sourceMains.value = deepClone(draft)
		deletedMainIds.value = []
		deletedChildIds.value = []
	}

	const resetToSource = () => {
		pendingMains.value = deepClone(sourceMains.value)
		deletedMainIds.value = []
		deletedChildIds.value = []
	}

	const hasUnsavedChanges = computed(() => {
		if (deletedMainIds.value.length > 0 || deletedChildIds.value.length > 0) return true
		return !stableEqual(pendingMains.value, sourceMains.value)
	})

	const changedFieldsList = computed(() => {
		const fields: string[] = []
		const sourceMainById = new Map(
			sourceMains.value.filter((m) => m.id != null).map((m) => [m.id!, m])
		)
		const sourceChildById = buildSourceChildById(sourceMains.value)

		for (const id of deletedChildIds.value) {
			const src = sourceChildById.get(id)
			fields.push(`刪除子群組: ${src?.name || id}`)
		}
		for (const id of deletedMainIds.value) {
			const src = sourceMainById.get(id)
			fields.push(`刪除主群組: ${src?.name || id}`)
		}

		for (const main of pendingMains.value) {
			if (main.id == null) {
				fields.push(`新增主群組: ${main.name.trim() || "未命名"}`)
				continue
			}
			const src = sourceMainById.get(main.id)
			if (src && src.name !== main.name) fields.push(`主群組名稱: ${src.name} → ${main.name}`)
			for (const child of main.children) {
				if (child.id == null) {
					fields.push(`新增子群組（${main.name}）: ${child.name.trim() || "未命名"}`)
					continue
				}
				const srcChild = sourceChildById.get(child.id)
				if (srcChild && srcChild.name !== child.name) {
					fields.push(`子群組名稱: ${srcChild.name} → ${child.name}`)
				}
			}
		}
		return fields
	})

	const changeSummary = computed(() => {
		const n = changedFieldsList.value.length
		return n === 0 ? "" : `有 ${n} 項變更`
	})

	const toggleMainExpanded = (uiKey: string) => {
		const next = new Set(expandedMainUiKeys.value)
		if (next.has(uiKey)) next.delete(uiKey)
		else next.add(uiKey)
		expandedMainUiKeys.value = next
	}

	const addMain = () => {
		const uiKey = nextTempKey("main")
		pendingMains.value = [...pendingMains.value, { uiKey, name: "", children: [] }]
		expandedMainUiKeys.value = new Set([...expandedMainUiKeys.value, uiKey])
	}

	const addChild = (mainUiKey: string) => {
		const main = pendingMains.value.find((m) => m.uiKey === mainUiKey)
		if (!main) return
		main.children.push({ uiKey: nextTempKey("child"), name: "" })
	}

	const pushDeletedId = (list: number[], id: number) =>
		list.includes(id) ? list : [...list, id]

	const removeMain = (mainUiKey: string) => {
		const main = pendingMains.value.find((m) => m.uiKey === mainUiKey)
		if (!main) return
		if (main.id != null) deletedMainIds.value = pushDeletedId(deletedMainIds.value, main.id)
		pendingMains.value = pendingMains.value.filter((m) => m.uiKey !== mainUiKey)
		expandedMainUiKeys.value = new Set(
			[...expandedMainUiKeys.value].filter((k) => k !== mainUiKey)
		)
	}

	const removeChild = (mainUiKey: string, childUiKey: string) => {
		const main = pendingMains.value.find((m) => m.uiKey === mainUiKey)
		if (!main) return
		const child = main.children.find((c) => c.uiKey === childUiKey)
		if (child?.id != null) {
			deletedChildIds.value = pushDeletedId(deletedChildIds.value, child.id)
		}
		main.children = main.children.filter((c) => c.uiKey !== childUiKey)
	}

	/** 供儲存時比對，僅對有變更的項目打 API */
	const getSourceIndex = () => {
		const mainById = new Map(
			sourceMains.value.filter((m) => m.id != null).map((m) => [m.id!, m])
		)
		return { mainById, childById: buildSourceChildById(sourceMains.value) }
	}

	/** 刪主群組時略過其子群組 id（由 DB CASCADE 處理） */
	const getPendingChildGroupDeleteIds = () => {
		const mainDeleteSet = new Set(deletedMainIds.value)
		return deletedChildIds.value.filter((childId) => {
			const parentMainId = findMainIdForChildId(sourceMains.value, childId)
			return parentMainId == null || !mainDeleteSet.has(parentMainId)
		})
	}

	return {
		pendingMains,
		sourceMains,
		deletedMainIds,
		deletedChildIds,
		expandedMainUiKeys,
		syncFromTree,
		resetToSource,
		hasUnsavedChanges,
		changedFieldsList,
		changeSummary,
		toggleMainExpanded,
		addMain,
		addChild,
		removeMain,
		removeChild,
		getSourceIndex,
		getPendingChildGroupDeleteIds,
	}
}
