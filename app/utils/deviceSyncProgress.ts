import type { ElevatorSyncJob } from "~/types/elevator"
import type {
	LocationLicensePlateRow,
	SyncLocationJob,
	SyncLocationJobItem,
	SyncWarning,
} from "~/types/personnel"

/** Dialog overlay 進度（人流／車牌／梯控共用） */
export type DeviceSyncOverlayProgress = {
	/** 0–100；未知總數時為 null（顯示不確定進度） */
	percent: number | null
	/** 主文案，如「同步中 12／100」 */
	primary: string
	/** 細節：設備／工號／步驟 */
	detail: string | null
	/** 成功／失敗摘要 */
	stats: string | null
	/** 目前已知失敗／警告筆數（供「查看錯誤」） */
	failedCount: number
	/** 開始時間（ms） */
	startedAt: number | null
	/** 變更指紋：變了代表有進度（停滯偵測） */
	heartbeatKey: string
}

export const DEVICE_SYNC_STALL_MS = 150_000

/** job 尚未回傳 progress 時的佔位 */
export const buildBootSyncOverlayProgress = (
	failedCount = 0,
): DeviceSyncOverlayProgress => ({
	percent: null,
	primary: "同步中，請稍候…",
	detail: null,
	stats: null,
	failedCount: Math.max(0, failedCount),
	startedAt: null,
	heartbeatKey: `boot|${failedCount}`,
})

/** 合併 job 失敗數與已載入的 warnings 筆數 */
export const withOverlayWarningCount = (
	base: DeviceSyncOverlayProgress,
	warningCount: number,
): DeviceSyncOverlayProgress => ({
	...base,
	failedCount: Math.max(base.failedCount, Math.max(0, warningCount)),
})

export const formatSyncElapsed = (startedAt: number | null | undefined, nowMs: number): string => {
	if (startedAt == null || !Number.isFinite(startedAt) || startedAt <= 0) return ""
	const sec = Math.max(0, Math.floor((nowMs - startedAt) / 1000))
	const h = Math.floor(sec / 3600)
	const m = Math.floor((sec % 3600) / 60)
	const s = sec % 60
	if (h > 0) {
		return `已耗時 ${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
	}
	return `已耗時 ${m}:${String(s).padStart(2, "0")}`
}

const stageLabel = (stage: string | null | undefined): string | null => {
	const raw = String(stage || "").trim()
	if (!raw) return null
	if (raw === "person") return "人員"
	if (raw === "userInfo") return "使用者資訊"
	if (raw === "face") return "人臉"
	if (raw === "card") return "卡片"
	if (raw.startsWith("fingerprint")) return "指紋"
	if (raw.startsWith("batch:")) return "批次"
	return raw
}

const actionLabel = (action: string | null | undefined): string | null => {
	const raw = String(action || "").trim()
	if (!raw) return null
	if (raw === "add") return "新增"
	if (raw === "update") return "更新"
	if (raw === "delete") return "刪除"
	if (raw === "sync") return "同步"
	return raw
}

const clampPercent = (completed: number, total: number): number | null => {
	if (!Number.isFinite(total) || total <= 0) return null
	if (!Number.isFinite(completed) || completed < 0) return 0
	return Math.min(100, Math.round((completed / total) * 100))
}

/**
 * 進度顯示：以人員層 completed／total 為準。
 * 若舊 job 或估算偏差導致 completed > total，分母跟著放大，避免 896／510＋假 100%。
 */
const resolveProgressCounts = (completedRaw: number, totalRaw: number) => {
	const completed = Math.max(0, Number(completedRaw) || 0)
	const total = Math.max(0, Number(totalRaw) || 0)
	if (total <= 0 && completed <= 0) {
		return { completed: 0, total: 0, percent: null as number | null }
	}
	if (total <= 0) {
		return { completed, total: 0, percent: null as number | null }
	}
	const displayTotal = Math.max(total, completed)
	const percent = clampPercent(completed, displayTotal)
	// 仍在跑且已達／超過原估算：最多顯示 99%，留一點「還在進行」的空間
	const capped =
		completed >= total && completed > 0 ? Math.min(99, percent ?? 99) : percent
	return { completed, total: displayTotal, percent: capped }
}

export const buildPersonnelJobOverlayProgress = (
	job: SyncLocationJob | null | undefined,
): DeviceSyncOverlayProgress | null => {
	if (!job || job.status === "completed") return null
	const p = job.progress
	const completedRaw = Number(p?.completed) || 0
	const totalRaw = Number(p?.total) || 0
	const personsTotal = Number(p?.targetPersonsTotal) || 0
	const { completed, total, percent } = resolveProgressCounts(
		completedRaw,
		totalRaw > 0 ? totalRaw : personsTotal,
	)
	const succeeded = Number(p?.succeeded) || 0
	const failed = Number(p?.failed) || 0
	const skipped = Number((p as { skipped?: number } | undefined)?.skipped) || 0
	const deviceTotal = Number(p?.deviceTotal) || 0
	const deviceIndex = Number(p?.currentDeviceIndex) || 0
	const employeeNo = String(p?.currentEmployeeNo || "").trim()
	const stage = stageLabel(p?.currentStage)
	const action = actionLabel(p?.currentAction)

	const primary =
		total > 0
			? `同步中 ${completed}／${total}`
			: completed > 0
				? `同步中（已處理 ${completed}）`
				: "同步中…"

	const detailParts: string[] = []
	if (deviceTotal > 0 && deviceIndex > 0) {
		detailParts.push(`設備 ${deviceIndex}／${deviceTotal}`)
	} else if (p?.currentDeviceId != null) {
		detailParts.push(`設備 #${p.currentDeviceId}`)
	}
	if (employeeNo) detailParts.push(`工號 ${employeeNo}`)
	if (action) detailParts.push(action)
	if (stage) detailParts.push(stage)

	const statsParts: string[] = []
	if (succeeded > 0) statsParts.push(`成功 ${succeeded}`)
	if (failed > 0) statsParts.push(`失敗 ${failed}`)
	if (skipped > 0) statsParts.push(`略過 ${skipped}`)

	const issuesTotal = Number(job.itemsMeta?.issuesTotal) || 0

	return {
		percent,
		primary,
		detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
		stats: statsParts.length > 0 ? statsParts.join(" · ") : null,
		failedCount: Math.max(failed, issuesTotal),
		startedAt: job.startedAt ?? job.createdAt ?? null,
		heartbeatKey: [
			completedRaw,
			totalRaw,
			personsTotal,
			p?.currentDeviceId ?? "",
			employeeNo,
			p?.currentAction ?? "",
			p?.currentStage ?? "",
			succeeded,
			failed,
			issuesTotal,
		].join("|"),
	}
}

