import { computed, reactive, ref, type Ref } from "vue"
import type { Person } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { useLocationApi } from "~/composables/location/api/useLocationApi"
import {
	SYNC_WARNING_LABELS,
	buildOverallSyncTitle,
	findSyncCandidateByEmployeeNo,
	getOverallSyncDisplayLabel,
	resolveOverallSyncStatus,
	syncStepPillClass,
	syncStepShortLabel,
} from "~/utils/personnelUtils"
import { usePersonnelSyncEngine } from "~/composables/systems/personnel/usePersonnelSyncEngine"
import {
	clampOffset,
	fetchAllPersonnelCandidates,
	getNextOffset,
	getPrevOffset,
} from "~/composables/systems/personnel/personnelList"

type LocationId = number

export const useLocationAccessSync = (params: {
	personnelApi: PersonnelApi
	locationApi: ReturnType<typeof useLocationApi>
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canDeviceSync: Ref<boolean>
}) => {
	const { personnelApi, locationApi, toast, handleApiError, canDeviceSync } = params

	const syncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type
	const syncDevicesByLocationId = reactive<Record<number, { entry: string[]; exit: string[] }>>({})

	const loadLocationSyncDevicesLabels = async () => {
		try {
			const res = await locationApi.getPeopleCountingSyncableLocationsWithDevices()
			const list = Array.isArray(res?.locations) ? res.locations : []
			for (const loc of list) {
				const id = Number(loc.id)
				if (!Number.isFinite(id)) continue
				const entry = Array.isArray(loc.entry_devices)
					? loc.entry_devices.map((d) => String(d?.name || "").trim()).filter(Boolean)
					: []
				const exit = Array.isArray(loc.exit_devices)
					? loc.exit_devices.map((d) => String(d?.name || "").trim()).filter(Boolean)
					: []
				syncDevicesByLocationId[Math.trunc(id)] = { entry, exit }
			}
		} catch {
			// ignore
		}
	}

	const getLocationDevicesLabel = (locationId: number) => {
		const v = syncDevicesByLocationId[locationId] || { entry: [], exit: [] }
		return {
			entry: Array.isArray(v.entry) ? v.entry : [],
			exit: Array.isArray(v.exit) ? v.exit : [],
		}
	}

	const SYNC_CANDIDATES_PAGE_SIZE = 10
	const syncCandidatesOffsetByLocation = reactive<Record<number, number>>({})

	const syncEngine = usePersonnelSyncEngine({
		personnelApi,
		toast,
		handleApiError,
		canDeviceSync,
		syncableLocations: ref([]),
	})

	const {
		syncCandidatesByLocation,
		isSyncCandidatesLoading,
		ensureSyncCandidates,
		syncWarnings,
		showWarningsDialog,
		openWarningsDialog,
		activeSyncLocationId,
		activeSyncJob,
		isPollingSyncJob,
		lastCompletedSyncByLocationId,
		syncOneLocation,
		getWarningsForLocation,
		isLocationSyncJobRunning,
		getSyncStepRowsForLocation,
	} = syncEngine

	const isSingleLocationSyncing = computed(() => isPollingSyncJob.value)

	const locationMembersLoading = reactive<Record<LocationId, boolean>>({})
	const locationMembersApplying = reactive<Record<LocationId, boolean>>({})
	const locationMembersError = reactive<Record<LocationId, string | null>>({})
	const locationMembersSuccess = reactive<Record<LocationId, string | null>>({})
	const locationMembersKeptIds = reactive<Record<LocationId, number[]>>({})

	const locationCandidatesLoading = reactive<Record<LocationId, boolean>>({})
	const locationCandidatesError = reactive<Record<LocationId, string | null>>({})
	const locationCandidatesItems = reactive<Record<LocationId, Person[]>>({})
	const locationCandidatesQuery = reactive<Record<LocationId, string>>({})

	const isLocationMembersLoading = (locationId: number) => Boolean(locationMembersLoading[locationId])
	const isLocationMembersApplying = (locationId: number) => Boolean(locationMembersApplying[locationId])
	const getLocationMembersError = (locationId: number) => (locationMembersError[locationId] || "").trim() || null
	const getLocationMembersSuccess = (locationId: number) =>
		(locationMembersSuccess[locationId] || "").trim() || null

	const getLocationMemberKeptIds = (locationId: number) => locationMembersKeptIds[locationId] ?? []
	const getLocationMembersSelectedCount = (locationId: number) => getLocationMemberKeptIds(locationId).length
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

	const isLocationCandidatesLoading = (locationId: number) => Boolean(locationCandidatesLoading[locationId])
	const getLocationCandidatesError = (locationId: number) =>
		(locationCandidatesError[locationId] || "").trim() || null
	const getLocationCandidatesItems = (locationId: number) => locationCandidatesItems[locationId] ?? []
	const getLocationCandidatesQuery = (locationId: number) => (locationCandidatesQuery[locationId] || "").trim()
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
			locationCandidatesError[locationId] = err instanceof Error ? err.message : "載入人員失敗"
		} finally {
			locationCandidatesLoading[locationId] = false
		}
	}

	const loadAllLocationMembers = async (locationId: number) => {
		locationMembersError[locationId] = null
		locationMembersSuccess[locationId] = null
		locationMembersLoading[locationId] = true
		try {
			const res = await personnelApi.getLocationMemberIds(locationId)
			const ids = Array.isArray(res?.ids) ? res.ids : []
			locationMembersKeptIds[locationId] = ids
			locationCandidatesQuery[locationId] = locationCandidatesQuery[locationId] ?? ""
			await loadLocationCandidates(locationId)
		} catch (err) {
			locationMembersKeptIds[locationId] = []
			locationMembersError[locationId] = err instanceof Error ? err.message : "載入門禁名單失敗"
		} finally {
			locationMembersLoading[locationId] = false
		}
	}

	const reloadLocationMembers = async (locationId: number) => {
		await loadAllLocationMembers(locationId)
		await ensureSyncCandidates(locationId)
	}

	const applyLocationMembers = async (locationId: number) => {
		locationMembersError[locationId] = null
		locationMembersSuccess[locationId] = null
		locationMembersApplying[locationId] = true
		try {
			const kept = getLocationMemberKeptIds(locationId)
			const next = Array.from(new Set((kept || []).map((x) => Number(x)).filter((x) => Number.isFinite(x)))).map(
				(x) => Math.trunc(x)
			)
			await personnelApi.replaceLocationMembers(locationId, next)
			locationMembersSuccess[locationId] = "已套用變更"
			await reloadLocationMembers(locationId)
		} catch (err) {
			locationMembersError[locationId] = err instanceof Error ? err.message : "套用失敗"
			handleApiError(err, "套用失敗")
		} finally {
			locationMembersApplying[locationId] = false
		}
	}

	const isSyncLocationCandidatesLoading = (locationId: number) =>
		isSyncCandidatesLoading(locationId)

	const getSyncOffset = (locationId: number) =>
		Math.max(0, Math.trunc(Number(syncCandidatesOffsetByLocation[locationId] ?? 0)))
	const setSyncOffset = (locationId: number, nextOffset: number) => {
		const total = (syncCandidatesByLocation[locationId] ?? []).length
		syncCandidatesOffsetByLocation[locationId] = clampOffset({
			offset: nextOffset,
			total,
			limit: SYNC_CANDIDATES_PAGE_SIZE,
		})
	}
	const goPrevSyncPage = (locationId: number) => {
		setSyncOffset(locationId, getPrevOffset({ offset: getSyncOffset(locationId), limit: SYNC_CANDIDATES_PAGE_SIZE }))
	}
	const goNextSyncPage = (locationId: number) => {
		const total = (syncCandidatesByLocation[locationId] ?? []).length
		setSyncOffset(
			locationId,
			getNextOffset({ offset: getSyncOffset(locationId), total, limit: SYNC_CANDIDATES_PAGE_SIZE })
		)
	}
	const getPagedSyncStepRowsForLocation = (locationId: number) => {
		const all = getSyncStepRowsForLocation(locationId)
		const total = all.length
		const limit = SYNC_CANDIDATES_PAGE_SIZE
		const offset = clampOffset({ offset: getSyncOffset(locationId), total, limit })
		const rows = all.slice(offset, offset + limit)
		return { rows, total, offset, limit }
	}

	const getSyncCandidatesForLocation = (locationId: number) =>
		Object.prototype.hasOwnProperty.call(syncCandidatesByLocation, locationId)
			? (syncCandidatesByLocation[locationId] ?? [])
			: []

	const getCandidateLastSyncLabel = (locationId: number, employeeNo: string) => {
		const cand = findSyncCandidateByEmployeeNo(getSyncCandidatesForLocation(locationId), employeeNo)
		const resolved = resolveOverallSyncStatus({
			employeeNo,
			candidate: cand,
			warnings: getWarningsForLocation(locationId),
			locationId,
			activeSyncLocationId: activeSyncLocationId.value,
			activeSyncJobStatus: activeSyncJob.value?.status ?? null,
			activeSyncJobFinishedAt: activeSyncJob.value?.finishedAt,
			lastCompletedCache: lastCompletedSyncByLocationId[locationId],
		})
		return getOverallSyncDisplayLabel(resolved, cand)
	}

	const getCandidateLastSyncTitle = (locationId: number, employeeNo: string) =>
		buildOverallSyncTitle(
			findSyncCandidateByEmployeeNo(getSyncCandidatesForLocation(locationId), employeeNo)
		)

	const isLocationCurrentlySyncing = (locationId: number) => isLocationSyncJobRunning(locationId)

	const isLocationSyncButtonDisabled = (locationId: number) => {
		if (!canDeviceSync.value) return true
		if (isPollingSyncJob.value && activeSyncLocationId.value === locationId) return true
		if (isPollingSyncJob.value && activeSyncLocationId.value !== null && activeSyncLocationId.value !== locationId)
			return true
		return false
	}

	const prepareLocationDialog = async (locationId: number) => {
		await loadLocationSyncDevicesLabels()
		await reloadLocationMembers(locationId)
	}

	return {
		SYNC_CANDIDATES_PAGE_SIZE,
		isSingleLocationSyncing,
		showWarningsDialog,
		syncWarnings,
		syncWarningTypeLabel,
		openWarningsDialog,
		loadLocationSyncDevicesLabels,
		getLocationDevicesLabel,
		prepareLocationDialog,
		syncOneLocation,
		ensureSyncCandidates,
		syncCandidatesByLocation,
		isSyncLocationCandidatesLoading,
		getSyncStepRowsForLocation,
		getPagedSyncStepRowsForLocation,
		syncStepPillClass,
		syncStepShortLabel,
		getCandidateLastSyncLabel,
		getCandidateLastSyncTitle,
		isLocationCurrentlySyncing,
		isLocationSyncButtonDisabled,
		goPrevSyncPage,
		goNextSyncPage,
		isLocationMembersLoading,
		isLocationMembersApplying,
		getLocationMembersError,
		getLocationMembersSuccess,
		getLocationMembersSelectedCount,
		isLocationMemberKept,
		toggleManyLocationMembers,
		toggleKeepLocationMember,
		isLocationCandidatesLoading,
		getLocationCandidatesError,
		getLocationCandidatesItems,
		getLocationCandidatesQuery,
		setLocationCandidatesQuery,
		loadLocationCandidates,
		applyLocationMembers,
		reloadLocationMembers,
	}
}
