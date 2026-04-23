import type { Person, PersonGroup } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { fetchAllPaged } from "~/utils/pagingUtils"

export const usePersonnelGroupsTab = (params: {
	personnelApi: PersonnelApi
	toast: { success: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
}) => {
	const { personnelApi, toast, handleApiError } = params

	type GroupMemberPreview = { items: Person[]; total: number }

	const groups = ref<PersonGroup[]>([])
	const groupMemberPreviewByGroupId = ref<Record<number, GroupMemberPreview>>({})
	const showGroupDialog = ref(false)
	const editingGroup = ref<PersonGroup | null>(null)
	const isSubmitting = ref(false)
	const errorMessage = ref<string | null>(null)
	const groupForm = reactive({ name: "" })

	// 人員清單快取（全量）
	const allPersons = ref<Person[]>([])
	const isLoadingAllPersons = ref(false)
	const allPersonsErrorText = ref<string | null>(null)

	// 編輯群組時：目前成員
	const groupMembers = ref<Person[]>([])
	const isLoadingGroupMembers = ref(false)
	const groupMembersErrorText = ref<string | null>(null)

	const loadGroupMemberPreview = async (groupId: number) => {
		try {
			const res = await personnelApi.getPersonGroupMembers(groupId, { limit: 4, offset: 0 })
			const items = Array.isArray(res?.items) ? res.items : []
			const total = Number.isFinite(Number(res?.total)) ? Number(res.total) : items.length
			groupMemberPreviewByGroupId.value = {
				...groupMemberPreviewByGroupId.value,
				[groupId]: { items, total },
			}
		} catch {
			groupMemberPreviewByGroupId.value = {
				...groupMemberPreviewByGroupId.value,
				[groupId]: { items: [], total: 0 },
			}
		}
	}

	const loadAllGroupMemberPreviews = async () => {
		const currentGroups = groups.value
		if (currentGroups.length === 0) {
			groupMemberPreviewByGroupId.value = {}
			return
		}
		await Promise.allSettled(currentGroups.map((g) => loadGroupMemberPreview(g.id)))
	}

	const loadGroups = async () => {
		try {
			groups.value = await personnelApi.getPersonGroups()
			void loadAllGroupMemberPreviews()
		} catch (err) {
			handleApiError(err, "載入群組失敗")
			groups.value = []
			groupMemberPreviewByGroupId.value = {}
		}
	}

	const openGroupCreate = () => {
		editingGroup.value = null
		groupForm.name = ""
		errorMessage.value = null
		groupMembers.value = []
		groupMembersErrorText.value = null
		showGroupDialog.value = true
		void ensureAllPersonsLoaded({ force: true })
	}

	const editGroup = (g: PersonGroup) => {
		editingGroup.value = g
		groupForm.name = g.name
		errorMessage.value = null
		groupMembersErrorText.value = null
		showGroupDialog.value = true
		void ensureAllPersonsLoaded({ force: true })
		void loadGroupMembers(g.id)
	}

	const ensureAllPersonsLoaded = async (opts?: { force?: boolean }) => {
		allPersonsErrorText.value = null
		if (!opts?.force && allPersons.value.length > 0) return
		if (isLoadingAllPersons.value) return

		isLoadingAllPersons.value = true
		try {
			allPersons.value = await fetchAllPaged<Person>(({ limit, offset }) =>
				personnelApi.getPersons({ limit, offset, sortBy: "employeeNo", sortOrder: "asc" })
			)
		} catch (err) {
			allPersons.value = []
			allPersonsErrorText.value = err instanceof Error ? err.message : "載入人員失敗"
		} finally {
			isLoadingAllPersons.value = false
		}
	}

	const loadGroupMembers = async (groupId: number) => {
		groupMembersErrorText.value = null
		if (isLoadingGroupMembers.value) return

		isLoadingGroupMembers.value = true
		try {
			groupMembers.value = await fetchAllPaged<Person>(({ limit, offset }) =>
				personnelApi.getPersonGroupMembers(groupId, { limit, offset })
			)
		} catch (err) {
			groupMembers.value = []
			groupMembersErrorText.value = err instanceof Error ? err.message : "載入成員失敗"
		} finally {
			isLoadingGroupMembers.value = false
		}
	}

	const submitGroup = async (payload: { memberPersonIds: number[] }) => {
		isSubmitting.value = true
		errorMessage.value = null
		try {
			if (editingGroup.value) {
				const updated = await personnelApi.updatePersonGroup(editingGroup.value.id, {
					name: groupForm.name,
				})
				await personnelApi.replacePersonGroupMembers(editingGroup.value.id, payload.memberPersonIds)
				const idx = groups.value.findIndex((x) => x.id === editingGroup.value!.id)
				if (idx > -1) groups.value[idx] = updated
				toast.success("已更新群組")
				void loadGroupMemberPreview(editingGroup.value.id)
			} else {
				const created = await personnelApi.createPersonGroup({ name: groupForm.name })
				await personnelApi.replacePersonGroupMembers(created.id, payload.memberPersonIds)
				groups.value.push(created)
				toast.success("已新增群組")
				void loadGroupMemberPreview(created.id)
			}
			showGroupDialog.value = false
		} catch (err) {
			errorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗"
		} finally {
			isSubmitting.value = false
		}
	}

	const confirmDeleteGroup = async (g: PersonGroup) => {
		if (!confirm(`確定要刪除群組「${g.name}」嗎？若群組下有人員則無法刪除。`)) return
		try {
			await personnelApi.deletePersonGroup(g.id)
			groups.value = groups.value.filter((x) => x.id !== g.id)
			const { [g.id]: _removed, ...rest } = groupMemberPreviewByGroupId.value
			groupMemberPreviewByGroupId.value = rest
			toast.success("已刪除群組")
		} catch (err) {
			handleApiError(err, "刪除群組失敗")
		}
	}

	watch(showGroupDialog, (v) => {
		if (v) return
		editingGroup.value = null
		errorMessage.value = null
		groupMembers.value = []
		groupMembersErrorText.value = null
	})

	return {
		groups,
		groupMemberPreviewByGroupId,
		showGroupDialog,
		editingGroup,
		isSubmitting,
		errorMessage,
		groupForm,
		allPersons,
		isLoadingAllPersons,
		allPersonsErrorText,
		ensureAllPersonsLoaded,
		groupMembers,
		isLoadingGroupMembers,
		groupMembersErrorText,
		loadGroupMembers,
		loadGroups,
		openGroupCreate,
		editGroup,
		submitGroup,
		confirmDeleteGroup,
	}
}

