import type { ComputedRef, Ref } from "vue"
import type { useLocationAccessSync } from "~/composables/systems/personnel/useLocationAccessSync"
import { usePageSelectAll } from "~/composables/systems/personnel/usePageSelectAll"
import { groupPersonsByPersonGroup } from "~/utils/personnelUtils"
import type { Person } from "~/types/personnel"

type AccessSync = ReturnType<typeof useLocationAccessSync>
type MaybeRef<T> = Ref<T> | ComputedRef<T>

export const LOCATION_MEMBERS_PANEL_MIN_HEIGHT = "min-h-[min(360px,50vh)]"
export const SYNC_TABLE_PANEL_MIN_HEIGHT = "min-h-[320px]"

/** 地點可進出人員勾選（步驟 1）共用狀態，供門禁／車牌管理 Dialog 使用 */
export const useLocationMembersPicker = (params: {
	locationId: MaybeRef<number | null>
	accessSync: MaybeRef<AccessSync | undefined>
}) => {
	const pickerCtx = computed(() => {
		const id = unref(params.locationId)
		const sync = unref(params.accessSync)
		if (id == null || !sync) return null
		return { id, sync }
	})

	const memberCandidates = computed<Person[]>(() => {
		const ctx = pickerCtx.value
		if (!ctx) return []
		return ctx.sync.getLocationCandidatesItems(ctx.id)
	})

	const memberCandidateGroups = computed(() => groupPersonsByPersonGroup(memberCandidates.value))
	const hasMemberCandidates = computed(() => memberCandidates.value.length > 0)

	const membersQuery = computed({
		get: () => pickerCtx.value?.sync.getLocationCandidatesQuery(pickerCtx.value.id) ?? "",
		set: (v: string) => {
			const ctx = pickerCtx.value
			if (!ctx) return
			ctx.sync.setLocationCandidatesQuery(ctx.id, v)
		},
	})

	const isApplyingMembers = computed(
		() => pickerCtx.value?.sync.isLocationMembersApplying(pickerCtx.value.id) ?? false
	)

	const isLoadingMembers = computed(() => {
		const ctx = pickerCtx.value
		if (!ctx) return false
		return (
			ctx.sync.isLocationMembersLoading(ctx.id) ||
			ctx.sync.isLocationCandidatesLoading(ctx.id)
		)
	})

	const membersError = computed(
		() => pickerCtx.value?.sync.getLocationMembersError(pickerCtx.value.id) ?? null
	)

	const membersSuccess = computed(
		() => pickerCtx.value?.sync.getLocationMembersSuccess(pickerCtx.value.id) ?? null
	)

	const isMemberKept = (personId: number) =>
		pickerCtx.value?.sync.isLocationMemberKept(pickerCtx.value.id, personId) ?? false

	const toggleMember = (personId: number, e: Event) => {
		const ctx = pickerCtx.value
		if (!ctx) return
		ctx.sync.toggleKeepLocationMember(ctx.id, personId, e)
	}

	const pageSelectAll = usePageSelectAll<Person>({
		items: memberCandidates,
		isSelected: (id) => isMemberKept(id),
		setMany: (ids, checked) => {
			const ctx = pickerCtx.value
			if (!ctx) return
			ctx.sync.toggleManyLocationMembers(ctx.id, ids, checked)
		},
	})

	const handleSearchMembers = async () => {
		const ctx = pickerCtx.value
		if (!ctx) return
		await ctx.sync.loadLocationCandidates(ctx.id)
	}

	const applyMembers = async () => {
		const ctx = pickerCtx.value
		if (!ctx) return false
		await ctx.sync.applyLocationMembers(ctx.id)
		return !ctx.sync.getLocationMembersError(ctx.id)
	}

	return {
		memberCandidateGroups,
		hasMemberCandidates,
		membersQuery,
		isApplyingMembers,
		isLoadingMembers,
		membersError,
		membersSuccess,
		isMemberKept,
		toggleMember,
		isAllMembersPageKept: pageSelectAll.isAllSelectedOnPage,
		handleToggleSelectAllMembersPage: pageSelectAll.toggleSelectAllOnPage,
		handleSearchMembers,
		applyMembers,
	}
}
