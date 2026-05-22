import type { Person, PersonGroup } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/personnelList"
import { findMainGroupById } from "~/utils/personnelGroups"

const cloneMemberMap = (map: Record<number, number[]>) => structuredClone(map)

const memberIdSetsEqual = (a: number[], b: number[]) => {
	if (a.length !== b.length) return false
	const set = new Set(a)
	return b.every((id) => set.has(id))
}

const UNSAVED_CLOSE_CONFIRM = {
	title: "確認關閉",
	message: "您有未保存的變更，確定要關閉嗎？",
	details: "未保存的變更將會遺失。",
	type: "warning" as const,
}

export const usePersonnelGroupMembersDialog = (params: {
	personnelApi: PersonnelApi
	mainGroupId: Ref<number>
	groupTree: Ref<PersonGroup[]>
	modelValue: Ref<boolean>
	onSaved: () => void
	dismissDialog: () => void
	handleApiError: (err: unknown, fallback: string) => string | void | null
	toast: { success: (msg: string) => void }
}) => {
	const { personnelApi, mainGroupId, groupTree, modelValue, onSaved, dismissDialog, handleApiError, toast } =
		params

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

	const changedFieldsList = computed(() =>
		childGroups.value
			.filter((child) =>
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

	const handleToggleMember = (childId: number, personId: number, checked: boolean) => {
		const map = { ...memberIdsByChildId.value }
		if (checked) {
			for (const child of childGroups.value) {
				map[child.id] = (map[child.id] ?? []).filter((x) => x !== personId)
			}
			map[childId] = [...(map[childId] ?? []), personId]
		} else {
			map[childId] = (map[childId] ?? []).filter((x) => x !== personId)
		}
		memberIdsByChildId.value = map
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
			errorMessage.value = handleApiError(err, "載入群組成員失敗") || "載入群組成員失敗"
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
			candidatesErrorText.value = err instanceof Error ? err.message : "載入人員失敗"
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
			for (const child of childGroups.value) {
				const next = memberIdsByChildId.value[child.id] ?? []
				const prev = initialMemberIdsByChildId.value[child.id] ?? []
				if (!memberIdSetsEqual(next, prev)) {
					await personnelApi.replacePersonGroupMembers(child.id, next)
				}
			}
			toast.success("已更新群組成員")
			onSaved()
		} catch (err) {
			errorMessage.value = handleApiError(err, "儲存群組成員失敗") || "儲存群組成員失敗"
		} finally {
			isSaving.value = false
		}
	}

	watch([modelValue, mainGroupId], ([open]) => {
		if (open) void initDialog()
	})

	return {
		dialogTitle,
		childGroups,
		isLoading,
		isSaving,
		errorMessage,
		expandedChildIds,
		candidatesQuery,
		candidatesItems,
		isLoadingCandidates,
		candidatesErrorText,
		hasUnsavedChanges,
		changedFieldsList,
		memberCountForChild,
		isMemberSelected,
		otherGroupLabel,
		toggleChildExpanded,
		handleToggleMember,
		loadCandidates,
		handleSaveAll,
		requestClose,
		showConfirmDialog: confirmDialog.showDialog,
		confirmDialogConfig: confirmDialog.config,
		confirmDismiss: closePanel,
	}
}
