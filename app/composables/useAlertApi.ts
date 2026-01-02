import type {
	Alert,
	AlertListResponse,
	AlertFilters,
	UnresolvedAlertCountResponse,
	AlertHistoryItem
} from "~/types/alert";
import { useApiBase } from "~/composables/useApiBase";

export const useAlertApi = () => {
	const { request } = useApiBase();

	/**
	 * 構建查詢參數的通用函數
	 */
	const buildQueryParams = (filters?: Record<string, unknown>): URLSearchParams => {
		const queryParams = new URLSearchParams();
		if (filters) {
			for (const [key, value] of Object.entries(filters)) {
				if (value !== undefined && value !== null && value !== "") {
					queryParams.append(key, typeof value === "string" ? value : String(value));
				}
			}
		}
		return queryParams;
	};

	/**
	 * 取得警示列表
	 */
	const getAlerts = async (filters?: AlertFilters): Promise<AlertListResponse> => {
		const queryParams = buildQueryParams(filters as Record<string, unknown>);
		const queryString = queryParams.toString();
		const path = queryString ? `/alerts?${queryString}` : "/alerts";
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
	 * 構建帶查詢參數的路徑
	 */
	const buildPathWithQuery = (basePath: string, params?: Record<string, string>): string => {
		if (!params || Object.keys(params).length === 0) {
			return basePath;
		}
		const queryParams = buildQueryParams(params);
		const queryString = queryParams.toString();
		return queryString ? `${basePath}?${queryString}` : basePath;
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
	 * 取得未解決的警示數量
	 */
	const getUnresolvedAlertCount = async (filters?: Pick<AlertFilters, "source" | "source_id" | "device_id" | "alert_type" | "severity">): Promise<UnresolvedAlertCountResponse> => {
		const queryParams = buildQueryParams(filters as Record<string, unknown>);
		const queryString = queryParams.toString();
		const path = queryString ? `/alerts/unresolved/count?${queryString}` : "/alerts/unresolved/count";
		return await request<UnresolvedAlertCountResponse>(path);
	};

	return {
		getAlerts,
		getAlertById,
		getAlertHistory,
		unresolveAlert,
		ignoreAlert,
		unignoreAlert,
		getUnresolvedAlertCount
	};
};
