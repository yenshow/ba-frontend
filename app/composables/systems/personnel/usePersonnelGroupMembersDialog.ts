import { TOAST } from "~/config/toastCatalog"
import type { Person, PersonGroup } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/personnelList"
import { findMainGroupById } from "~/utils/personnelGroups"
import { resolveFormApiError } from "~/utils/apiError"

const cloneMemberMap = (map: Record<number, number[]>): Record<number, number[]> =>
	Object.fromEntries(Object.entries(map).map(([id, ids]) => [Number(id), [...ids]]))

const memberIdSetsEqual = (a: number[], b: number[]) => {
	if (a.length !== b.length) return false
	const set = new Set(a)
	return b.every((id) => set.has(id))
}

const UNSAVED_CLOSE_CONFIRM = {
	title: "確定要離開？",
	message: "您有尚未儲存的變更，確定要離開嗎？",
	details: "未儲存的變更將會遺失。",
	type: "warning" as const,
}

export const usePersonnelGroupMembersDialog = (params: {
	personnelApi: PersonnelApi
	mainGroupId: Ref<number>
	groupTree: Ref<PersonGroup[]>
	modelValue: Ref<boolean>
	onSaved: () => void
	dismissDialog: () => void
	toast: { success: (msg: string) => void }
}) => {
	const { personnelApi, mainGroupId, groupTree, modelValue, onSaved, dismissDialog, toast } = params

	const confirmDialog = useConfirmDialog()

	const activeMainGroup = computed(() => findMainGroupById(groupTree.value, mainGroupId.value))
	const childGroups = computed(() => activeMainGroup.value?.children ?? [])
	const dialogTitle = computed(() => {
		const name = activeMainGroup.value?.name?.trim()
		return name ? `群組成員 - ${name}` : "群組成員"
	})

	const isLoading = ref(false)
	const isSaving = ref(false)
	const errorMessage = ref<string | null>(null)

	const childQuery = ref("")
	const activeChildId = ref<number | null>(null)
	const activeChild = computed(() => childGroups.value.find((c) => c.id === activeChildId.value) ?? null)
	const filteredChildGroups = computed(() => {
		const q = childQuery.value.trim()
		if (!q) return childGroups.value
		return childGroups.value.filter((c) => (c.name || "").includes(q))
	})

	const setActiveChild = (childId: number) => {
		const id = Math.trunc(childId)
		if (!Number.isFinite(id)) return
		if (!childGroups.value.some((c) => c.id === id)) return
		activeChildId.value = id
	}

	const memberIdsByChildId = ref<Record<number, number[]>>({})
	const initialMemberIdsByChildId = ref<Record<number, number[]>>({})

	const candidatesQuery = ref("")
	const candidatesItems = ref<Person[]>([])
	const isLoadingCandidates = ref(false)
	const candidatesErrorText = ref<string | null>(null)
	const hasCandidateItems = computed(() => candidatesItems.value.length > 0)

	const changedFieldsList = computed(() =>
		childGroups.value
			.filter(
				(child) =>
					!memberIdSetsEqual(
						memberIdsByChildId.value[child.id] ?? [],
						initialMemberIdsByChildId.value[child.id] ?? [],
					),
			)
			.map((child) => child.name?.trim() || `子群組 ${child.id}`),
	)

	const hasUnsavedChanges = computed(() => changedFieldsList.value.length > 0)

	const memberCountForChild = (childId: number) => (memberIdsByChildId.value[childId] ?? []).length

	const isMemberSelected = (personId: number) => {
		const cid = activeChildId.value
		if (cid == null) return false
		return (memberIdsByChildId.value[cid] ?? []).includes(personId)
	}

	const handleToggleMember = (personId: number, checked: boolean) => {
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
			.map((id) => Math.trunc(id)),
	)

	const isAllSelectedInActiveChild = computed(() => {
		const cid = activeChildId.value
		if (cid == null) return false
		const ids = visibleCandidateIds.value
		return ids.length > 0 && ids.every((id) => (memberIdsByChildId.value[cid] ?? []).includes(id))
	})

	const toggleSelectAllInActiveChild = () => {
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
		if (childGroups.value.some((c) => c.id === gid)) return null
		return p.group_name?.trim() || "其他群組"
	}

	const resetDraftToSource = () => {
		memberIdsByChildId.value = cloneMemberMap(initialMemberIdsByChildId.value)
		activeChildId.value = childGroups.value?.[0]?.id ?? null
		childQuery.value = ""
		candidatesQuery.value = ""
		errorMessage.value = null
	}

	const closePanel = () => {
		resetDraftToSource()
		dismissDialog()
	}

	const requestClose = () => {
		if (hasUnsavedChanges.value) {
			confirmDialog.show(UNSAVED_CLOSE_CONFIRM)
			return
		}
		closePanel()
	}

	type ConflictItem = {
		personId: number
		displayName: string
		employeeNo: string
		childIds: number[]
	}

	const childNameById = computed(() => {
		const map = new Map<number, string>()
		for (const c of childGroups.value || []) map.set(c.id, c.name?.trim() || `子群組 ${c.id}`)
		return map
	})

	const conflicts = computed<ConflictItem[]>(() => {
		const childIds = childGroups.value.map((c) => c.id)
		if (childIds.length === 0) return []

		const membershipCount = new Map<number, number[]>()
		for (const cid of childIds) {
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

	const conflictPersonIdSet = computed(() => new Set((conflicts.value || []).map((x) => x.personId)))

	const showConflictDialog = ref(false)
	const conflictResolutions = ref<Record<number, number | null>>({})

	const openConflictDialog = () => {
		const items = conflicts.value
		if (items.length === 0) return false
		const next: Record<number, number | null> = {}
		for (const item of items) next[item.personId] = null
		conflictResolutions.value = next
		showConflictDialog.value = true
		return true
	}

	const resolveConflictsAndApply = (): { ok: true } | { ok: false; message: string } => {
		const items = conflicts.value
		if (items.length === 0) return { ok: true }

		for (const item of items) {
			if (!(item.personId in conflictResolutions.value)) {
				return { ok: false, message: "衝突解決資料遺失，請重新開啟衝突清單" }
			}
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

	const loadMemberIdsForChildren = async () => {
		const children = childGroups.value
		if (children.length === 0) {
			memberIdsByChildId.value = {}
			initialMemberIdsByChildId.value = {}
			return
		}
		isLoading.value = true
		errorMessage.value = null
		try {
			const entries = await Promise.all(
				children.map(async (child) => {
					const res = await personnelApi.getPersonGroupMemberIds(child.id)
					const list = Array.isArray(res?.ids) ? res.ids.map((x) => Math.trunc(x)) : []
					return [child.id, list] as const
				}),
			)
			const map: Record<number, number[]> = {}
			for (const [childId, list] of entries) map[childId] = list
			memberIdsByChildId.value = map
			initialMemberIdsByChildId.value = cloneMemberMap(map)
			activeChildId.value = children[0]?.id ?? null
		} catch (err) {
			errorMessage.value = resolveFormApiError(err, "載入群組成員失敗")
		} finally {
			isLoading.value = false
		}
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

	const initDialog = async () => {
		candidatesQuery.value = ""
		await Promise.all([loadMemberIdsForChildren(), loadCandidates()])
	}

	const saveAll = async () => {
		if (!hasUnsavedChanges.value) return
		isSaving.value = true
		errorMessage.value = null
		try {
			for (const child of childGroups.value) {
				const next = memberIdsByChildId.value[child.id] ?? []
				const prev = initialMemberIdsByChildId.value[child.id] ?? []
				if (!memberIdSetsEqual(next, prev)) {
					await personnelApi.replacePersonGroupMembers(child.id, next)
				}
			}
			toast.success(TOAST.PERSONNEL_GROUP_MEMBERS_UPDATED)
			initialMemberIdsByChildId.value = cloneMemberMap(memberIdsByChildId.value)
			onSaved()
		} catch (err) {
			errorMessage.value = resolveFormApiError(err, "儲存群組成員失敗")
		} finally {
			isSaving.value = false
		}
	}

	const handleSaveAll = async () => {
		if (!hasUnsavedChanges.value) return
		if (conflicts.value.length > 0) {
			openConflictDialog()
			return
		}
		await saveAll()
	}

	const confirmConflictsAndSave = async () => {
		const res = resolveConflictsAndApply()
		if (!res.ok) {
			errorMessage.value = "message" in res ? res.message : "處理衝突失敗"
			return
		}
		showConflictDialog.value = false
		await saveAll()
	}

	watch(
		[modelValue, mainGroupId],
		([open]) => {
			if (open) void initDialog()
		},
		{ immediate: true },
	)

	return {
		dialogTitle,
		childGroups,
		filteredChildGroups,
		childQuery,
		activeChildId,
		activeChild,
		setActiveChild,
		isLoading,
		isSaving,
		errorMessage,
		candidatesQuery,
		candidatesItems,
		hasCandidateItems,
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
		dismissConflictDialog: () => (showConflictDialog.value = false),
		requestClose,
		showConfirmDialog: confirmDialog.showDialog,
		confirmDialogConfig: confirmDialog.config,
		confirmDismiss: closePanel,
	}
}
