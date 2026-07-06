import { TOAST } from "~/config/toastCatalog"
import type { Person, PersonGroup } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/personnelList"
import { findMainGroupById } from "~/utils/personnelGroups"
import { groupPersonsByPersonGroup } from "~/utils/personnelUtils"
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
	const {
		personnelApi,
		mainGroupId,
		groupTree,
		modelValue,
		onSaved,
		dismissDialog,
		toast,
	} = params

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
	const expandedChildIds = ref<Set<number>>(new Set())
	const memberIdsByChildId = ref<Record<number, number[]>>({})
	const initialMemberIdsByChildId = ref<Record<number, number[]>>({})

	const candidatesQuery = ref("")
	const candidatesItems = ref<Person[]>([])
	const isLoadingCandidates = ref(false)
	const candidatesErrorText = ref<string | null>(null)

	const candidateGroups = computed(() => groupPersonsByPersonGroup(candidatesItems.value))
	const hasCandidateItems = computed(() => candidatesItems.value.length > 0)

	const changedFieldsList = computed(() =>
		childGroups.value
			.filter(
				(child) =>
					!memberIdSetsEqual(
						memberIdsByChildId.value[child.id] ?? [],
						initialMemberIdsByChildId.value[child.id] ?? []
					)
			)
			.map((child) => child.name?.trim() || `子群組 ${child.id}`)
	)

	const hasUnsavedChanges = computed(() => changedFieldsList.value.length > 0)

	const memberCountForChild = (childId: number) => (memberIdsByChildId.value[childId] ?? []).length

	const isMemberSelected = (childId: number, personId: number) =>
		(memberIdsByChildId.value[childId] ?? []).includes(personId)

	const otherGroupLabel = (p: Person): string | null => {
		const gid = p.person_group_id != null ? Number(p.person_group_id) : null
		if (gid == null || !Number.isFinite(gid)) return null
		if (childGroups.value.some((c) => c.id === gid)) return null
		return p.group_name?.trim() || "其他群組"
	}

	const resetDraftToSource = () => {
		memberIdsByChildId.value = cloneMemberMap(initialMemberIdsByChildId.value)
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

	const toggleChildExpanded = (childId: number) => {
		const next = new Set(expandedChildIds.value)
		if (next.has(childId)) next.delete(childId)
		else next.add(childId)
		expandedChildIds.value = next
	}

	const setMembersForChild = (childId: number, personIds: number[], checked: boolean) => {
		if (personIds.length === 0) return
		const idSet = new Set(personIds)
		const map = { ...memberIdsByChildId.value }
		if (checked) {
			for (const child of childGroups.value) {
				map[child.id] = (map[child.id] ?? []).filter((id) => !idSet.has(id))
			}
			map[childId] = [...new Set([...(map[childId] ?? []), ...personIds])]
		} else {
			map[childId] = (map[childId] ?? []).filter((id) => !idSet.has(id))
		}
		memberIdsByChildId.value = map
	}

	const handleToggleMember = (childId: number, personId: number, checked: boolean) => {
		setMembersForChild(childId, [personId], checked)
	}

	const visibleCandidateIds = computed(() =>
		candidatesItems.value
			.map((p) => Number(p.id))
			.filter((id) => Number.isFinite(id))
			.map((id) => Math.trunc(id))
	)

	const isAllSelectedForChild = (childId: number) => {
		const ids = visibleCandidateIds.value
		return ids.length > 0 && ids.every((id) => isMemberSelected(childId, id))
	}

	const toggleSelectAllForChild = (childId: number) => {
		const ids = visibleCandidateIds.value
		if (ids.length === 0) return
		setMembersForChild(childId, ids, !isAllSelectedForChild(childId))
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
				})
			)
			const map: Record<number, number[]> = {}
			for (const [childId, list] of entries) map[childId] = list
			memberIdsByChildId.value = map
			initialMemberIdsByChildId.value = cloneMemberMap(map)
			expandedChildIds.value = new Set(children.map((c) => c.id))
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

	const handleSaveAll = async () => {
		if (!hasUnsavedChanges.value) return
		isSaving.value = true
		errorMessage.value = null
		try {
			await Promise.all(
				childGroups.value.map(async (child) => {
					const next = memberIdsByChildId.value[child.id] ?? []
					const prev = initialMemberIdsByChildId.value[child.id] ?? []
					if (!memberIdSetsEqual(next, prev)) {
						await personnelApi.replacePersonGroupMembers(child.id, next)
					}
				}),
			)
			toast.success(TOAST.PERSONNEL_GROUP_MEMBERS_UPDATED)
			initialMemberIdsByChildId.value = cloneMemberMap(memberIdsByChildId.value)
			onSaved()
		} catch (err) {
			errorMessage.value = resolveFormApiError(err, "儲存群組成員失敗")
		} finally {
			isSaving.value = false
		}
	}

	watch(
		[modelValue, mainGroupId],
		([open]) => {
			if (open) void initDialog()
		},
		{ immediate: true }
	)

	return {
		dialogTitle,
		childGroups,
		isLoading,
		isSaving,
		errorMessage,
		expandedChildIds,
		candidatesQuery,
		candidateGroups,
		hasCandidateItems,
		isLoadingCandidates,
		candidatesErrorText,
		hasUnsavedChanges,
		changedFieldsList,
		memberCountForChild,
		isMemberSelected,
		isAllSelectedForChild,
		otherGroupLabel,
		toggleChildExpanded,
		handleToggleMember,
		toggleSelectAllForChild,
		loadCandidates,
		handleSaveAll,
		requestClose,
		showConfirmDialog: confirmDialog.showDialog,
		confirmDialogConfig: confirmDialog.config,
		confirmDismiss: closePanel,
	}
}
