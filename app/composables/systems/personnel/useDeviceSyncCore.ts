import { ref } from "vue"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import type { LocationLicensePlateRow } from "~/types/personnel"

/** 大批次含人臉寫入設備可遠超 10 分鐘 */
const SYNC_TIMEOUT_MS = 60 * 60 * 1000
const SYNC_POLL_MS = 5_000
const SYNC_WAIT_TIMEOUT_MSG = "同步等待逾時（背景可能仍在進行），請稍後重新開啟或於 Step 2 查看結果"

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

/** 隱性推送輪詢（人流 job / 梯控 job / 車牌列狀態） */
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
			onTick?: (
				job: Awaited<ReturnType<PersonnelApi["getSyncLocationJob"]>>,
			) => void | Promise<void>
		},
	) => {
		return runLocked(async () => {
			const startedAt = Date.now()
			for (;;) {
				await waitUntilVisible()
				const job = await personnelApi.getSyncLocationJob(jobId)
				await options?.onTick?.(job)
				if (job.status === "completed") {
					if (job.error) throw new Error(job.error.message || "同步失敗")
					return job
				}
				if (Date.now() - startedAt > SYNC_TIMEOUT_MS) {
					throw new Error(SYNC_WAIT_TIMEOUT_MSG)
				}
				await new Promise((r) => setTimeout(r, SYNC_POLL_MS))
			}
		})
	}

	const watchElevatorJob = async (
		elevatorApi: ReturnType<typeof useElevatorApi>,
		jobId: string,
		options?: {
			onTick?: (
				job: Awaited<ReturnType<ReturnType<typeof useElevatorApi>["getFloorSyncJob"]>>["job"],
			) => void
		},
	) => {
		return runLocked(async () => {
			const startedAt = Date.now()
			for (;;) {
				await waitUntilVisible()
				const { job } = await elevatorApi.getFloorSyncJob(jobId)
				options?.onTick?.(job)
				if (job.status === "completed") {
					if (job.error) throw new Error(job.error)
					return job
				}
				if (Date.now() - startedAt > SYNC_TIMEOUT_MS) {
					throw new Error(SYNC_WAIT_TIMEOUT_MSG)
				}
				await new Promise((r) => setTimeout(r, SYNC_POLL_MS))
			}
		})
	}

	const watchPlateStatus = async (
		personnelApi: PersonnelApi,
		locationId: number,
		options?: {
			maxRounds?: number
			onTick?: (rows: LocationLicensePlateRow[]) => void
		},
	) => {
		return runLocked(async () => {
			const startedAt = Date.now()
			let round = 0
			for (;;) {
				await waitUntilVisible()
				const res = await personnelApi.getLocationLicensePlates(locationId)
				const rows = res.items ?? []
				options?.onTick?.(rows)
				if (!hasPendingPlates(rows)) return rows
				if (Date.now() - startedAt > SYNC_TIMEOUT_MS) {
					throw new Error("車牌同步逾時，請稍後再試")
				}
				round += 1
				if (options?.maxRounds != null && round >= options.maxRounds) {
					return rows
				}
				await new Promise((r) => setTimeout(r, SYNC_POLL_MS))
			}
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
