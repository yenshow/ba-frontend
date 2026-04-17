/**
 * 警報規則（與 `GET /api/alerts/rules` 對齊：未帶 `alert_type` 時後端回傳該 source 全部啟用規則）
 * 每個 `source` 只快取一筆全量結果；`getRules(source, alertType)` 可選在客端依 `alert_type` 過濾。
 * @see docs/40-contracts/api-surface.md — GET `/alerts/rules`
 */

import { useAlertApi } from "~/composables/systems/alerts/useAlertApi";
import { logger } from "~/utils/logger";
import type { AlertRule as ApiAlertRule, AlertSeverity, AlertType } from "~/types/alert";

const rulesLogger = logger.createLogger("useAlertRules");

type ThresholdConfig = {
	parameter?: string;
	operator?: string;
	value?: number;
	unit?: string;
};

const normalizeRules = (rules: ApiAlertRule[]): ApiAlertRule[] =>
	(rules || []).map(r => ({
		...r,
		id: Number(r.id ?? 0),
		enabled: Boolean(r.enabled),
		severity: (r.severity ?? "warning") as AlertSeverity,
		alert_type: (r.alert_type ?? "threshold") as AlertType,
		condition_config: (r.condition_config ?? null) as ApiAlertRule["condition_config"]
	}));

export const useAlertRules = () => {
	const alertApi = useAlertApi();
	/** key = source（與 api-surface：單次全量規則一致） */
	const rulesCache = ref<Map<string, ApiAlertRule[]>>(new Map());
	const isLoading = ref(false);

	const fetchAllRulesForSource = async (source: string): Promise<ApiAlertRule[]> => {
		if (rulesCache.value.has(source)) {
			return rulesCache.value.get(source)!;
		}
		isLoading.value = true;
		try {
			const result = await alertApi.getAlertRules(source);
			const normalized = normalizeRules(result.rules ?? []);
			rulesCache.value.set(source, normalized);
			return normalized;
		} catch (error) {
			rulesLogger.error("獲取警報規則失敗", { error, source });
			return [];
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * @param alertType 若指定，於客端篩選（仍只發一次全量 REST 請求）
	 */
	const getRules = async (source: string, alertType?: string): Promise<ApiAlertRule[]> => {
		const all = await fetchAllRulesForSource(source);
		if (alertType == null || alertType === "") {
			return all;
		}
		return all.filter(r => r.alert_type === alertType);
	};

	const clearCache = (source?: string) => {
		if (source) {
			rulesCache.value.delete(source);
			return;
		}
		rulesCache.value.clear();
	};

	const evaluateParameter = (
		parameter: string,
		value: number | null,
		rules: ApiAlertRule[]
	): ApiAlertRule | null => {
		if (value === null || value === undefined) {
			return null;
		}
		const parameterRules = rules.filter(rule => {
			const cfg = (rule.condition_config || {}) as ThresholdConfig;
			return String(cfg.parameter ?? "") === parameter;
		});
		if (parameterRules.length === 0) {
			return null;
		}
		const severityOrder = { critical: 1, error: 2, warning: 3 };
		parameterRules.sort((a, b) => {
			const orderA = severityOrder[a.severity] || 999;
			const orderB = severityOrder[b.severity] || 999;
			return orderA - orderB;
		});
		for (const rule of parameterRules) {
			const config = (rule.condition_config || {}) as ThresholdConfig;
			const threshold = Number(config.value ?? NaN);
			const operator = String(config.operator ?? "");
			if (!Number.isFinite(threshold)) {
				continue;
			}
			let matched = false;
			switch (operator) {
				case ">":
					matched = value > threshold;
					break;
				case ">=":
					matched = value >= threshold;
					break;
				case "<":
					matched = value < threshold;
					break;
				case "<=":
					matched = value <= threshold;
					break;
				default:
					matched = false;
			}
			if (matched) {
				return rule;
			}
		}
		return null;
	};

	const getStatusText = (
		parameter: string,
		value: number | null,
		rules: ApiAlertRule[]
	): "正常" | "異常" | "警報" => {
		if (value === null || value === undefined) {
			return "正常";
		}
		const matchedRule = evaluateParameter(parameter, value, rules);
		if (!matchedRule) {
			return "正常";
		}
		switch (matchedRule.severity) {
			case "critical":
			case "error":
				return "警報";
			case "warning":
				return "異常";
			default:
				return "正常";
		}
	};

	return {
		getRules,
		clearCache,
		evaluateParameter,
		getStatusText,
		isLoading: readonly(isLoading)
	};
};
