export type MonitoringStatusText = "正常" | "異常" | "警報" | "離線"

export type MonitoringUiStatus = "normal" | "warning" | "alarm" | "offline"

export type SystemUiStatus = "normal" | "warning" | "alarm"
/** 平面圖 category-dot／location-dot 的 `data-status`，與 {@link SystemUiStatus} 一致 */
export type MapDotStatus = SystemUiStatus
export type LegacyHealthStatus = "normal" | "warning" | "error"

export const normalizeSystemUiStatus = (status: unknown): SystemUiStatus => {
	const normalized = String(status ?? "")
		.trim()
		.toLowerCase()
	if (normalized === "normal") return "normal"
	if (normalized === "warning") return "warning"
	if (normalized === "alarm") return "alarm"
	return "warning"
}

/** 後端 `/status` 單筆：與 alerts 合併後之頂層 uiStatus，以及 raw.runningAlarm 標記 */
export type SnapshotAlarmCarrier =
	| {
			uiStatus?: unknown
			raw?: Record<string, unknown> | null | undefined
	  }
	| null
	| undefined

/** 快照是否應視為「警報」層級（合併後 uiStatus=alarm，或 raw.runningAlarm） */
export const isSnapshotAlarm = (item: SnapshotAlarmCarrier): boolean => {
	if (item == null) return false
	if (normalizeSystemUiStatus(item.uiStatus) === "alarm") return true
	return item.raw?.runningAlarm === true
}

/** 合併 activeAlerts 後頂層已為 normal（避免 raw 與頂層短暫不同步誤判） */
export const isSnapshotUiNormal = (item: SnapshotAlarmCarrier): boolean =>
	item != null && normalizeSystemUiStatus(item.uiStatus) === "normal"

export const systemUiStatusToLegacyHealthStatus = (status: SystemUiStatus): LegacyHealthStatus => {
	if (status === "normal") return "normal"
	if (status === "warning") return "warning"
	return "error"
}

export const normalizeMonitoringStatusText = (
	raw: string | null | undefined
): MonitoringStatusText => {
	const s = String(raw ?? "").trim()
	if (s === "警報") return "警報"
	if (s === "異常") return "異常"
	if (s === "離線" || s === "無資料") return "離線"
	return "正常"
}

export const monitoringStatusTextToUiStatus = (
	status: MonitoringStatusText
): MonitoringUiStatus => {
	if (status === "警報") return "alarm"
	if (status === "異常") return "warning"
	if (status === "離線") return "offline"
	return "normal"
}

export const monitoringUiStatusToBlinkClass = (
	ui: MonitoringUiStatus
): "" | "blink-slow" | "blink-fast" => {
	if (ui === "alarm") return "blink-fast"
	if (ui === "warning") return "blink-slow"
	return ""
}

export const monitoringUiStatusToCardBackgroundClass = (ui: MonitoringUiStatus): string => {
	if (ui === "alarm") return "bg-[#FF0000]/90"
	if (ui === "warning") return "bg-[#FFC801]/90"
	return "bg-white/10"
}

export const monitoringUiStatusToDotColor = (ui: MonitoringUiStatus): string => {
	if (ui === "alarm") return "#FF0000"
	if (ui === "warning") return "#FFC701"
	if (ui === "normal") return "#00FFB5"
	return "#9CA3AF"
}

export const monitoringUiStatusToText = (ui: MonitoringUiStatus): MonitoringStatusText => {
	if (ui === "alarm") return "警報"
	if (ui === "warning") return "異常"
	if (ui === "offline") return "離線"
	return "正常"
}

/** 多媒體卡片用：對應 Tailwind 背景點色 class */
export const monitoringUiStatusToDotClass = (ui: MonitoringUiStatus): string => {
	if (ui === "normal") return "bg-emerald-500"
	if (ui === "offline") return "bg-black/25"
	if (ui === "warning") return "bg-amber-500"
	return "bg-rose-500"
}
