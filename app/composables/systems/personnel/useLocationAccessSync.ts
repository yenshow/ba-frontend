import { TOAST } from "~/config/toastCatalog"
import { computed, reactive, ref, type Ref } from "vue"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { useLocationApi } from "~/composables/location/api/useLocationApi"
import {
	SYNC_WARNING_LABELS,
	findSyncCandidateByEmployeeNo,
	getOverallSyncDisplayLabel,
	resolveOverallSyncStatus,
	syncStepPillClass,
	syncStepShortLabel,
} from "~/utils/personnelUtils"
import { usePersonnelSyncEngine } from "~/composables/systems/personnel/usePersonnelSyncEngine"
import {
	clampOffset,
	getNextOffset,
	getPrevOffset,
} from "~/composables/systems/personnel/personnelList"
import { useLocationMembersOnly } from "~/composables/systems/personnel/useLocationMembersStep"
import { useDeviceSyncObserver, indexSyncableLocationDevices } from "~/composables/systems/personnel/useDeviceSyncCore"
import { enrichSyncWarningsWithLocation, finalizeSyncWarningsForDisplay } from "~/utils/personnelUtils"

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
			indexSyncableLocationDevices(res?.locations, syncDevicesByLocationId)
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

	const deviceSyncObserver = useDeviceSyncObserver()
	const isSingleLocationSyncing = computed(
		() => isPollingSyncJob.value || deviceSyncObserver.isUiLocked.value,
	)

	const membersOnly = useLocationMembersOnly({ personnelApi, toast, handleApiError })

	const applyLocationMembers = async (locationId: number) => {
		const res = await membersOnly.applyLocationMembers(locationId, { silentSuccess: true })
		if (res == null) return null

		const jobId = res.deviceSync?.jobId
		if (jobId) {
			activeSyncLocationId.value = locationId
			try {
				const job = await deviceSyncObserver.watchPersonnelJob(personnelApi, jobId, {
					onTick: (tickJob) => {
						activeSyncJob.value = tickJob
					},
				})
				const rawWarnings = job.result?.warnings ?? []
				syncWarnings.value = enrichSyncWarningsWithLocation(rawWarnings, {
					locationId,
					locationName: null,
				})
				syncWarnings.value = await finalizeSyncWarningsForDisplay(
					syncWarnings.value,
					syncCandidatesByLocation,
					ensureSyncCandidates,
				)
				if (syncWarnings.value.length > 0) {
					toast.error(TOAST.SYNC_COMPLETE_WITH_WARNINGS(syncWarnings.value.length))
					showWarningsDialog.value = true
				} else {
					toast.success(TOAST.PERSONNEL_LIST_APPLIED_SYNCED)
				}
			} catch (err) {
				handleApiError(err, "同步失敗")
			} finally {
				activeSyncLocationId.value = null
				activeSyncJob.value = null
			}
		} else {
			toast.success(TOAST.PERSONNEL_LIST_APPLIED)
		}

		await ensureSyncCandidates(locationId)
		return res
	}

	const prepareLocationDialog = async (locationId: number) => {
		await loadLocationSyncDevicesLabels()
		await membersOnly.loadAllLocationMembers(locationId)
	}

	const ensureStep2Data = async (locationId: number) => {
		await loadLocationSyncDevicesLabels()
		await ensureSyncCandidates(locationId)
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
		setSyncOffset(
			locationId,
			getPrevOffset({ offset: getSyncOffset(locationId), limit: SYNC_CANDIDATES_PAGE_SIZE })
		)
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

	const isLocationCurrentlySyncing = (locationId: number) =>
		isLocationSyncJobRunning(locationId) ||
		(deviceSyncObserver.isUiLocked.value && activeSyncLocationId.value === locationId)

	const isLocationSyncButtonDisabled = (locationId: number) => {
		if (!canDeviceSync.value) return true
		if (deviceSyncObserver.isUiLocked.value) return true
		if (isPollingSyncJob.value && activeSyncLocationId.value === locationId) return true
		if (
			isPollingSyncJob.value &&
			activeSyncLocationId.value !== null &&
			activeSyncLocationId.value !== locationId
		)
			return true
		return false
	}

	return {
		isSingleLocationSyncing,
		showWarningsDialog,
		syncWarnings,
		syncWarningTypeLabel,
		openWarningsDialog,
		loadLocationSyncDevicesLabels,
		getLocationDevicesLabel,
		prepareLocationDialog,
		ensureStep2Data,
		syncOneLocation,
		ensureSyncCandidates,
		isSyncLocationCandidatesLoading,
		getPagedSyncStepRowsForLocation,
		syncStepPillClass,
		syncStepShortLabel,
		getCandidateLastSyncLabel,
		isLocationCurrentlySyncing,
		isLocationSyncButtonDisabled,
		goPrevSyncPage,
		goNextSyncPage,
		...membersOnly,
		applyLocationMembers,
	}
}
