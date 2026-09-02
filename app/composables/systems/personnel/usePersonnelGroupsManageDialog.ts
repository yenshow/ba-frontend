import { TOAST } from "~/config/toastCatalog"
import type { Person } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/personnelList"
import {
	usePersonnelGroupsDraft,
	validatePersonnelGroupsDraftForSave,
	isNewPersonnelGroupDraftChild,
	type PersonnelGroupDraftChild,
	type PersonnelGroupDraftMain,
} from "~/composables/systems/personnel/usePersonnelGroupsDraft"
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree"
import {
	buildDeletePersonnelChildGroupConfirmCopy,
	buildDeletePersonnelMainGroupConfirmCopy,
	type PersonnelGroupsChangedPayload,
} from "~/utils/personnelGroups"
import { resolveFormApiError } from "~/utils/apiError"
import { FORM_UNSAVED_CLOSE_CONFIRM } from "~/utils/formDialog"

const cloneMemberMap = (map: Record<number, number[]>): Record<number, number[]> =>
	Object.fromEntries(Object.entries(map).map(([id, ids]) => [Number(id), [...ids]]))

const memberIdSetsEqual = (a: number[], b: number[]) => {
	if (a.length !== b.length) return false
	const set = new Set(a)
	return b.every((id) => set.has(id))
}

const collectPersistedChildIds = (mains: PersonnelGroupDraftMain[]) => {
	const ids: number[] = []
	for (const main of mains) {
		for (const child of main.children) {
			if (child.id != null) ids.push(child.id)
		}
	}
	return ids
}

type ConfirmAction =
	| { type: "close" }
	| { type: "deleteMain"; mainUiKey: string }
	| { type: "deleteChild"; mainUiKey: string; childUiKey: string }

type ConflictItem = {
	personId: number
	displayName: string
	employeeNo: string
	childIds: number[]
}

