/**
 * 警報規則管理 Composable
 * 用於獲取和管理警報規則，確保前後端一致
 */

import { useAlertApi } from "~/composables/systems/useAlertApi";

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

/**
 * 使用警報規則
 */
export const useAlertRules = () => {
	const alertApi = useAlertApi();

	// 規則緩存（key: source, value: rules）
	const rulesCache = ref<Map<string, AlertRule[]>>(new Map());

	// 載入狀態
	const isLoading = ref(false);

	/**
	 * 獲取警報規則（帶緩存）
	 */
	const getRules = async (source: string, alertType: string = "threshold"): Promise<AlertRule[]> => {
		const cacheKey = `${source}:${alertType}`;

		// 檢查緩存
		if (rulesCache.value.has(cacheKey)) {
			return rulesCache.value.get(cacheKey)!;
		}

		// 載入規則
		isLoading.value = true;
		try {
			const result = await alertApi.getAlertRules(source, alertType);
			const rules = (result.rules || []) as AlertRule[];
			
			// 存入緩存
			rulesCache.value.set(cacheKey, rules);
			
			return rules;
		} catch (error) {
			console.error("[useAlertRules] 獲取警報規則失敗:", error);
			return [];
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * 清除緩存
	 */
	const clearCache = (source?: string) => {
		if (source) {
			// 清除特定來源的緩存
			for (const key of rulesCache.value.keys()) {
				if (key.startsWith(`${source}:`)) {
					rulesCache.value.delete(key);
				}
			}
		} else {
			// 清除所有緩存
			rulesCache.value.clear();
		}
	};

	/**
	 * 評估參數值是否符合規則
	 * @param parameter - 參數名稱（如 "pm25", "pm10"）
	 * @param value - 參數值
	 * @param rules - 規則列表
	 * @returns 匹配的規則（最嚴重的那個），如果沒有匹配則返回 null
	 */
	const evaluateParameter = (
		parameter: string,
		value: number | null,
		rules: AlertRule[]
	): AlertRule | null => {
		if (value === null || value === undefined) {
			return null;
		}

		// 過濾出該參數的規則
		const parameterRules = rules.filter(
			rule => rule.condition_config?.parameter === parameter
		);

		if (parameterRules.length === 0) {
			return null;
		}

		// 按嚴重程度排序（critical < error < warning）
		const severityOrder = { critical: 1, error: 2, warning: 3 };
		parameterRules.sort((a, b) => {
			const orderA = severityOrder[a.severity] || 999;
			const orderB = severityOrder[b.severity] || 999;
			return orderA - orderB;
		});

		// 檢查每個規則，返回第一個匹配的（最嚴重的）
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

	/**
	 * 根據規則獲取狀態文字
	 * @param parameter - 參數名稱
	 * @param value - 參數值
	 * @param rules - 規則列表
	 * @returns 狀態文字（"正常" | "注意" | "警報"）
	 */
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

		// 根據嚴重程度返回狀態
		switch (matchedRule.severity) {
			case "critical":
				return "警報";
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
		evaluateParameter, // 保留用於未來可能的擴展
		getStatusText,
		isLoading: readonly(isLoading)
	};
};

