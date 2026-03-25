import type { AlertSource, AlertType, AlertSeverity } from "~/types/alert";

/** 與環境／照明監控一致：透明度脈動頻率（對應 tailwind.css `.blink-slow` / `.blink-fast`、地圖點 `.alert-dot-flash-*`） */
export type AlertFlashMode = "none" | "slow" | "fast";

/** 監控 UI 常用健康狀態（Modbus／地點狀態列舉） */
export type UiHealthStatus = "normal" | "warning" | "error";

/**
 * 健康狀態 → 閃爍節奏
 * @param whenAbsent 未帶 `status` 時：`fast` ＝監控卡片視為需強調（與 StatusCenter 一致）；`none` ＝不閃（例如平面圖點位尚未寫入狀態）
 */
export const healthStatusToAlertFlash = (
	status: UiHealthStatus | undefined | null,
	options?: { whenAbsent?: "none" | "fast" }
): AlertFlashMode => {
	const absent = options?.whenAbsent ?? "fast";
	if (status === "normal") return "none";
	if (status === "warning") return "slow";
	if (status === "error") return "fast";
	return absent === "fast" ? "fast" : "none";
};

/** 警報嚴重度（後端 Alert）→ 閃爍節奏，供環境／設備列表等複用 */
export const alertSeverityToAlertFlash = (
	severity: AlertSeverity | undefined | null
): AlertFlashMode => {
	if (severity === "warning") return "slow";
	if (severity === "error" || severity === "critical") return "fast";
	return "none";
};

/**
 * 平面圖點位（category-dot／location-dot）專用 class；需父層在 `.map-location-dots` 內
 */
export const alertFlashModeToMapDotClass = (mode: AlertFlashMode): string => {
	if (mode === "slow") return "alert-dot-flash-slow";
	if (mode === "fast") return "alert-dot-flash-fast";
	return "";
};

/**
 * 取得系統來源標籤
 */
export const getSourceLabel = (source: AlertSource | string): string => {
	const labels: Record<string, string> = {
		device: "設備",
		environment: "環境",
		lighting: "照明",
		drainage: "衛生排水",
		people_counting: "人流統計",
		hvac: "空調",
		fire: "消防",
		security: "安防"
	};
	return labels[source] || source;
};

/**
 * 取得類型標籤
 */
export const getTypeLabel = (type: AlertType | string): string => {
	const labels: Record<string, string> = {
		offline: "離線",
		error: "錯誤",
		threshold: "閾值"
	};
	return labels[type] || type;
};

/**
 * 取得嚴重程度標籤
 */
export const getSeverityLabel = (severity: AlertSeverity | string): string => {
	const labels: Record<string, string> = {
		warning: "警告",
		error: "錯誤",
		critical: "嚴重"
	};
	return labels[severity] || severity;
};

/**
 * 取得嚴重程度徽章樣式類名
 */
export const getSeverityBadgeClass = (severity: AlertSeverity | string): string => {
	const classes: Record<string, string> = {
		warning: "bg-yellow-500/80 text-white",
		error: "bg-orange-500/80 text-white",
		critical: "bg-red-500/80 text-white"
	};
	return classes[severity] || "bg-gray-500/80 text-white";
};

/**
 * 取得類型徽章樣式類名
 */
export const getTypeBadgeClass = (type: AlertType | string): string => {
	const classes: Record<string, string> = {
		offline: "bg-gray-500/80 text-white",
		error: "bg-red-500/80 text-white",
		threshold: "bg-purple-500/80 text-white"
	};
	return classes[type] || "bg-gray-500/80 text-white";
};

/** 是否已解決（僅依 status；後端無 resolved_at/resolved_by） */
export const isAlertResolved = (alert: { status?: string }): boolean =>
	alert.status === "resolved";

/** 是否已忽視 */
export const isAlertIgnored = (alert: { status?: string }): boolean =>
	alert.status === "ignored";

