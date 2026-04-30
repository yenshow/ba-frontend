import type {
	Alert,
	AlertListResponse,
	AlertFilters,
	UnresolvedAlertCountResponse,
	AlertRule,
	CreateAlertRulePayload,
	UpdateAlertRulePayload,
	AlertRuleIntegrations,
	AlertEmailSubscriptionSmtpOverride,
	AlertEmailSmtpTestResponse
} from "~/types/alert";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

export const useAlertApi = () => {
	const { request } = useApiBase();

	/**
	 * 取得警示列表
	 */
	const getAlerts = async (filters?: AlertFilters): Promise<AlertListResponse> => {
		const path = buildPathWithQuery("/alerts", filters as Record<string, unknown>);
		return await request<AlertListResponse>(path);
	};

	/**
	 * 取得單一警示
	 */
	const getAlertById = async (id: number): Promise<{ alert: Alert }> => {
		return await request<{ alert: Alert }>(`/alerts/${id}`);
	};

	/**
	 * 標記警示為未解決（管理員專屬）
	 * 注意：警報由系統自動解決，此功能僅用於處理系統誤判或特殊情況
	 */
	const unresolveAlert = async (id: number): Promise<{ alert: Alert }> => {
		return await request<{ alert: Alert }>(`/alerts/${id}/unresolve`, {
			method: "PUT"
		});
	};

	/**
	 * 忽視/取消忽視警示的通用方法
	 */
	const toggleIgnoreAlert = async (
		sourceId: number,
		alertType: string,
		action: "ignore" | "unignore",
		source?: string,
		dimensionKey?: string
	): Promise<{ success: boolean; message: string; count: number }> => {
		const query: Record<string, unknown> = {};
		if (source) query.source = source;
		if (dimensionKey) query.dimension_key = dimensionKey;
		const path = buildPathWithQuery(`/alerts/${sourceId}/${alertType}/${action}`, query);
		return await request<{ success: boolean; message: string; count: number }>(path, {
			method: "POST"
		});
	};

	/**
	 * 忽視警示（不再顯示相同來源和類型的警示）
	 */
	const ignoreAlert = async (
		sourceId: number,
		alertType: string,
		source?: string,
		dimensionKey?: string
	): Promise<{ success: boolean; message: string; count: number }> => {
		return toggleIgnoreAlert(sourceId, alertType, "ignore", source, dimensionKey);
	};

	/**
	 * 取消忽視警示（恢復顯示相同來源和類型的警示）
	 */
	const unignoreAlert = async (
		sourceId: number,
		alertType: string,
		source?: string,
		dimensionKey?: string
	): Promise<{ success: boolean; message: string; count: number }> => {
		return toggleIgnoreAlert(sourceId, alertType, "unignore", source, dimensionKey);
	};

	/**
	 * 取得未解決的警示數量（支持時間範圍篩選）
	 */
	const getUnresolvedAlertCount = async (
		filters?: Pick<
			AlertFilters,
			| "source"
			| "source_id"
			| "exclude_sources"
			| "alert_type"
			| "severity"
			| "start_date"
			| "end_date"
			| "time_field"
		>
	): Promise<UnresolvedAlertCountResponse> => {
		const path = buildPathWithQuery("/alerts/unresolved/count", filters as Record<string, unknown>);
		return await request<UnresolvedAlertCountResponse>(path);
	};

	/**
	 * 取得警報規則（用於前端顯示狀態）
	 */
	const getAlertRules = async (
		source: string,
		alertType?: string,
		parameter?: string
	): Promise<{ rules: AlertRule[] }> => {
		const params: Record<string, unknown> = { source };
		if (alertType) params.alert_type = alertType;
		if (parameter) params.parameter = parameter;
		const path = buildPathWithQuery("/alerts/rules", params);
		return await request<{ rules: AlertRule[] }>(path);
	};

	/** 取得所有來源的警報規則（後台「全部系統」一次載入） */
	const getAllAlertRules = async (): Promise<{ rules: AlertRule[] }> => {
		return await request<{ rules: AlertRule[] }>("/alerts/rules");
	};

	/**
	 * 建立警報規則（admin/operator）
	 */
	const createAlertRule = async (payload: CreateAlertRulePayload): Promise<{ rule: AlertRule }> => {
		return await request<{ rule: AlertRule }>("/alerts/rules", {
			method: "POST",
			body: payload
		});
	};

	/**
	 * 更新警報規則（admin/operator）
	 */
	const updateAlertRule = async (
		id: number,
		payload: UpdateAlertRulePayload
	): Promise<{ rule: AlertRule }> => {
		return await request<{ rule: AlertRule }>(`/alerts/rules/${id}`, {
			method: "PUT",
			body: payload
		});
	};

	/**
	 * 刪除警報規則（admin/operator）
	 */
	const deleteAlertRule = async (id: number): Promise<{ rule: AlertRule }> => {
		return await request<{ rule: AlertRule }>(`/alerts/rules/${id}`, {
			method: "DELETE"
		});
	};

	/** 取得規則整合設定（攝影機 / Email） */
	const getAlertRuleIntegrations = async (ruleId: number): Promise<AlertRuleIntegrations> => {
		return await request<AlertRuleIntegrations>(`/alerts/rules/${ruleId}/integrations`);
	};

	/** 批次取得多規則整合設定（攝影機 / Email） */
	const getAlertRuleIntegrationsBatch = async (
		ruleIds: number[]
	): Promise<Record<number, AlertRuleIntegrations>> => {
		return await request<Record<number, AlertRuleIntegrations>>("/alerts/rules/integrations/batch", {
			method: "POST",
			body: { ruleIds }
		});
	};

	/** 更新規則整合設定（攝影機 / Email） */
	const updateAlertRuleIntegrations = async (
		ruleId: number,
		body: Partial<AlertRuleIntegrations>
	): Promise<AlertRuleIntegrations> => {
		return await request<AlertRuleIntegrations>(`/alerts/rules/${ruleId}/integrations`, {
			method: "PUT",
			body
		});
	};

	/** SMTP 測試寄信（不寫入 DB；可用 emailSubscription 覆寫目前表單設定） */
	const testAlertRuleSmtpEmail = async (
		ruleId: number,
		body: { emailSubscription?: Partial<AlertEmailSubscriptionSmtpOverride> | null } = {}
	): Promise<AlertEmailSmtpTestResponse> => {
		return await request<AlertEmailSmtpTestResponse>(`/alerts/rules/${ruleId}/email/test`, {
			method: "POST",
			body,
			timeout: 40000
		});
	};

	return {
		getAlerts,
		getAlertById,
		unresolveAlert,
		ignoreAlert,
		unignoreAlert,
		getUnresolvedAlertCount,
		getAlertRules,
		getAllAlertRules,
		createAlertRule,
		updateAlertRule,
		deleteAlertRule,
		getAlertRuleIntegrations,
		getAlertRuleIntegrationsBatch,
		updateAlertRuleIntegrations,
		testAlertRuleSmtpEmail
	};
};