export const usePersonnelGroupsManageDialog = (params: {
	personnelApi: PersonnelApi
	modelValue: Ref<boolean>
	canCreateGroup: Ref<boolean>
	canUpdateGroup: Ref<boolean>
	canDeleteGroup: Ref<boolean>
	onSaved: (payload: PersonnelGroupsChangedPayload) => void
	dismissDialog: () => void
	toast: { success: (msg: string) => void }
}) => {
	const {
		personnelApi,
		modelValue,
		canCreateGroup,
		canUpdateGroup,
		canDeleteGroup,
		onSaved,
		dismissDialog,
		toast,
	} = params

	const confirmDialog = useConfirmDialog()
	const confirmAction = ref<ConfirmAction | null>(null)

	const {
		groupTree,
		errorMessage: groupTreeError,
		refresh: refreshGroupTree,
	} = usePersonnelGroupTree()

	const {
		pendingMains,
		deletedMainIds,
		expandedMainUiKeys,
		syncFromTree,
		resetToSource,
		commitPendingAsSource,
		hasUnsavedChanges: hasStructureChanges,
		changedFieldsList: structureChangedFields,
		toggleMainExpanded,
		addMain,
		addChild,
		removeMain,
		removeChild,
		getSourceIndex,
		getPendingChildGroupDeleteIds,
	} = usePersonnelGroupsDraft()

	const isLoading = ref(false)
	const isSaving = ref(false)
	const errorMessage = ref<string | null>(null)

	const activeChildUiKey = ref<string | null>(null)

	const memberIdsByChildId = ref<Record<number, number[]>>({})
	const initialMemberIdsByChildId = ref<Record<number, number[]>>({})

	const candidatesQuery = ref("")
	const candidatesItems = ref<Person[]>([])
	const isLoadingCandidates = ref(false)
	const candidatesErrorText = ref<string | null>(null)

	const canSaveStructure = computed(
		() => canCreateGroup.value || canUpdateGroup.value || canDeleteGroup.value
	)
	const canEditMembers = computed(() => canUpdateGroup.value)
	const canSave = computed(() => canSaveStructure.value || canEditMembers.value)

	const findChildByUiKey = (uiKey: string | null): PersonnelGroupDraftChild | null => {
		if (!uiKey) return null
		for (const main of pendingMains.value) {
			const child = main.children.find((c) => c.uiKey === uiKey)
			if (child) return child
		}
		return null
	}

	const activeChild = computed(() => findChildByUiKey(activeChildUiKey.value))
	const activeChildId = computed(() => {
		const id = activeChild.value?.id
		return id != null && Number.isFinite(id) ? id : null
	})
	const activeChildIsUnsaved = computed(
		() => activeChild.value != null && isNewPersonnelGroupDraftChild(activeChild.value)
	)

	const setActiveChild = (childUiKey: string) => {
		if (!pendingMains.value.some((m) => m.children.some((c) => c.uiKey === childUiKey))) return
		activeChildUiKey.value = childUiKey
	}

	const canEditGroupName = (hasPersistedId: boolean) =>
		canUpdateGroup.value || (canCreateGroup.value && !hasPersistedId)

	const handleAddChild = (mainUiKey: string) => {
		addChild(mainUiKey)
		if (!expandedMainUiKeys.value.has(mainUiKey)) toggleMainExpanded(mainUiKey)
		const main = pendingMains.value.find((m) => m.uiKey === mainUiKey)
		const last = main?.children[main.children.length - 1]
		if (last) activeChildUiKey.value = last.uiKey
	}

	const childNameById = computed(() => {
		const map = new Map<number, string>()
		for (const main of pendingMains.value) {
			for (const c of main.children) {
				if (c.id != null) map.set(c.id, c.name?.trim() || `子群組 ${c.id}`)
			}
		}
		return map
	})

	const existingChildIds = computed(() => collectPersistedChildIds(pendingMains.value))

	const changedMemberChildIds = computed(() => {
		const ids = new Set([
			...Object.keys(initialMemberIdsByChildId.value).map(Number),
			...Object.keys(memberIdsByChildId.value).map(Number),
		])
		const changed: number[] = []
		for (const childId of ids) {
			if (
				!memberIdSetsEqual(
					memberIdsByChildId.value[childId] ?? [],
					initialMemberIdsByChildId.value[childId] ?? []
				)
			) {
				changed.push(childId)
			}
		}
		return changed
	})

	const hasMemberChanges = computed(() => changedMemberChildIds.value.length > 0)
	const membersChangedFields = computed(() =>
		changedMemberChildIds.value.map(
			(childId) => `成員: ${childNameById.value.get(childId) || `子群組 ${childId}`}`
		)
	)

	const hasUnsavedChanges = computed(
		() => hasStructureChanges.value || hasMemberChanges.value
	)
	const changedFieldsList = computed(() => [
		...structureChangedFields.value,
		...membersChangedFields.value,
	])

	const memberCountForChild = (childId: number | undefined) => {
		if (childId == null) return 0
		return (memberIdsByChildId.value[childId] ?? []).length
	}

	const isMemberSelected = (personId: number) => {
		const cid = activeChildId.value
		if (cid == null) return false
		return (memberIdsByChildId.value[cid] ?? []).includes(personId)
	}

	const handleToggleMember = (personId: number, checked: boolean) => {
		if (!canEditMembers.value) return
		const cid = activeChildId.value
		if (cid == null) return
		const pid = Math.trunc(personId)
		if (!Number.isFinite(pid)) return
		const map = { ...memberIdsByChildId.value }
		const next = new Set(map[cid] ?? [])
		if (checked) next.add(pid)
		else next.delete(pid)
		map[cid] = [...next]
		memberIdsByChildId.value = map
	}

	const visibleCandidateIds = computed(() =>
		candidatesItems.value
			.map((p) => Number(p.id))
			.filter((id) => Number.isFinite(id))
			.map((id) => Math.trunc(id))
	)

	const isAllSelectedInActiveChild = computed(() => {
		const cid = activeChildId.value
		if (cid == null) return false
		const ids = visibleCandidateIds.value
		return ids.length > 0 && ids.every((id) => (memberIdsByChildId.value[cid] ?? []).includes(id))
	})

	const toggleSelectAllInActiveChild = () => {
		if (!canEditMembers.value) return
		const cid = activeChildId.value
		if (cid == null) return
		const ids = visibleCandidateIds.value
		if (ids.length === 0) return
		const map = { ...memberIdsByChildId.value }
		const next = new Set(map[cid] ?? [])
		const shouldSelectAll = !isAllSelectedInActiveChild.value
		for (const id of ids) {
			if (shouldSelectAll) next.add(id)
			else next.delete(id)
		}
		map[cid] = [...next]
		memberIdsByChildId.value = map
	}

	const otherGroupLabel = (p: Person): string | null => {
		const gid = p.person_group_id != null ? Number(p.person_group_id) : null
		if (gid == null || !Number.isFinite(gid)) return null
		if (childNameById.value.has(gid)) {
			if (activeChildId.value != null && gid === activeChildId.value) return null
			return childNameById.value.get(gid) || "其他子群組"
		}
		return p.group_name?.trim() || "其他群組"
	}

	const conflicts = computed<ConflictItem[]>(() => {
		const membershipCount = new Map<number, number[]>()
		for (const cid of existingChildIds.value) {
			for (const pid of memberIdsByChildId.value[cid] ?? []) {
				const id = Math.trunc(pid)
				if (!Number.isFinite(id)) continue
				const list = membershipCount.get(id) ?? []
				list.push(cid)
				membershipCount.set(id, list)
			}
		}
		const result: ConflictItem[] = []
		for (const [personId, cids] of membershipCount.entries()) {
			const uniq = Array.from(new Set(cids))
			if (uniq.length <= 1) continue
			const p = candidatesItems.value.find((x) => Number(x.id) === personId) ?? null
			result.push({
				personId,
				displayName: p?.full_name?.trim() || `人員 ${personId}`,
				employeeNo: String(p?.employee_no ?? ""),
				childIds: uniq,
			})
		}
		return result.sort((a, b) => a.employeeNo.localeCompare(b.employeeNo, "zh-Hant"))
	})

	const conflictPersonIdSet = computed(() => new Set(conflicts.value.map((x) => x.personId)))

	const showConflictDialog = ref(false)
	const conflictResolutions = ref<Record<number, number | null>>({})

	const openConflictDialog = () => {
		if (conflicts.value.length === 0) return false
		const next: Record<number, number | null> = {}
		for (const item of conflicts.value) next[item.personId] = null
		conflictResolutions.value = next
		showConflictDialog.value = true
		return true
	}

	const resolveConflictsAndApply = (): { ok: true } | { ok: false; message: string } => {
		const items = conflicts.value
		if (items.length === 0) return { ok: true }
		for (const item of items) {
			const choice = conflictResolutions.value[item.personId]
			if (choice == null) {
				return { ok: false, message: "請先為所有衝突人員選擇最終子群組或未分組" }
			}
			if (choice !== -1 && !item.childIds.includes(choice)) {
				return { ok: false, message: "衝突解決選項無效，請重新選擇" }
			}
		}
		const map = { ...memberIdsByChildId.value }
		for (const item of items) {
			const choice = conflictResolutions.value[item.personId]
			for (const cid of item.childIds) {
				map[cid] = (map[cid] ?? []).filter((id) => id !== item.personId)
			}
			if (choice != null && choice !== -1) {
				map[choice] = [...new Set([...(map[choice] ?? []), item.personId])]
			}
		}
		memberIdsByChildId.value = map
		return { ok: true }
	}

	const pruneMemberMapsForDeletedChildren = () => {
		const alive = new Set(existingChildIds.value)
		const keep = (src: Record<number, number[]>) => {
			const next: Record<number, number[]> = {}
			for (const [k, v] of Object.entries(src)) {
				const id = Number(k)
				if (alive.has(id)) next[id] = v
			}
			return next
		}
		memberIdsByChildId.value = keep(memberIdsByChildId.value)
		initialMemberIdsByChildId.value = keep(initialMemberIdsByChildId.value)
	}

	const handleRemoveMain = (mainUiKey: string) => {
		removeMain(mainUiKey)
		if (activeChildUiKey.value && !findChildByUiKey(activeChildUiKey.value)) {
			activeChildUiKey.value = null
		}
		pruneMemberMapsForDeletedChildren()
	}

	const handleRemoveChild = (mainUiKey: string, childUiKey: string) => {
		removeChild(mainUiKey, childUiKey)
		if (activeChildUiKey.value === childUiKey) activeChildUiKey.value = null
		pruneMemberMapsForDeletedChildren()
	}

	const requestDeleteMain = (main: PersonnelGroupDraftMain) => {
		confirmAction.value = { type: "deleteMain", mainUiKey: main.uiKey }
		confirmDialog.show(
			buildDeletePersonnelMainGroupConfirmCopy(main.name, main.children.length)
		)
	}

	const requestDeleteChild = (main: PersonnelGroupDraftMain, child: PersonnelGroupDraftChild) => {
		confirmAction.value = {
			type: "deleteChild",
			mainUiKey: main.uiKey,
			childUiKey: child.uiKey,
		}
		confirmDialog.show(buildDeletePersonnelChildGroupConfirmCopy(child.name))
	}

	const loadMemberIdsForAllChildren = async () => {
		const childIds = collectPersistedChildIds(pendingMains.value)
		if (childIds.length === 0) {
			memberIdsByChildId.value = {}
			initialMemberIdsByChildId.value = {}
			return
		}
		const entries = await Promise.all(
			childIds.map(async (childId) => {
				const res = await personnelApi.getPersonGroupMemberIds(childId)
				const list = Array.isArray(res?.ids) ? res.ids.map((x) => Math.trunc(x)) : []
				return [childId, list] as const
			})
		)
		const map: Record<number, number[]> = {}
		for (const [childId, list] of entries) map[childId] = list
		memberIdsByChildId.value = map
		initialMemberIdsByChildId.value = cloneMemberMap(map)
	}

	const loadCandidates = async () => {
		isLoadingCandidates.value = true
		candidatesErrorText.value = null
		try {
			candidatesItems.value = await fetchAllPersonnelCandidates({
				personnelApi,
				query: candidatesQuery.value,
			})
		} catch (err) {
			candidatesItems.value = []
			candidatesErrorText.value = resolveFormApiError(err, "載入人員失敗")
		} finally {
			isLoadingCandidates.value = false
		}
	}

	const pickDefaultActiveChild = () => {
		for (const main of pendingMains.value) {
			const first = main.children[0]
			if (!first) continue
			activeChildUiKey.value = first.uiKey
			if (!expandedMainUiKeys.value.has(main.uiKey)) toggleMainExpanded(main.uiKey)
			return
		}
		activeChildUiKey.value = null
	}

	const initDialog = async () => {
		isLoading.value = true
		errorMessage.value = null
		candidatesQuery.value = ""
		try {
			await refreshGroupTree()
			syncFromTree(groupTree.value || [])
			await Promise.all([loadMemberIdsForAllChildren(), loadCandidates()])
			pickDefaultActiveChild()
		} catch (err) {
			errorMessage.value = resolveFormApiError(err, "載入群組失敗")
		} finally {
			isLoading.value = false
		}
	}

	const closePanel = () => {
		resetToSource()
		memberIdsByChildId.value = cloneMemberMap(initialMemberIdsByChildId.value)
		activeChildUiKey.value = null
		dismissDialog()
	}

	const requestClose = () => {
		if (hasUnsavedChanges.value) {
			confirmAction.value = { type: "close" }
			confirmDialog.show(FORM_UNSAVED_CLOSE_CONFIRM)
			return
		}
		closePanel()
	}

	const handleConfirmDialog = () => {
		const action = confirmAction.value
		confirmAction.value = null
		if (!action) return
		if (action.type === "close") closePanel()
		else if (action.type === "deleteMain") handleRemoveMain(action.mainUiKey)
		else if (action.type === "deleteChild") {
			handleRemoveChild(action.mainUiKey, action.childUiKey)
		}
	}

	const saveStructure = async (): Promise<boolean> => {
		if (!hasStructureChanges.value) return false
		if (!canSaveStructure.value) {
			errorMessage.value = "無權限儲存群組結構"
			return false
		}
		const draftError = validatePersonnelGroupsDraftForSave(pendingMains.value)
		if (draftError) {
			errorMessage.value = draftError
			return false
		}

		const { mainById, childById } = getSourceIndex()
		const deleteIds = [...getPendingChildGroupDeleteIds(), ...deletedMainIds.value]
		for (const id of deleteIds) {
			await personnelApi.deletePersonGroup(id)
		}

		for (const main of pendingMains.value) {
			const mainName = main.name.trim()
			let mainId = main.id
			if (mainId == null) {
				mainId = (await personnelApi.createPersonGroup({ name: mainName, parentId: null })).id
				main.id = mainId
			} else if (mainById.get(mainId)?.name !== mainName) {
				await personnelApi.updatePersonGroup(mainId, { name: mainName })
			}

			for (const child of main.children) {
				const childName = child.name.trim()
				if (child.id == null) {
					const created = await personnelApi.createPersonGroup({
						name: childName,
						parentId: mainId,
					})
					child.id = created.id
					memberIdsByChildId.value = {
						...memberIdsByChildId.value,
						[created.id]: [],
					}
					initialMemberIdsByChildId.value = {
						...initialMemberIdsByChildId.value,
						[created.id]: [],
					}
				} else if (childById.get(child.id)?.name !== childName) {
					await personnelApi.updatePersonGroup(child.id, {
						name: childName,
						parentId: mainId,
					})
				}
			}
		}

		commitPendingAsSource()
		return true
	}

	const saveMembers = async (): Promise<boolean> => {
		if (!hasMemberChanges.value) return false
		if (!canEditMembers.value) {
			errorMessage.value = "無權限儲存群組成員"
			return false
		}
		const assignments: Record<number, number[]> = {}
		for (const childId of changedMemberChildIds.value) {
			assignments[childId] = memberIdsByChildId.value[childId] ?? []
		}
		await personnelApi.replacePersonGroupMembersBatch(assignments)
		initialMemberIdsByChildId.value = cloneMemberMap(memberIdsByChildId.value)
		return true
	}

	const saveAll = async () => {
		if (!hasUnsavedChanges.value) return
		isSaving.value = true
		errorMessage.value = null
		try {
			const structureDirty = hasStructureChanges.value
			const membersDirty = hasMemberChanges.value
			const didStructure = structureDirty ? await saveStructure() : false
			if (structureDirty && !didStructure) return
			const didMembers = membersDirty ? await saveMembers() : false
			if (membersDirty && !didMembers) return

			if (didStructure) toast.success(TOAST.PERSONNEL_GROUPS_SAVED)
			else if (didMembers) toast.success(TOAST.PERSONNEL_GROUP_MEMBERS_UPDATED)

			const scope: PersonnelGroupsChangedPayload["scope"] =
				didStructure && didMembers ? "both" : didStructure ? "groups" : "members"
			onSaved({ scope })
			dismissDialog()
		} catch (err) {
			errorMessage.value = resolveFormApiError(err, "儲存群組失敗")
		} finally {
			isSaving.value = false
		}
	}

	const handleSaveAll = async () => {
		if (!hasUnsavedChanges.value || !canSave.value) return
		if (hasStructureChanges.value) {
			const draftError = validatePersonnelGroupsDraftForSave(pendingMains.value)
			if (draftError) {
				errorMessage.value = draftError
				return
			}
		}
		if (conflicts.value.length > 0) {
			openConflictDialog()
			return
		}
		await saveAll()
	}

	const confirmConflictsAndSave = async () => {
		const res = resolveConflictsAndApply()
		if (res.ok === false) {
			errorMessage.value = res.message
			return
		}
		showConflictDialog.value = false
		await saveAll()
	}

	watch(
		modelValue,
		(open) => {
			if (open) void initDialog()
		},
		{ immediate: true }
	)

	return {
		isLoading,
		isSaving,
		errorMessage,
		groupTreeError,
		pendingMains,
		expandedMainUiKeys,
		toggleMainExpanded,
		addMain,
		handleAddChild,
		requestDeleteMain,
		requestDeleteChild,
		canEditGroupName,
		activeChildUiKey,
		activeChild,
		activeChildId,
		activeChildIsUnsaved,
		setActiveChild,
		canCreateGroup,
		canDeleteGroup,
		canEditMembers,
		canSave,
		candidatesQuery,
		candidatesItems,
		hasCandidateItems: computed(() => candidatesItems.value.length > 0),
		isLoadingCandidates,
		candidatesErrorText,
		hasUnsavedChanges,
		changedFieldsList,
		memberCountForChild,
		isMemberSelected,
		isAllSelectedInActiveChild,
		otherGroupLabel,
		handleToggleMember,
		toggleSelectAllInActiveChild,
		loadCandidates,
		handleSaveAll,
		showConflictDialog,
		childNameById,
		conflicts,
		conflictPersonIdSet,
		conflictResolutions,
		confirmConflictsAndSave,
		dismissConflictDialog: () => {
			showConflictDialog.value = false
		},
		requestClose,
		showConfirmDialog: confirmDialog.showDialog,
		confirmDialogConfig: confirmDialog.config,
		handleConfirmDialog,
	}
}
