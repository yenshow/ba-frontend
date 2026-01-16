import type {
	Alert,
	AlertListResponse,
	AlertFilters,
	UnresolvedAlertCountResponse,
	AlertHistoryItem
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
	 * 取得警報歷史記錄
	 */
	const getAlertHistory = async (id: number): Promise<{ history: AlertHistoryItem[] }> => {
		return await request<{ history: AlertHistoryItem[] }>(`/alerts/${id}/history`);
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
	const toggleIgnoreAlert = async (sourceId: number, alertType: string, action: "ignore" | "unignore", source?: string): Promise<{ success: boolean; message: string; count: number }> => {
		const path = buildPathWithQuery(`/alerts/${sourceId}/${alertType}/${action}`, source ? { source } : undefined);
		return await request<{ success: boolean; message: string; count: number }>(path, { method: "POST" });
	};

	/**
	 * 忽視警示（不再顯示相同來源和類型的警示）
	 */
	const ignoreAlert = async (sourceId: number, alertType: string, source?: string): Promise<{ success: boolean; message: string; count: number }> => {
		return toggleIgnoreAlert(sourceId, alertType, "ignore", source);
	};

	/**
	 * 取消忽視警示（恢復顯示相同來源和類型的警示）
	 */
	const unignoreAlert = async (sourceId: number, alertType: string, source?: string): Promise<{ success: boolean; message: string; count: number }> => {
		return toggleIgnoreAlert(sourceId, alertType, "unignore", source);
	};

	/**
	 * 取得未解決的警示數量（支持時間範圍篩選）
	 */
	const getUnresolvedAlertCount = async (filters?: Pick<AlertFilters, "source" | "source_id" | "device_id" | "alert_type" | "severity" | "start_date" | "end_date">): Promise<UnresolvedAlertCountResponse> => {
		const path = buildPathWithQuery("/alerts/unresolved/count", filters as Record<string, unknown>);
		return await request<UnresolvedAlertCountResponse>(path);
	};

	/**
	 * 取得警報規則（用於前端顯示狀態）
	 */
	const getAlertRules = async (source: string, alertType?: string, parameter?: string): Promise<{ rules: any[] }> => {
		const params: Record<string, unknown> = { source };
		if (alertType) params.alert_type = alertType;
		if (parameter) params.parameter = parameter;
		const path = buildPathWithQuery("/alerts/rules", params);
		return await request<{ rules: any[] }>(path);
	};

	return {
		getAlerts,
		getAlertById,
		getAlertHistory,
		unresolveAlert,
		ignoreAlert,
		unignoreAlert,
		getUnresolvedAlertCount,
		getAlertRules
	};
};
