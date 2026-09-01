import { ref } from "vue"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { LocationLicensePlateRow } from "~/types/personnel"

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

/** 隱性推送輪詢（人流 job／車牌列狀態） */
export const useDeviceSyncObserver = () => {
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
		watchPlateStatus,
		runLocked,
	}
}

/** @deprecated 使用 useDeviceSyncObserver */
export const useImplicitDeviceSyncObserver = useDeviceSyncObserver

type SyncableLocRow = {
	id: number
	name?: string
	entry_devices?: Array<{ name?: string }>
	exit_devices?: Array<{ name?: string }>
	camera_devices?: Array<{ name?: string }>
}

/** 快取 syncable-locations 的入口／出口／攝影機設備名稱 */
export const indexSyncableLocationDevices = (
	locations: SyncableLocRow[] | undefined,
	store: Record<number, { entry: string[]; exit: string[]; cameras?: string[] }>,
	nameStore?: Record<number, string>,
) => {
	const list = Array.isArray(locations) ? locations : []
	for (const loc of list) {
		const id = Number(loc.id)
		if (!Number.isFinite(id)) continue
		const entry = Array.isArray(loc.entry_devices)
			? loc.entry_devices.map((d) => String(d?.name || "").trim()).filter(Boolean)
			: []
		const exit = Array.isArray(loc.exit_devices)
			? loc.exit_devices.map((d) => String(d?.name || "").trim()).filter(Boolean)
			: []
		const cameras = Array.isArray(loc.camera_devices)
			? loc.camera_devices.map((d) => String(d?.name || "").trim()).filter(Boolean)
			: []
		store[Math.trunc(id)] = { entry, exit, cameras }
		if (nameStore && loc.name) nameStore[Math.trunc(id)] = String(loc.name)
	}
}
