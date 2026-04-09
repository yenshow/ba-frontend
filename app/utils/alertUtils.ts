import type { AlertSource, AlertType, AlertSeverity } from "~/types/alert";
import type { SystemType } from "~/types/location";

/** 與後端 MESSAGE_TEMPLATE_KEYS 對齊（僅供 inferRuleTemplateKeyFromAlertType） */
const RULE_CANONICAL_TEMPLATE_KEY_BY_ALERT_TYPE: Partial<Record<AlertType, string>> = {
	threshold: "rule.threshold.v1",
	offline: "rule.offline.v1",
	di: "rule.di.v1",
	do: "rule.do.v1",
};

/** 表單未勾選自訂時的預設模板字串（須與後端 CANONICAL_TEMPLATES 一致；`location_label` = 來源顯示名 + 目標後綴） */
const CANONICAL_RULE_MESSAGE_BODY: Partial<Record<AlertType, string>> = {
	threshold:
		"{location_label} {parameter_name} {operator} {threshold}{unit}（當前 {current_value}{unit}）",
	offline: "{location_label} 連續 {error_count} 次無法連接",
	di: "{location_label} DI 位址 {di_address} 觸發",
	do: "{location_label} DO 位址 {do_address} 觸發",
};

export const getDefaultRuleMessageTemplate = (alertType: AlertType): string =>
	CANONICAL_RULE_MESSAGE_BODY[alertType] ?? CANONICAL_RULE_MESSAGE_BODY.threshold!;

export const inferRuleTemplateKeyFromAlertType = (alertType: AlertType): string =>
	RULE_CANONICAL_TEMPLATE_KEY_BY_ALERT_TYPE[alertType] ?? "rule.threshold.v1";

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
		power: "電力",
		fire: "消防",
		emergency_rescue: "緊急求救",
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
		threshold: "閾值",
		di: "DI",
		do: "DO",
	};
	return labels[type] || type;
};

/**
 * 取得嚴重程度標籤（Central 統一用語：異常／警報，與規則表單「狀態」一致）
 * API 仍為 `warning` / `critical` / `error`；`error` 與 `critical` 同列為「警報」層級。
 */
export const getSeverityLabel = (severity: AlertSeverity | string): string => {
	const labels: Record<string, string> = {
		warning: "異常",
		error: "警報",
		critical: "警報",
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
		threshold: "bg-purple-500/80 text-white",
		di: "bg-emerald-500/80 text-white",
		do: "bg-sky-500/80 text-white",
	};
	return classes[type] || "bg-gray-500/80 text-white";
};

/** 是否已解決（僅依 status；後端無 resolved_at/resolved_by） */
export const isAlertResolved = (alert: { status?: string }): boolean =>
	alert.status === "resolved";

/** 是否已忽視 */
export const isAlertIgnored = (alert: { status?: string }): boolean =>
	alert.status === "ignored";

/** 後端 evaluateThreshold 允許的 operator（不支援 = / ==） */
export const ALLOWED_THRESHOLD_OPERATORS = [">", ">=", "<", "<="] as const;

export const isAllowedThresholdOperator = (operator: string | undefined | null): boolean => {
	const op = String(operator ?? "").trim();
	return (ALLOWED_THRESHOLD_OPERATORS as readonly string[]).includes(op);
};

/**
 * 與後端 getThresholdOperatorDisplayLabel 一致：訊息／列表顯示「超過」「低於」
 */
export const getThresholdOperatorDisplayLabel = (operator: string | undefined | null): string => {
	const op = String(operator ?? "").trim();
	if (op === ">" || op === ">=") return "超過";
	if (op === "<" || op === "<=") return "低於";
	return "";
};

/** 與後端 getParameterDisplayName 對齊（警報條件列表用） */
export const getAlertParameterDisplayName = (parameter: string | undefined | null): string => {
	const code = String(parameter ?? "").trim();
	if (!code) return "-";
	const displayNames: Record<string, string> = {
		pm25: "PM2.5",
		pm10: "PM10",
		tvoc: "TVOC",
		hcho: "HCHO",
		humidity: "濕度",
		temperature: "溫度",
		co2: "CO2",
		noise: "噪音值",
		wind: "風速"
	};
	return displayNames[code] || code.toUpperCase();
};

/** 列表欄位用：與 canonical 訊息本體一致（不含來源／區域前綴，該欄由「目標」呈現） */
export type AlertRuleConditionDisplayInput = {
	alert_type?: string;
	condition_type?: string;
	condition_config?: Record<string, unknown> | null;
};

export const formatAlertRuleConditionDisplay = (rule: AlertRuleConditionDisplayInput): string => {
	const config = (rule.condition_config || {}) as Record<string, unknown>;
	const ct = rule.condition_type;

	if (ct === "threshold") {
		const parameter = getAlertParameterDisplayName(String(config.parameter || ""));
		const opLabel = getThresholdOperatorDisplayLabel(String(config.operator || ""));
		const value = String(config.value ?? "-");
		const unit = String(config.unit || "").trim();
		const opPart = opLabel || String(config.operator || "").trim() || "-";
		const line = `${parameter} ${opPart} ${value}${unit ? ` ${unit}` : ""}`;
		return line.replace(/\s+/g, " ").trim();
	}

	if (ct === "error_count") {
		const raw = config.min_errors;
		const n = raw != null && raw !== "" ? Number(raw) : 5;
		const count = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 5;
		return `連續 ${count} 次無法連接`;
	}

	if (ct === "bit_state") {
		const bitKey = String(config.bit_key ?? "");
		const match = bitKey.match(/^(di|do):(\d+)$/i);
		const addr = match?.[2] ?? (bitKey.replace(/^(di|do):/i, "").trim() || "?");
		const isDo =
			rule.alert_type === "do" || String(match?.[1] ?? "").toLowerCase() === "do";
		return `${isDo ? "DO" : "DI"} 位址 ${addr} 觸發`;
	}

	return "-";
};

const SOURCE_SYSTEM_TYPE_MAP: Partial<Record<AlertSource, SystemType>> = {
	environment: "environment",
	lighting: "lighting",
	drainage: "drainage",
	fire: "fire",
	emergency_rescue: "emergency_rescue",
	people_counting: "people_counting",
	hvac: "hvac",
	power: "power",
};

export const alertSourceToSystemType = (source: AlertSource): SystemType | null =>
	SOURCE_SYSTEM_TYPE_MAP[source] ?? null;
