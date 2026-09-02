import { TOAST } from "~/config/toastCatalog"
import { computed, reactive, ref, type Ref } from "vue"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { useLocationApi } from "~/composables/location/api/useLocationApi"
import { SYNC_WARNING_LABELS } from "~/utils/personnelUtils"
import { usePersonnelSyncEngine } from "~/composables/systems/personnel/usePersonnelSyncEngine"
import { useLocationMembersOnly } from "~/composables/systems/personnel/useLocationMembersStep"
import { useDeviceSyncObserver, indexSyncableLocationDevices } from "~/composables/systems/personnel/useDeviceSyncCore"
import { enrichSyncWarningsWithLocation, finalizeSyncWarningsForDisplay } from "~/utils/personnelUtils"

export const useLocationAccessSync = (params: {
	personnelApi: PersonnelApi
	locationApi: ReturnType<typeof useLocationApi>
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canDeviceSync: Ref<boolean>
}) => {
	const { personnelApi, locationApi, toast, handleApiError, canDeviceSync } = params

	const syncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type
	const syncDevicesByLocationId = reactive<
		Record<number, { entry: string[]; exit: string[]; cameras?: string[] }>
	>({})

	const loadLocationSyncDevicesLabels = async () => {
		try {
			const res = await locationApi.getPeopleCountingSyncableLocationsWithDevices()
			indexSyncableLocationDevices(res?.locations, syncDevicesByLocationId)
		} catch {
			// ignore
		}
	}

	const getLocationDevicesLabel = (locationId: number) => {
		const v = syncDevicesByLocationId[locationId] || { entry: [], exit: [], cameras: [] }
		return {
			entry: Array.isArray(v.entry) ? v.entry : [],
			exit: Array.isArray(v.exit) ? v.exit : [],
			cameras: Array.isArray(v.cameras) ? v.cameras : [],
		}
	}

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
		syncOneLocation,
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
		await Promise.all([
			membersOnly.loadAllLocationMembers(locationId),
			ensureSyncCandidates(locationId),
		])
	}

	const getSyncRowByEmployeeNo = (locationId: number, employeeNo: string) => {
		const rows = getSyncStepRowsForLocation(locationId)
		return rows.find((r) => String(r.employeeNo) === String(employeeNo)) ?? null
	}

	const isSyncLocationCandidatesLoading = (locationId: number) =>
		isSyncCandidatesLoading(locationId)

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
		getLocationDevicesLabel,
		prepareLocationDialog,
		syncOneLocation,
		isSyncLocationCandidatesLoading,
		isLocationCurrentlySyncing,
		isLocationSyncButtonDisabled,
		getSyncRowByEmployeeNo,
		getSyncStepRowsForLocation,
		...membersOnly,
		applyLocationMembers,
	}
}
