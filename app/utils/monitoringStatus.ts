export type MonitoringStatusText = "正常" | "異常" | "警報" | "離線"

export type MonitoringUiStatus = "normal" | "abnormal" | "alarm" | "offline"

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
	if (status === "異常") return "abnormal"
	if (status === "離線") return "offline"
	return "normal"
}

export const monitoringUiStatusToBlinkClass = (
	ui: MonitoringUiStatus
): "" | "blink-slow" | "blink-fast" => {
	if (ui === "alarm") return "blink-fast"
	if (ui === "abnormal") return "blink-slow"
	return ""
}

export const monitoringUiStatusToCardBackgroundClass = (ui: MonitoringUiStatus): string => {
	if (ui === "alarm") return "bg-[#FF0000]/90"
	if (ui === "abnormal") return "bg-[#FFC801]/90"
	return "bg-white/10"
}

export const monitoringUiStatusToDotColor = (ui: MonitoringUiStatus): string => {
	if (ui === "alarm") return "#FF0000"
	if (ui === "abnormal") return "#FFC701"
	if (ui === "normal") return "#00FFB5"
	return "#9CA3AF"
}

export const monitoringUiStatusToText = (ui: MonitoringUiStatus): MonitoringStatusText => {
	if (ui === "alarm") return "警報"
	if (ui === "abnormal") return "異常"
	if (ui === "offline") return "離線"
	return "正常"
}

/** 多媒體卡片用：對應 Tailwind 背景點色 class */
export const monitoringUiStatusToDotClass = (ui: MonitoringUiStatus): string => {
	if (ui === "normal") return "bg-emerald-500"
	if (ui === "offline") return "bg-black/25"
	if (ui === "abnormal") return "bg-amber-500"
	return "bg-rose-500"
}