/** job issues items → 與「查看錯誤」Dialog 相同的 SyncWarning */
export const syncJobIssueItemsToWarnings = (
	items: SyncLocationJobItem[] | null | undefined,
	locationId?: number | null,
): SyncWarning[] => {
	const list = Array.isArray(items) ? items : []
	const locId =
		locationId != null && Number.isFinite(Number(locationId)) ? Math.trunc(Number(locationId)) : null
	const out: SyncWarning[] = []
	for (const item of list) {
		if (String(item?.status || "").trim() !== "failed") continue
		const stage = String(item.stage || "").trim()
		const action = String(item.action || "").trim()
		let type = "sync"
		if (stage === "face" || stage.startsWith("face")) type = "face"
		else if (stage === "card") type = "card"
		else if (stage.startsWith("fingerprint")) type = "fingerprint"
		else if (action === "add" || action === "update" || action === "delete") type = action

		const itemLoc =
			item.locationId != null && Number.isFinite(Number(item.locationId))
				? Math.trunc(Number(item.locationId))
				: locId

		out.push({
			type,
			employeeNo: item.employeeNo ? String(item.employeeNo) : undefined,
			deviceId: item.deviceId != null ? Number(item.deviceId) : undefined,
			message: String(item.message || "").trim() || "同步失敗",
			locationId: itemLoc,
		})
	}
	return out
}

export const buildElevatorJobOverlayProgress = (
	job: ElevatorSyncJob | null | undefined,
	options?: { startedAt?: number | null; warningCount?: number },
): DeviceSyncOverlayProgress | null => {
	if (!job || job.status === "completed") return null
	const doneRaw = Number(job.progress?.doneOps) || 0
	const totalRaw = Number(job.progress?.totalOps) || 0
	const { completed, total, percent } = resolveProgressCounts(doneRaw, totalRaw)
	const primary =
		total > 0
			? `同步中 ${completed}／${total}`
			: completed > 0
				? `同步中（已處理 ${completed}）`
				: "同步中…"

	return withOverlayWarningCount(
		{
			percent,
			primary,
			detail: null,
			stats: null,
			failedCount: 0,
			startedAt: options?.startedAt ?? null,
			heartbeatKey: `${doneRaw}|${totalRaw}|${job.status ?? ""}`,
		},
		options?.warningCount ?? 0,
	)
}

const isPendingPlateStatus = (status: unknown) =>
	String(status || "")
		.trim()
		.toLowerCase() === "pending"

export const buildPlateSyncOverlayProgress = (params: {
	rows: LocationLicensePlateRow[]
	startedAt?: number | null
}): DeviceSyncOverlayProgress => {
	const rows = Array.isArray(params.rows) ? params.rows : []
	const total = rows.length
	const pending = rows.filter((row) => isPendingPlateStatus(row.isapi_sync_status)).length
	const completed = Math.max(0, total - pending)
	const failed = rows.filter((row) => {
		const s = String(row.isapi_sync_status || "")
			.trim()
			.toLowerCase()
		return s === "failed" || s === "partial" || Boolean(row.isapi_sync_error)
	}).length
	const primary =
		total > 0
			? pending > 0
				? `車牌同步中 ${completed}／${total}（待處理 ${pending}）`
				: `車牌同步中 ${completed}／${total}`
			: "車牌同步中…"

	return {
		percent: clampPercent(completed, total),
		primary,
		detail: null,
		stats: failed > 0 ? `異常 ${failed}` : null,
		failedCount: failed,
		startedAt: params.startedAt ?? null,
		heartbeatKey: `${completed}|${total}|${pending}|${failed}`,
	}
}
