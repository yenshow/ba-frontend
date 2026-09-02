import { TOAST } from "~/config/toastCatalog"
import { computed, reactive, ref, type Ref } from "vue"
import type { ElevatorSyncJob, ElevatorSyncCandidate } from "~/types/elevator"
import type { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { finalizeSyncWarningsForDisplay } from "~/utils/personnelUtils"
import type { SyncWarning } from "~/types/personnel"
import { useDeviceSyncObserver } from "~/composables/systems/personnel/useDeviceSyncCore"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import type { ElevatorSystemConfig } from "~/types/location"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"

type ElevatorApi = ReturnType<typeof useElevatorApi>

export const useElevatorSyncEngine = (params: {
	elevatorApi: ElevatorApi
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canDeviceSync: Ref<boolean>
}) => {
	const { elevatorApi, toast, handleApiError, canDeviceSync } = params
	const deviceSyncObserver = useDeviceSyncObserver()
	const locationApi = useLocationApi()
	const deviceApi = useDeviceApi()

	const syncDevicesByLocationId = reactive<Record<number, { entry: string[]; exit: string[] }>>({})
	const syncCandidatesByLocation = reactive<Record<number, ElevatorSyncCandidate[]>>({})
	const hasAccessDevicesByLocation = reactive<Record<number, boolean>>({})
	const syncCandidatesLoading = reactive<Record<number, boolean>>({})

	const syncWarnings = ref<SyncWarning[]>([])
	const showWarningsDialog = ref(false)
	const activeSyncLocationId = ref<number | null>(null)
	const activeSyncJob = ref<ElevatorSyncJob | null>(null)
	const isPollingSyncJob = ref(false)

	const isSyncCandidatesLoading = (locationId: number) =>
		Boolean(syncCandidatesLoading[locationId])

	const resolveDeviceNames = async (ids: number[]) => {
		const unique = [
			...new Set(
				(ids || [])
					.map((id) => Number(id))
					.filter((n) => Number.isFinite(n) && n > 0),
			),
		]
		if (!unique.length) return []
		return Promise.all(
			unique.map(async (id) => {
				try {
					const res = await deviceApi.getDevice(id)
					const name = String(res?.device?.name || "").trim()
					return name || `#${id}`
				} catch {
					return `#${id}`
				}
			}),
		)
	}

	const loadLocationSyncDevicesLabels = async (locationId: number) => {
		try {
			const res = await locationApi.getLocation(String(locationId))
			const elevatorSys = (res?.location?.systems || []).find(
				(sys) => sys.systemType === "elevator",
			)
			const config = elevatorSys?.config as ElevatorSystemConfig | undefined
			const ladderId = config?.ladderDevice?.deviceId
			const ladderIds = ladderId ? [ladderId] : []
			const accessIds = Array.isArray(config?.accessDeviceIds) ? config.accessDeviceIds : []
			const [entry, exit] = await Promise.all([
				resolveDeviceNames(ladderIds),
				resolveDeviceNames(accessIds),
			])
			syncDevicesByLocationId[locationId] = { entry, exit }
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

	const prepareLocationDialog = async (locationId: number) => {
		await loadLocationSyncDevicesLabels(locationId)
		await ensureSyncCandidates(locationId)
	}

	const ensureSyncCandidates = async (locationId: number) => {
		syncCandidatesLoading[locationId] = true
		try {
			const res = await elevatorApi.getSyncCandidates(locationId)
			syncCandidatesByLocation[locationId] = res?.persons ?? []
			hasAccessDevicesByLocation[locationId] = Boolean(res?.hasAccessDevices)
		} catch (err) {
			handleApiError(err, "載入可同步人員失敗")
			syncCandidatesByLocation[locationId] = []
		} finally {
			syncCandidatesLoading[locationId] = false
		}
	}

	const getSyncCandidatesForLocation = (locationId: number) =>
		syncCandidatesByLocation[locationId] ?? []

	const jobWarningsToSyncWarnings = (job: ElevatorSyncJob): SyncWarning[] =>
		(job.result?.warnings ?? []).map((w) => ({
			type: w.type,
			employeeNo: w.employeeNo,
			fullName: w.fullName ?? null,
			deviceId: w.deviceId,
			deviceName: w.deviceName ?? null,
			message: w.message ?? "",
		}))

	const finalizeCompletedJob = async (
		job: ElevatorSyncJob,
		locationId: number | null,
		options?: { successMessage?: string },
	) => {
		syncWarnings.value = await finalizeSyncWarningsForDisplay(
			jobWarningsToSyncWarnings(job),
			syncCandidatesByLocation,
			ensureSyncCandidates,
		)
		if (syncWarnings.value.length > 0) {
			toast.error(TOAST.SYNC_COMPLETE_WITH_WARNINGS(syncWarnings.value.length))
			showWarningsDialog.value = true
			if (locationId != null) await ensureSyncCandidates(locationId)
			return
		}
		const hasAccess = locationId != null && hasAccessDevicesByLocation[locationId]
		const defaultMessage = hasAccess ? "梯控與門禁設備同步完成" : "梯控設備同步完成"
		toast.success(options?.successMessage ?? defaultMessage)
		if (locationId != null) await ensureSyncCandidates(locationId)
	}

	const pollFloorSyncJob = async (jobId: string) => {
		isPollingSyncJob.value = true
		try {
			const job = await deviceSyncObserver.watchElevatorJob(elevatorApi, jobId, {
				onTick: (tickJob) => {
					activeSyncJob.value = tickJob
				},
			})
			await finalizeCompletedJob(job, activeSyncLocationId.value)
		} finally {
			isPollingSyncJob.value = false
		}
	}

	const syncOneLocation = async (locationId: number) => {
		if (!canDeviceSync.value) return
		activeSyncLocationId.value = locationId
		activeSyncJob.value = null
		syncWarnings.value = []
		await ensureSyncCandidates(locationId)
		try {
			const { jobId } = await elevatorApi.startFloorSyncJob(locationId)
			await pollFloorSyncJob(jobId)
		} catch (err) {
			handleApiError(err, "同步失敗")
		} finally {
			isPollingSyncJob.value = false
		}
	}

	const isLocationSyncJobRunning = (locationId: number) =>
		activeSyncLocationId.value === locationId &&
		isPollingSyncJob.value &&
		activeSyncJob.value != null &&
		activeSyncJob.value.status !== "completed"

	const isLocationSyncButtonDisabled = (locationId: number) => {
		if (!canDeviceSync.value) return true
		if (deviceSyncObserver.isUiLocked.value) return true
		if (isPollingSyncJob.value && activeSyncLocationId.value === locationId) return true
		if (
			isPollingSyncJob.value &&
			activeSyncLocationId.value !== null &&
			activeSyncLocationId.value !== locationId
		) {
			return true
		}
		return false
	}

	const syncWarningTypeLabel = (type: string) => {
		const map: Record<string, string> = {
			skip_no_card: "未設定卡號",
			skip_no_ladder_floors: "未設定梯控授權樓層",
			skip_no_floors: "未授權樓層",
			sync_failed: "同步失敗",
			delete_failed: "刪除失敗",
		}
		return map[type] ?? type
	}

	const openWarningsDialog = () => {
		if (syncWarnings.value.length <= 0) return
		showWarningsDialog.value = true
	}

	const hasAccessDevicesForLocation = (locationId: number) =>
		Boolean(hasAccessDevicesByLocation[locationId])

	const watchApplySyncJob = async (locationId: number, jobId: string) => {
		activeSyncLocationId.value = locationId
		try {
			const job = await deviceSyncObserver.watchElevatorJob(elevatorApi, jobId, {
				onTick: (tickJob) => {
					activeSyncJob.value = tickJob
				},
			})
			const hasAccess = hasAccessDevicesForLocation(locationId)
			await finalizeCompletedJob(job, locationId, {
				successMessage: hasAccess
					? "已套用樓層權限並同步至設備"
					: "已套用樓層權限並同步至梯控設備",
			})
		} catch (err) {
			handleApiError(err, "同步失敗")
		} finally {
			activeSyncLocationId.value = null
			activeSyncJob.value = null
		}
	}

	const isUiLocked = computed(
		() => isPollingSyncJob.value || deviceSyncObserver.isUiLocked.value,
	)

	return {
		syncWarnings,
		showWarningsDialog,
		openWarningsDialog,
		syncWarningTypeLabel,
		hasAccessDevicesForLocation,
		getLocationDevicesLabel,
		prepareLocationDialog,
		ensureSyncCandidates,
		isSyncCandidatesLoading,
		syncOneLocation,
		isPollingSyncJob,
		isLocationSyncJobRunning,
		isLocationSyncButtonDisabled,
		watchApplySyncJob,
		isUiLocked,
		getSyncCandidatesForLocation,
	}
}

export type ElevatorFloorSync = ReturnType<typeof useElevatorSyncEngine>
