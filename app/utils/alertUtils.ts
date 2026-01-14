import type { AlertSource, AlertType, AlertSeverity } from "~/types/alert";

/**
 * 取得系統來源標籤
 */
export const getSourceLabel = (source: AlertSource | string): string => {
	const labels: Record<string, string> = {
		device: "設備",
		environment: "環境",
		lighting: "照明",
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

/**
 * 檢查警報是否已解決
 * @param alert - 警報對象
 * @returns 是否已解決
 */
export const isAlertResolved = (alert: { status?: string; resolved?: boolean }): boolean => {
	return alert.status === "resolved" || alert.resolved === true;
};

/**
 * 檢查警報是否已忽視
 * @param alert - 警報對象
 * @returns 是否已忽視
 */
export const isAlertIgnored = (alert: { status?: string; ignored?: boolean }): boolean => {
	return alert.status === "ignored" || alert.ignored === true;
};

