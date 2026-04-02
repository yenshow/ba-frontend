/**
 * 警報規則（與 `GET /api/alerts/rules` 對齊：未帶 `alert_type` 時後端回傳該 source 全部啟用規則）
 * 每個 `source` 只快取一筆全量結果；`getRules(source, alertType)` 可選在客端依 `alert_type` 過濾。
 * @see docs/40-contracts/api-surface.md — GET `/alerts/rules`
 */

import { useAlertApi } from "~/composables/systems/alerts/useAlertApi";
import { logger } from "~/utils/logger";
import type { AlertRule as ApiAlertRule } from "~/types/alert";

const rulesLogger = logger.createLogger("useAlertRules");

export interface AlertRule {
	id: number;
	source: string;
	alert_type: string;
	condition_type: string;
	condition_config: {
		parameter: string;
		operator: string;
		value: number;
		unit?: string;
	};
	severity: "warning" | "error" | "critical";
	message_template: string;
	enabled: boolean;
}

function normalizeApiRules(rules: ApiAlertRule[]): AlertRule[] {
	return rules.map(r => {
		const cfg = r.condition_config ?? {};
		return {
			id: Number(r.id ?? 0),
			source: String(r.source ?? ""),
			alert_type: String(r.alert_type ?? ""),
			condition_type: String(r.condition_type ?? ""),
			condition_config: {
				parameter: String((cfg as { parameter?: string }).parameter ?? ""),
				operator: String((cfg as { operator?: string }).operator ?? ""),
				value: Number((cfg as { value?: number }).value ?? 0),
				unit: cfg.unit != null ? String(cfg.unit) : undefined,
			},
			severity: (r.severity ?? "warning") as AlertRule["severity"],
			message_template: String(r.message_template ?? ""),
			enabled: Boolean(r.enabled),
		};
	});
}

export const useAlertRules = () => {
	const alertApi = useAlertApi();
	/** key = source（與 api-surface：單次全量規則一致） */
	const rulesCache = ref<Map<string, AlertRule[]>>(new Map());
	const isLoading = ref(false);

	const fetchAllRulesForSource = async (source: string): Promise<AlertRule[]> => {
		if (rulesCache.value.has(source)) {
			return rulesCache.value.get(source)!;
		}
		isLoading.value = true;
		try {
			const result = await alertApi.getAlertRules(source);
			const normalized = normalizeApiRules(result.rules ?? []);
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
	const getRules = async (source: string, alertType?: string): Promise<AlertRule[]> => {
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
		rules: AlertRule[]
	): AlertRule | null => {
		if (value === null || value === undefined) {
			return null;
		}
		const parameterRules = rules.filter(rule => rule.condition_config?.parameter === parameter);
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
			const config = rule.condition_config;
			const threshold = config.value;
			const operator = config.operator;
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
		rules: AlertRule[]
	): "正常" | "注意" | "警報" => {
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
				return "注意";
			default:
				return "正常";
		}
	};

	return {
		getRules,
		clearCache,
		evaluateParameter,
		getStatusText,
		isLoading: readonly(isLoading),
	};
};
