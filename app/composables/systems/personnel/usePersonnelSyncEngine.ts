import { TOAST } from "~/config/toastCatalog"
import type { Ref } from "vue"
import type {
	SyncAllLocationsJob,
	SyncLocationCandidate,
	SyncLocationJob,
	SyncLocationJobItem,
	SyncWarning,
	SyncableLocation,
} from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import {
	buildSyncPersonStepRows,
	enrichSyncWarningsWithLocation,
	finalizeSyncWarningsForDisplay,
	filterWarningsForLocation,
	isDeviceLevelSyncWarning,
} from "~/utils/personnelUtils"

export const usePersonnelSyncEngine = (params: {
	personnelApi: PersonnelApi
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canDeviceSync: Ref<boolean>
	syncableLocations: Ref<SyncableLocation[]>
}) => {
	const { personnelApi, toast, handleApiError, canDeviceSync, syncableLocations } = params

	// ---------- candidates cache + prefetch ----------
	const syncCandidatesByLocation = reactive<Record<number, SyncLocationCandidate[]>>({})
	const syncCandidatesLoading = reactive<Record<number, boolean>>({})
	const isSyncCandidatesLoading = (locationId: number) => Boolean(syncCandidatesLoading[locationId])

	const ensureSyncCandidates = async (locationId: number) => {
		syncCandidatesLoading[locationId] = true
		try {
			const res = await personnelApi.getSyncLocationCandidates(locationId)
			syncCandidatesByLocation[locationId] = res?.persons ?? []
		} catch (err) {
			handleApiError(err, "載入可同步人員失敗")
			syncCandidatesByLocation[locationId] = []
		} finally {
			syncCandidatesLoading[locationId] = false
		}
	}

	const prefetchSyncSummaries = async () => {
		const ids = syncableLocations.value.map((x) => x.id)
		const concurrency = 3
		let idx = 0
		const worker = async () => {
			for (;;) {
				const i = idx++
				if (i >= ids.length) return
				const id = ids[i]
				if (Object.prototype.hasOwnProperty.call(syncCandidatesByLocation, id)) continue
				if (syncCandidatesLoading[id]) continue
				await ensureSyncCandidates(id)
			}
		}
		await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }).map(worker))
	}

	// ---------- job polling/backoff + tail/items page ----------
	const isSyncingAll = ref(false)
	const syncWarnings = ref<SyncWarning[]>([])
	const showWarningsDialog = ref(false)
	const openWarningsDialog = () => {
		if ((syncWarnings.value || []).length <= 0) return
		showWarningsDialog.value = true
	}

	const activeSyncLocationId = ref<number | null>(null)
	const activeSyncJob = ref<SyncLocationJob | null>(null)
	const activeSyncAllJob = ref<SyncAllLocationsJob | null>(null)
	const isPollingSyncJob = ref(false)
	const activeSyncJobTailItems = ref<SyncLocationJobItem[]>([])

	/**
	 * 只用於「判斷最後同步成功/失敗」與降低 sync-candidates 的依賴：
	 * - 以本次 job completed 的 finishedAt + warnings 形成快取（per location）
	 */
	const lastCompletedSyncByLocationId = reactive<
		Record<
			number,
			{
				finishedAt: number | null
				locationRunFailure: boolean
				warningsByEmployeeNo: Record<string, true>
				processedByEmployeeNo: Record<string, true>
			}
		>
	>({})

	const waitUntilVisible = async () => {
		if (!process.client) return
		if (!document.hidden) return
		await new Promise<void>((resolve) => {
			const handler = () => {
				if (!document.hidden) {
					document.removeEventListener("visibilitychange", handler)
					resolve()
				}
			}
			document.addEventListener("visibilitychange", handler)
		})
	}

	const computeBasePollMs = (job: SyncLocationJob | null) => {
		const totalOps = Number(job?.progress?.total ?? 0)
		const target = Number(job?.progress?.targetPersonsTotal ?? 0)
		if (totalOps >= 5000 || target >= 1000) return 5000
		if (totalOps >= 2000 || target >= 500) return 4000
		return 2000
	}

	const updateLastCompletedCacheForLocation = (params: {
		locationId: number
		job: SyncLocationJob
		warnings: SyncWarning[]
		tailItems: SyncLocationJobItem[]
	}) => {
		const { locationId, job, warnings, tailItems } = params
		const byEmp: Record<string, true> = {}
		for (const w of warnings || []) {
			const emp = String(w.employeeNo || "").trim()
			if (emp) byEmp[emp] = true
		}
		const processed: Record<string, true> = {}
		for (const it of tailItems || []) {
			const emp = String(it.employeeNo || "").trim()
			if (!emp) continue
			// 只要有完成事件（success/failed/unchanged）就算「這次 job 確實處理過」
			const st = String(it.status || "").trim()
			if (st === "success" || st === "failed" || st === "unchanged") processed[emp] = true
		}
		const locationRunFailure = (warnings || []).some(isDeviceLevelSyncWarning)
		lastCompletedSyncByLocationId[locationId] = {
			finishedAt: job.finishedAt ?? null,
			locationRunFailure,
			warningsByEmployeeNo: byEmp,
			processedByEmployeeNo: processed,
		}
	}

	const pollSyncLocationJob = async (jobId: string) => {
		isPollingSyncJob.value = true
		activeSyncJobTailItems.value = []
		const startedAt = Date.now()
		let lastCompleted = -1
		let pollMs = 2000
		let tick = 0
		for (;;) {
			await waitUntilVisible()

			const job = await personnelApi.getSyncLocationJob(jobId)
			activeSyncJob.value = job

			// tail items：小 payload，供 UI 顯示逐步狀態；避免每次都拉，改成節流
			{
				tick += 1
				const shouldFetchTail = tick === 1 || tick % 2 === 0 || job.status === "completed"
				if (shouldFetchTail) {
					try {
						const page = await personnelApi.getSyncLocationJobItems(jobId, {
							type: "tail",
							limit: 200,
							offset: 0,
						})
						activeSyncJobTailItems.value = page.items ?? []
					} catch {
						// ignore tail failure; keep polling summary
					}
				}
			}

			if (job.status === "completed") {
				const rawWarnings = job.result?.warnings ?? []
				const locId = activeSyncLocationId.value
				const loc =
					locId != null ? (syncableLocations.value || []).find((x) => x.id === locId) || null : null
				const locLabel = loc ? `${loc.zone_name} / ${loc.name}` : undefined
				syncWarnings.value = enrichSyncWarningsWithLocation(rawWarnings, {
					locationId: locId ?? null,
					locationName: locLabel,
				})

				if (locId != null) {
					syncWarnings.value = await finalizeSyncWarningsForDisplay(
						syncWarnings.value,
						syncCandidatesByLocation,
						ensureSyncCandidates
					)
					updateLastCompletedCacheForLocation({
						locationId: locId,
						job,
						warnings: syncWarnings.value,
						tailItems: activeSyncJobTailItems.value ?? [],
					})
				}

				if ((syncWarnings.value || []).length > 0) {
					toast.error(TOAST.SYNC_COMPLETE_WITH_WARNINGS(syncWarnings.value.length))
					showWarningsDialog.value = true
				} else {
					toast.success(TOAST.SYNC_COMPLETE)
				}
				break
			}
			if (Date.now() - startedAt > 10 * 60 * 1000) throw new Error("同步逾時，請稍後再試")

			// backoff：
			// - 若 progress.completed 沒變：逐步拉長（最多 5s）
			// - 一旦有進度：回到 base（2~5s）
			{
				const base = computeBasePollMs(job)
				const completed = Number(job.progress?.completed ?? 0)
				if (completed === lastCompleted) {
					pollMs = Math.min(5000, Math.round(Math.max(base, pollMs) * 1.35))
				} else {
					pollMs = base
					lastCompleted = completed
				}
			}

			await new Promise((r) => setTimeout(r, pollMs))
		}
		isPollingSyncJob.value = false
	}

	const syncOneLocation = async (locationId: number) => {
		if (!canDeviceSync.value) return
		activeSyncLocationId.value = locationId
		activeSyncAllJob.value = null
		activeSyncJob.value = null
		syncWarnings.value = []
		await ensureSyncCandidates(locationId)
		try {
			const { jobId } = await personnelApi.startSyncLocationJob(locationId)
			await pollSyncLocationJob(jobId)
		} catch (err) {
			handleApiError(err, "同步失敗")
		} finally {
			isPollingSyncJob.value = false
		}
	}

	const syncAllLocations = async () => {
		if (!canDeviceSync.value) return
		isSyncingAll.value = true
		activeSyncLocationId.value = null
		activeSyncJob.value = null
		activeSyncAllJob.value = null
		syncWarnings.value = []
		try {
			const { jobId } = await personnelApi.syncAllLocations()
			const startedAt = Date.now()
			for (;;) {
				const job = await personnelApi.getSyncAllLocationsJob(jobId)
				activeSyncAllJob.value = job
				if (job.status === "completed") {
					if (job.error?.message) throw new Error(job.error.message)
					const result = job.result
					const locLabelById = new Map<number, string>()
					for (const loc of syncableLocations.value || []) {
						locLabelById.set(loc.id, `${loc.zone_name} / ${loc.name}`)
					}
					const allWarnings = (result?.results ?? []).flatMap((r) => {
						const lid = Number(r.locationId)
						return enrichSyncWarningsWithLocation(r.warnings ?? [], {
							locationId: Number.isFinite(lid) ? lid : null,
							locationName: locLabelById.get(lid) || r.locationName,
						})
					})
					syncWarnings.value = await finalizeSyncWarningsForDisplay(
						allWarnings,
						syncCandidatesByLocation,
						ensureSyncCandidates
					)
					if ((syncWarnings.value || []).length > 0) {
						toast.error(TOAST.SYNC_ALL_COMPLETE_WITH_WARNINGS(syncWarnings.value.length))
						showWarningsDialog.value = true
					} else {
						toast.success(TOAST.SYNC_ALL_COMPLETE)
					}
					break
				}
				if (Date.now() - startedAt > 10 * 60 * 1000) throw new Error("同步逾時，請稍後再試")
				await new Promise((r) => setTimeout(r, 1000))
			}
		} catch (err) {
			handleApiError(err, "同步全部失敗")
		} finally {
			isSyncingAll.value = false
		}
	}

	// ---------- step rows + paging + pill ----------
	const getItemsForLocation = (locationId: number): SyncLocationJobItem[] => {
		if (activeSyncLocationId.value === locationId && activeSyncJob.value)
			return activeSyncJobTailItems.value ?? []
		const j = activeSyncAllJob.value
		if (j?.items?.length) {
			return j.items.filter(
				(it) => it.locationId == null || Number(it.locationId) === Number(locationId)
			)
		}
		return []
	}

	const getWarningsForLocation = (locationId: number) =>
		filterWarningsForLocation(syncWarnings.value, locationId, activeSyncLocationId.value)

	const getLocationLabel = (locationId: number) => {
		const loc = (syncableLocations.value || []).find((x) => x.id === locationId) || null
		return loc ? `${loc.zone_name} / ${loc.name}` : null
	}

	const isLocationSyncJobRunning = (locationId: number): boolean => {
		if (activeSyncLocationId.value === locationId && isPollingSyncJob.value) {
			return activeSyncJob.value != null && activeSyncJob.value.status !== "completed"
		}
		if (
			isSyncingAll.value &&
			activeSyncAllJob.value &&
			activeSyncAllJob.value.status !== "completed" &&
			activeSyncAllJob.value.progress?.currentLocationId === locationId
		) {
			return true
		}
		return false
	}

	const getSyncStepRowsForLocation = (locationId: number) => {
		const candidates = syncCandidatesByLocation[locationId] ?? []
		const items = getItemsForLocation(locationId)
		const warnings = getWarningsForLocation(locationId)
		return buildSyncPersonStepRows({ candidates, items, warnings })
	}

	return {
		// candidates
		syncCandidatesByLocation,
		isSyncCandidatesLoading,
		ensureSyncCandidates,
		prefetchSyncSummaries,

		// job
		isSyncingAll,
		syncWarnings,
		showWarningsDialog,
		openWarningsDialog,
		activeSyncAllJob,
		activeSyncLocationId,
		activeSyncJob,
		isPollingSyncJob,
		activeSyncJobTailItems,
		lastCompletedSyncByLocationId,
		syncOneLocation,
		syncAllLocations,

		// rows
		getLocationLabel,
		getWarningsForLocation,
		isLocationSyncJobRunning,
		getSyncStepRowsForLocation,
	}
}
