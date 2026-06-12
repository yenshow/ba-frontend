import { ref } from "vue"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { LocationLicensePlateRow } from "~/types/personnel"

/** Construction 無 elevator 模組；鏡像檔僅保留型別以對齊 central API 形狀 */
type ElevatorFloorSyncJobApi = {
	getFloorSyncJob: (jobId: string) => Promise<{
		job: {
			status?: "queued" | "running" | "completed"
			error?: string | null
			progress?: { doneOps?: number; totalOps?: number }
		}
	}>
}

const SYNC_TIMEOUT_MS = 10 * 60 * 1000
const PLATE_POLL_MS = 2000

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

const hasPendingPlates = (rows: LocationLicensePlateRow[]) =>
	rows.some((row) => String(row.isapi_sync_status || "").toLowerCase() === "pending")

export const useImplicitDeviceSyncObserver = () => {
	const isUiLocked = ref(false)

	const runLocked = async <T>(task: () => Promise<T>): Promise<T> => {
		isUiLocked.value = true
		try {
			return await task()
		} finally {
			isUiLocked.value = false
		}
	}

	const watchPersonnelJob = async (
		personnelApi: PersonnelApi,
		jobId: string,
		options?: {
			onTick?: (job: Awaited<ReturnType<PersonnelApi["getSyncLocationJob"]>>) => void
		},
	) => {
		return runLocked(async () => {
			const startedAt = Date.now()
			let lastCompleted = -1
			let pollMs = 2000
			for (;;) {
				await waitUntilVisible()
				const job = await personnelApi.getSyncLocationJob(jobId)
				options?.onTick?.(job)
				if (job.status === "completed") {
					if (job.error) throw new Error(job.error.message || "同步失敗")
					return job
				}
				if (Date.now() - startedAt > SYNC_TIMEOUT_MS) {
					throw new Error("同步逾時，請稍後再試")
				}
				const completed = Number(job.progress?.completed ?? 0)
				if (completed === lastCompleted) {
					pollMs = Math.min(5000, Math.round(pollMs * 1.35))
				} else {
					pollMs = 2000
					lastCompleted = completed
				}
				await new Promise((r) => setTimeout(r, pollMs))
			}
		})
	}

	const watchElevatorJob = async (
		elevatorApi: ElevatorFloorSyncJobApi,
		jobId: string,
		options?: {
			onTick?: (job: Awaited<ReturnType<ElevatorFloorSyncJobApi["getFloorSyncJob"]>>["job"]) => void
		},
	) => {
		return runLocked(async () => {
			const startedAt = Date.now()
			let pollMs = 2000
			let lastDoneOps = -1
			for (;;) {
				await waitUntilVisible()
				const { job } = await elevatorApi.getFloorSyncJob(jobId)
				options?.onTick?.(job)
				if (job.status === "completed") {
					if (job.error) throw new Error(job.error)
					return job
				}
				if (Date.now() - startedAt > SYNC_TIMEOUT_MS) {
					throw new Error("同步逾時，請稍後再試")
				}
				const doneOps = Number(job.progress?.doneOps ?? 0)
				if (doneOps === lastDoneOps) {
					pollMs = Math.min(5000, Math.round(Math.max(2000, pollMs) * 1.35))
				} else {
					pollMs = 2000
					lastDoneOps = doneOps
				}
				await new Promise((r) => setTimeout(r, pollMs))
			}
		})
	}

	const watchPlateStatus = async (
		personnelApi: PersonnelApi,
		locationId: number,
		options?: { maxRounds?: number },
	) => {
		return runLocked(async () => {
			const startedAt = Date.now()
			const maxRounds = options?.maxRounds ?? 120
			for (let round = 0; round < maxRounds; round += 1) {
				await waitUntilVisible()
				const res = await personnelApi.getLocationLicensePlates(locationId)
				const rows = res.items ?? []
				if (!hasPendingPlates(rows)) return rows
				if (Date.now() - startedAt > SYNC_TIMEOUT_MS) {
					throw new Error("車牌同步逾時，請稍後再試")
				}
				await new Promise((r) => setTimeout(r, PLATE_POLL_MS))
			}
			const res = await personnelApi.getLocationLicensePlates(locationId)
			return res.items ?? []
		})
	}

	return {
		isUiLocked,
		watchPersonnelJob,
		watchElevatorJob,
		watchPlateStatus,
		runLocked,
	}
}
