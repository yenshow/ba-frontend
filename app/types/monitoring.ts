export type SystemUiStatus = "normal" | "warning" | "alarm"
export type LegacyHealthStatus = "normal" | "warning" | "error"

export const normalizeSystemUiStatus = (status: unknown): SystemUiStatus => {
	const normalized = String(status ?? "").trim().toLowerCase()
	if (normalized === "normal") return "normal"
	if (normalized === "warning") return "warning"
	if (normalized === "alarm") return "alarm"
	// unknown / abnormal / empty 一律收斂為 warning，避免 UI 出現不一致狀態
	return "warning"
}

export const systemUiStatusToLegacyHealthStatus = (status: SystemUiStatus): LegacyHealthStatus => {
	if (status === "normal") return "normal"
	if (status === "warning") return "warning"
	return "error"
}
