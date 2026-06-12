import { reactive } from "vue"
import type { Person } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { fetchAllPersonnelCandidates } from "~/composables/systems/personnel/personnelList"
import { resolveFormApiError } from "~/utils/errorUtils"

type LocationId = number

/** 地點可進出人員（person_location_access）— 不含人流設備 sync engine */
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

	const applyLocationMembers = async (locationId: number) => {
		locationMembersError[locationId] = null
		locationMembersApplying[locationId] = true
		try {
			const kept = getLocationMemberKeptIds(locationId)
			const next = Array.from(
				new Set((kept || []).map((x) => Number(x)).filter((x) => Number.isFinite(x)))
			).map((x) => Math.trunc(x))
			await personnelApi.replaceLocationMembers(locationId, next)
			toast.success("已套用變更")
			await loadAllLocationMembers(locationId)
		} catch (err) {
			locationMembersError[locationId] = resolveFormApiError(err, "套用失敗")
			handleApiError(err, "套用失敗")
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
