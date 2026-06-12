import { computed, reactive, ref, type Ref } from "vue"
import type { ElevatorSyncCandidate, ElevatorSyncJob } from "~/types/elevator"
import type { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { clampOffset, getNextOffset, getPrevOffset } from "~/composables/systems/personnel/personnelList"
import { finalizeSyncWarningsForDisplay } from "~/utils/personnelUtils"
import type { SyncWarning } from "~/types/personnel"
import { useDeviceSyncObserver } from "~/composables/systems/personnel/useDeviceSyncCore"

type ElevatorApi = ReturnType<typeof useElevatorApi>

const SYNC_CANDIDATES_PAGE_SIZE = 10

export const useElevatorSyncEngine = (params: {
	elevatorApi: ElevatorApi
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canDeviceSync: Ref<boolean>
}) => {
	const { elevatorApi, toast, handleApiError, canDeviceSync } = params
	const deviceSyncObserver = useDeviceSyncObserver()

	const syncCandidatesByLocation = reactive<Record<number, ElevatorSyncCandidate[]>>({})
	const hasAccessDevicesByLocation = reactive<Record<number, boolean>>({})
	const syncCandidatesLoading = reactive<Record<number, boolean>>({})
	const syncCandidatesOffsetByLocation = reactive<Record<number, number>>({})

	const syncWarnings = ref<SyncWarning[]>([])
	const showWarningsDialog = ref(false)
	const activeSyncLocationId = ref<number | null>(null)
	const activeSyncJob = ref<ElevatorSyncJob | null>(null)
	const isPollingSyncJob = ref(false)

	const isSyncCandidatesLoading = (locationId: number) =>
		Boolean(syncCandidatesLoading[locationId])

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

	const getSyncOffset = (locationId: number) =>
		Math.max(0, Math.trunc(Number(syncCandidatesOffsetByLocation[locationId] ?? 0)))

	const setSyncOffset = (locationId: number, nextOffset: number) => {
		const total = getSyncCandidatesForLocation(locationId).length
		syncCandidatesOffsetByLocation[locationId] = clampOffset({
			offset: nextOffset,
			total,
			limit: SYNC_CANDIDATES_PAGE_SIZE,
		})
	}

	const getPagedSyncCandidates = (locationId: number) => {
		const all = getSyncCandidatesForLocation(locationId)
		const total = all.length
		const limit = SYNC_CANDIDATES_PAGE_SIZE
		const offset = clampOffset({ offset: getSyncOffset(locationId), total, limit })
		return { rows: all.slice(offset, offset + limit), total, offset, limit }
	}

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
			toast.error(`同步完成（含 ${syncWarnings.value.length} 筆警告）`)
			showWarningsDialog.value = true
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

	const accessStepShortLabel = (step?: { status?: string } | null) => {
		const status = String(step?.status || "").trim()
		if (status === "success" || status === "synced" || status === "unchanged") return "已同步"
		if (status === "failed") return "失敗"
		if (status === "no_data") return "無資料"
		return "待同步"
	}

	const accessStepPillClass = (step?: { status?: string } | null) => {
		const label = accessStepShortLabel(step)
		if (label === "已同步") return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
		if (label === "失敗") return "border-rose-400/40 bg-rose-500/15 text-rose-100"
		if (label === "無資料") return "border-white/20 bg-white/5 text-white/60"
		return "border-amber-400/40 bg-amber-500/15 text-amber-100"
	}

	const getLastSyncLabel = (candidate: ElevatorSyncCandidate) => {
		if (candidate.needs_sync) return "待同步"
		const ladderStatus = String(candidate.last_sync?.card?.status || "").trim()
		const ladderOk = ladderStatus === "success" || ladderStatus === "synced"
		const access = candidate.last_sync?.access
		const accessOk =
			!candidate.needs_access_sync &&
			(!access ||
				["user_info", "face", "card", "fingerprint"].every((key) => {
					const st = String(access[key as keyof typeof access]?.status || "").trim()
					return st === "success" || st === "unchanged" || st === "no_data"
				}))
		if (ladderOk && accessOk) return "已同步"
		if (ladderStatus === "failed") return "失敗"
		if (!candidate.has_ladder_card && candidate.needs_ladder_sync) return "無梯控卡"
		return "—"
	}

	const lastSyncPillClass = (label: string) => {
		if (label === "已同步") return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
		if (label === "失敗") return "border-rose-400/40 bg-rose-500/15 text-rose-100"
		if (label === "待同步") return "border-amber-400/40 bg-amber-500/15 text-amber-100"
		if (label === "無梯控卡") return "border-white/20 bg-white/5 text-white/60"
		return "border-white/20 bg-white/5 text-white/70"
	}

	const cardStepPillClass = (candidate: ElevatorSyncCandidate) => {
		if (!candidate.has_ladder_card) return "border-white/20 bg-white/5 text-white/60"
		const status = String(candidate.last_sync?.card?.status || "")
		if (status === "success" || status === "synced") {
			return (candidate.needs_ladder_sync ?? candidate.needs_sync)
				? "border-amber-400/40 bg-amber-500/15 text-amber-100"
				: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
		}
		if (status === "failed") return "border-rose-400/40 bg-rose-500/15 text-rose-100"
		return "border-amber-400/40 bg-amber-500/15 text-amber-100"
	}

	const cardStepLabel = (candidate: ElevatorSyncCandidate) => {
		if (!candidate.has_ladder_card) return "無資料"
		if (candidate.needs_ladder_sync ?? candidate.needs_sync) return "待同步"
		const status = String(candidate.last_sync?.card?.status || "")
		if (status === "success" || status === "synced") return "已同步"
		if (status === "failed") return "失敗"
		return "待同步"
	}

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
		accessStepShortLabel,
		accessStepPillClass,
		ensureSyncCandidates,
		isSyncCandidatesLoading,
		getPagedSyncCandidates,
		getSyncOffset,
		setSyncOffset,
		goPrevSyncPage: (locationId: number) => {
			setSyncOffset(
				locationId,
				getPrevOffset({
					offset: getSyncOffset(locationId),
					limit: SYNC_CANDIDATES_PAGE_SIZE,
				}),
			)
		},
		goNextSyncPage: (locationId: number) => {
			const total = getSyncCandidatesForLocation(locationId).length
			setSyncOffset(
				locationId,
				getNextOffset({
					offset: getSyncOffset(locationId),
					total,
					limit: SYNC_CANDIDATES_PAGE_SIZE,
				}),
			)
		},
		syncOneLocation,
		isPollingSyncJob,
		isLocationSyncJobRunning,
		isLocationSyncButtonDisabled,
		getLastSyncLabel,
		lastSyncPillClass,
		cardStepPillClass,
		cardStepLabel,
		watchApplySyncJob,
		isUiLocked,
	}
}

export type ElevatorFloorSync = ReturnType<typeof useElevatorSyncEngine>
