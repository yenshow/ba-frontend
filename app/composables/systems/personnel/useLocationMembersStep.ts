import { TOAST } from "~/config/toastCatalog"
import { reactive, type ComputedRef, type Ref } from "vue"
import type { Person } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/personnelList"
import { usePageSelectAll } from "~/composables/systems/personnel/usePageSelectAll"
import { groupPersonsByPersonGroup } from "~/utils/personnelUtils"
import { resolveFormApiError } from "~/utils/apiError"

type LocationId = number
type MaybeRef<T> = Ref<T> | ComputedRef<T>

export const LOCATION_MEMBERS_PANEL_MIN_HEIGHT = "min-h-[min(360px,50vh)]"
export const SYNC_TABLE_PANEL_MIN_HEIGHT = "min-h-[320px]"

/** 地點可進出人員（person_location_access）— Step 1 SSOT，不含設備 sync */
export const useLocationMembersOnly = (params: {
	personnelApi: PersonnelApi
	toast: { success: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
}) => {
	const { personnelApi, toast, handleApiError } = params

	const locationMembersLoading = reactive<Record<LocationId, boolean>>({})
	const locationMembersApplying = reactive<Record<LocationId, boolean>>({})
	const locationMembersError = reactive<Record<LocationId, string | null>>({})
	const locationMembersKeptIds = reactive<Record<LocationId, number[]>>({})

	const locationCandidatesLoading = reactive<Record<LocationId, boolean>>({})
	const locationCandidatesError = reactive<Record<LocationId, string | null>>({})
	const locationCandidatesItems = reactive<Record<LocationId, Person[]>>({})
	const locationCandidatesQuery = reactive<Record<LocationId, string>>({})

	const isLocationMembersLoading = (locationId: number) => Boolean(locationMembersLoading[locationId])
	const isLocationCandidatesLoading = (locationId: number) =>
		Boolean(locationCandidatesLoading[locationId])
	const isLocationMembersApplying = (locationId: number) => Boolean(locationMembersApplying[locationId])
	const getLocationMembersError = (locationId: number) =>
		(locationMembersError[locationId] || "").trim() || null
	const getLocationMemberKeptIds = (locationId: number) => locationMembersKeptIds[locationId] ?? []
	const isLocationMemberKept = (locationId: number, personId: number) =>
		getLocationMemberKeptIds(locationId).includes(personId)

	const toggleManyLocationMembers = (locationId: number, personIds: number[], checked: boolean) => {
		const current = getLocationMemberKeptIds(locationId)
		const set = new Set(current)
		for (const id of personIds || []) {
			const n = Number(id)
			if (!Number.isFinite(n)) continue
			if (checked) set.add(Math.trunc(n))
			else set.delete(Math.trunc(n))
		}
		locationMembersKeptIds[locationId] = Array.from(set)
	}

	const toggleKeepLocationMember = (locationId: number, personId: number, e: Event) => {
		const checked = (e.target as HTMLInputElement | null)?.checked ?? false
		const current = getLocationMemberKeptIds(locationId)
		const set = new Set(current)
		if (checked) set.add(personId)
		else set.delete(personId)
		locationMembersKeptIds[locationId] = Array.from(set)
	}

	const getLocationCandidatesItems = (locationId: number) => locationCandidatesItems[locationId] ?? []
	const getLocationCandidatesQuery = (locationId: number) =>
		(locationCandidatesQuery[locationId] || "").trim()
	const setLocationCandidatesQuery = (locationId: number, next: string) => {
		locationCandidatesQuery[locationId] = String(next || "")
	}

	const loadLocationCandidates = async (locationId: number) => {
		locationCandidatesError[locationId] = null
		locationCandidatesLoading[locationId] = true
		try {
			const all = await fetchAllPersonnelCandidates({
				personnelApi,
				query: getLocationCandidatesQuery(locationId),
			})
			locationCandidatesItems[locationId] = Array.isArray(all) ? all : []
		} catch (err) {
			locationCandidatesItems[locationId] = []
			locationCandidatesError[locationId] =
				err instanceof Error ? err.message : "載入人員清單失敗"
		} finally {
			locationCandidatesLoading[locationId] = false
		}
	}

	const loadAllLocationMembers = async (locationId: number) => {
		locationMembersError[locationId] = null
		locationMembersLoading[locationId] = true
		try {
			const res = await personnelApi.getLocationMemberIds(locationId)
			const ids = Array.isArray(res?.ids) ? res.ids : []
			locationMembersKeptIds[locationId] = ids
			locationCandidatesQuery[locationId] = locationCandidatesQuery[locationId] ?? ""
			await loadLocationCandidates(locationId)
		} catch (err) {
			locationMembersKeptIds[locationId] = []
			locationMembersError[locationId] =
				err instanceof Error ? err.message : "載入地點名單失敗"
		} finally {
			locationMembersLoading[locationId] = false
		}
	}

	const applyLocationMembers = async (
		locationId: number,
		options?: { silentSuccess?: boolean },
	) => {
		locationMembersError[locationId] = null
		locationMembersApplying[locationId] = true
		try {
			const kept = getLocationMemberKeptIds(locationId)
			const next = Array.from(
				new Set((kept || []).map((x) => Number(x)).filter((x) => Number.isFinite(x))),
			).map((x) => Math.trunc(x))
			const res = await personnelApi.replaceLocationMembers(locationId, next)
			if (!options?.silentSuccess) toast.success(TOAST.PERSONNEL_LIST_APPLIED)
			await loadAllLocationMembers(locationId)
			return res
		} catch (err) {
			locationMembersError[locationId] = resolveFormApiError(err, "套用失敗")
			handleApiError(err, "套用失敗")
			return null
		} finally {
			locationMembersApplying[locationId] = false
		}
	}

	const prepareLocationDialog = async (locationId: number) => {
		await loadAllLocationMembers(locationId)
	}

	return {
		prepareLocationDialog,
		isLocationMembersLoading,
		isLocationCandidatesLoading,
		isLocationMembersApplying,
		getLocationMembersError,
		isLocationMemberKept,
		toggleManyLocationMembers,
		toggleKeepLocationMember,
		getLocationCandidatesItems,
		getLocationCandidatesQuery,
		setLocationCandidatesQuery,
		loadLocationCandidates,
		loadAllLocationMembers,
		applyLocationMembers,
	}
}

export type LocationMembersSync = ReturnType<typeof useLocationMembersOnly>

export type LocationMembersPickerSync = Pick<
	LocationMembersSync,
	| "getLocationCandidatesItems"
	| "getLocationCandidatesQuery"
	| "setLocationCandidatesQuery"
	| "isLocationMembersApplying"
	| "isLocationMembersLoading"
	| "isLocationCandidatesLoading"
	| "getLocationMembersError"
	| "isLocationMemberKept"
	| "toggleKeepLocationMember"
	| "toggleManyLocationMembers"
	| "loadLocationCandidates"
> & {
	applyLocationMembers: (locationId: number) => Promise<unknown | null>
}

/** Step 1 名單勾選 UI（注入 accessSync / plateSync） */
export const useLocationMembersPicker = (params: {
	locationId: MaybeRef<number | null>
	membersSync: MaybeRef<LocationMembersPickerSync | undefined>
}) => {
	const pickerCtx = computed(() => {
		const id = unref(params.locationId)
		const sync = unref(params.membersSync)
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
		() => pickerCtx.value?.sync.isLocationMembersApplying(pickerCtx.value.id) ?? false,
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
		() => pickerCtx.value?.sync.getLocationMembersError(pickerCtx.value.id) ?? null,
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
		const res = await ctx.sync.applyLocationMembers(ctx.id)
		return res != null && !ctx.sync.getLocationMembersError(ctx.id)
	}

	return {
		memberCandidateGroups,
		hasMemberCandidates,
		membersQuery,
		isApplyingMembers,
		isLoadingMembers,
		membersError,
		isMemberKept,
		toggleMember,
		isAllMembersPageKept: pageSelectAll.isAllSelectedOnPage,
		handleToggleSelectAllMembersPage: pageSelectAll.toggleSelectAllOnPage,
		handleSearchMembers,
		applyMembers,
	}
}
