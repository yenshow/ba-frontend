import type {
	Alert,
	AlertListResponse,
	AlertFilters,
	UnresolvedAlertCountResponse,
	AlertRule,
	CreateAlertRulePayload,
	UpdateAlertRulePayload,
	AlertLinkage,
	CreateAlertLinkagePayload,
	UpdateAlertLinkagePayload,
	ManualOffDoOutputPayload,
	ManualOffDoOutputResponse,
	ReleaseManualOffOverridePayload,
	ReleaseManualOffOverrideResponse
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
		return await request<{ success: boolean; message: string; count: number }>(path, { method: "POST" });
	};

	/**
	 * 忽視警示（不再顯示相同來源和類型的警示）
	 */
	const ignoreAlert = async (sourceId: number, alertType: string, source?: string, dimensionKey?: string): Promise<{ success: boolean; message: string; count: number }> => {
		return toggleIgnoreAlert(sourceId, alertType, "ignore", source, dimensionKey);
	};

	/**
	 * 取消忽視警示（恢復顯示相同來源和類型的警示）
	 */
	const unignoreAlert = async (sourceId: number, alertType: string, source?: string, dimensionKey?: string): Promise<{ success: boolean; message: string; count: number }> => {
		return toggleIgnoreAlert(sourceId, alertType, "unignore", source, dimensionKey);
	};

	/**
	 * 取得未解決的警示數量（支持時間範圍篩選）
	 */
	const getUnresolvedAlertCount = async (filters?: Pick<AlertFilters, "source" | "source_id" | "exclude_sources" | "alert_type" | "severity" | "start_date" | "end_date">): Promise<UnresolvedAlertCountResponse> => {
		const path = buildPathWithQuery("/alerts/unresolved/count", filters as Record<string, unknown>);
		return await request<UnresolvedAlertCountResponse>(path);
	};

	/**
	 * 取得警報規則（用於前端顯示狀態）
	 */
	const getAlertRules = async (source: string, alertType?: string, parameter?: string): Promise<{ rules: AlertRule[] }> => {
		const params: Record<string, unknown> = { source };
		if (alertType) params.alert_type = alertType;
		if (parameter) params.parameter = parameter;
		const path = buildPathWithQuery("/alerts/rules", params);
		return await request<{ rules: AlertRule[] }>(path);
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

	/** 規則訊息預覽（canonical 模板 + 範例變數，不寫入 DB） */
	const previewAlertRuleMessage = async (
		body: Record<string, unknown>
	): Promise<{ template: string; rendered: string }> => {
		return await request<{ template: string; rendered: string }>("/alerts/rules/preview-message", {
			method: "POST",
			body
		});
	};

	/** 連動規則列表（DI 觸發後 DO 輸出等） */
	const getAlertLinkages = async (): Promise<{ linkages: AlertLinkage[] }> => {
		return await request<{ linkages: AlertLinkage[] }>("/alerts/linkages");
	};

	/** 建立連動規則 */
	const createAlertLinkage = async (
		payload: CreateAlertLinkagePayload
	): Promise<{ linkage: AlertLinkage }> => {
		return await request<{ linkage: AlertLinkage }>("/alerts/linkages", {
			method: "POST",
			body: payload
		});
	};

	/** 更新連動規則 */
	const updateAlertLinkage = async (
		id: number,
		payload: UpdateAlertLinkagePayload
	): Promise<{ linkage: AlertLinkage }> => {
		return await request<{ linkage: AlertLinkage }>(`/alerts/linkages/${id}`, {
			method: "PUT",
			body: payload
		});
	};

	/** 刪除連動規則 */
	const deleteAlertLinkage = async (id: number): Promise<{ linkage: AlertLinkage }> => {
		return await request<{ linkage: AlertLinkage }>(`/alerts/linkages/${id}`, {
			method: "DELETE"
		});
	};

	/** 手動強制關閉 DO（不需到現場切換） */
	const manualOffDoOutput = async (
		payload: ManualOffDoOutputPayload
	): Promise<ManualOffDoOutputResponse> => {
		return await request<ManualOffDoOutputResponse>("/alerts/do-outputs/manual-off", {
			method: "POST",
			body: payload
		});
	};

	/** 解除手動覆寫（恢復自動連動） */
	const releaseManualOffOverride = async (
		payload: ReleaseManualOffOverridePayload
	): Promise<ReleaseManualOffOverrideResponse> => {
		return await request<ReleaseManualOffOverrideResponse>("/alerts/do-outputs/release-manual-off", {
			method: "POST",
			body: payload
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
		createAlertRule,
		updateAlertRule,
		deleteAlertRule,
		previewAlertRuleMessage,
		getAlertLinkages,
		createAlertLinkage,
		updateAlertLinkage,
		deleteAlertLinkage,
		manualOffDoOutput,
		releaseManualOffOverride
	};
};

