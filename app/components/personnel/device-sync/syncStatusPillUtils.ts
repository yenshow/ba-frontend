import type { SyncStepUiStatus } from "~/utils/personnelUtils"
import { lastSyncPillClass, syncStepPillClass } from "~/utils/personnelUtils"

export type SyncStatusPillVariant = "step" | "lastSync" | "plate"

export const normalizePlateSyncStatus = (status?: string | null) => {
	const raw = String(status || "").trim().toLowerCase()
	if (raw === "synced" || raw === "success") return "synced"
	if (raw === "partial") return "partial"
	if (raw === "failed") return "failed"
	if (raw === "pending") return "pending"
	return "pending"
}

const PLATE_PILL_CLASS: Record<string, string> = {
	synced: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
	pending: "border-amber-400/30 bg-amber-500/15 text-amber-100",
	partial: "border-orange-400/30 bg-orange-500/15 text-orange-100",
	failed: "border-rose-400/30 bg-rose-500/15 text-rose-100",
}

const PLATE_PILL_LABEL: Record<string, string> = {
	synced: "已同步",
	pending: "待同步",
	partial: "部分失敗",
	failed: "失敗",
}

export const resolveSyncStatusPill = (params: {
	variant: SyncStatusPillVariant
	status?: string | SyncStepUiStatus | null
	label?: string
}): { label: string; className: string } => {
	const { variant, status, label } = params

	if (variant === "lastSync") {
		const text = String(label || status || "—")
		const extraClass =
			text === "無資料" || text === "無梯控卡"
				? "border-white/20 bg-white/5 text-white/60"
				: lastSyncPillClass(text)
		return {
			label: text,
			className: `inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold 2xl:text-sm ${extraClass}`,
		}
	}

	if (variant === "plate") {
		const key = normalizePlateSyncStatus(String(status ?? ""))
		return {
			label: PLATE_PILL_LABEL[key] ?? "待同步",
			className: `inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold 2xl:text-sm ${PLATE_PILL_CLASS[key]}`,
		}
	}

	const stepStatus = (status || "no_data") as SyncStepUiStatus
	return {
		label: label ?? "",
		className: `inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold 2xl:text-sm ${syncStepPillClass(stepStatus)}`,
	}
}
