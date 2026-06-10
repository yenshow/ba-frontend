import { ref } from "vue"
import type { ElevatorSyncJob } from "~/types/elevator"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"

const SYNC_TIMEOUT_MS = 10 * 60 * 1000
const BASE_POLL_MS = 2000
const MAX_POLL_MS = 5000

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

type ToastApi = { success: (msg: string) => void; error: (msg: string) => void }

export const useElevatorCardSync = (options?: {
	toast?: ToastApi
	handleError?: (err: unknown, fallbackMessage: string) => string | void | null
}) => {
	const elevatorApi = useElevatorApi()
	const isSyncing = ref(false)
	const activeJob = ref<ElevatorSyncJob | null>(null)

	const pollElevatorSyncJob = async (jobId: string): Promise<ElevatorSyncJob> => {
		const startedAt = Date.now()
		let pollMs = BASE_POLL_MS
		let lastDoneOps = -1

		for (;;) {
			await waitUntilVisible()

			const { job } = await elevatorApi.getCardSyncJob(jobId)
			activeJob.value = job

			if (job.status === "completed") {
				if (job.error) throw new Error(job.error)
				const warnings = job.result?.warnings ?? []
				if (warnings.length > 0) {
					options?.toast?.error(`同步完成（含 ${warnings.length} 筆警告）`)
				} else {
					options?.toast?.success("梯控卡片同步完成")
				}
				return job
			}

			if (Date.now() - startedAt > SYNC_TIMEOUT_MS) {
				throw new Error("同步逾時，請稍後再試")
			}

			const doneOps = Number(job.progress?.doneOps ?? 0)
			if (doneOps === lastDoneOps) {
				pollMs = Math.min(MAX_POLL_MS, Math.round(Math.max(BASE_POLL_MS, pollMs) * 1.35))
			} else {
				pollMs = BASE_POLL_MS
				lastDoneOps = doneOps
			}

			await new Promise((r) => setTimeout(r, pollMs))
		}
	}

	const syncLocationCards = async (locationId: number) => {
		isSyncing.value = true
		activeJob.value = null
		try {
			const { jobId } = await elevatorApi.startCardSyncJob(locationId)
			return await pollElevatorSyncJob(jobId)
		} catch (error) {
			options?.handleError?.(error, "梯控卡片同步失敗")
			throw error
		} finally {
			isSyncing.value = false
		}
	}

	return {
		isSyncing,
		activeJob,
		pollElevatorSyncJob,
		syncLocationCards,
	}
}
