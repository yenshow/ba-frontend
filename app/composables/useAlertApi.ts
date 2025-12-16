import type {
	Alert,
	AlertListResponse,
	CreateAlertData,
	AlertFilters,
	UnresolvedAlertCountResponse
} from "~/types/alert";
import { useApiBase } from "~/composables/useApiBase";

export const useAlertApi = () => {
	const { request, requestWithBody } = useApiBase();

	/**
	 * 取得警示列表
	 */
	const getAlerts = async (filters?: AlertFilters): Promise<AlertListResponse> => {
		const queryParams = new URLSearchParams();

		if (filters?.device_id) {
			queryParams.append("device_id", String(filters.device_id));
		}
		if (filters?.alert_type) {
			queryParams.append("alert_type", filters.alert_type);
		}
		if (filters?.severity) {
			queryParams.append("severity", filters.severity);
		}
		if (filters?.resolved !== undefined) {
			queryParams.append("resolved", String(filters.resolved));
		}
		if (filters?.limit) {
			queryParams.append("limit", String(filters.limit));
		}
		if (filters?.offset) {
			queryParams.append("offset", String(filters.offset));
		}
		if (filters?.orderBy) {
			queryParams.append("orderBy", filters.orderBy);
		}
		if (filters?.order) {
			queryParams.append("order", filters.order);
		}

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
	 * 創建警示
	 */
	const createAlert = async (data: CreateAlertData): Promise<{ alert: Alert }> => {
		return await requestWithBody<{ alert: Alert }>("/alerts", {
			method: "POST",
			body: JSON.stringify(data)
		});
	};

	/**
	 * 標記警示為已解決
	 */
	const resolveAlert = async (id: number): Promise<{ alert: Alert }> => {
		return await requestWithBody<{ alert: Alert }>(`/alerts/${id}/resolve`, {
			method: "PUT"
		});
	};

	/**
	 * 標記警示為未解決（管理員）
	 */
	const unresolveAlert = async (id: number): Promise<{ alert: Alert }> => {
		return await requestWithBody<{ alert: Alert }>(`/alerts/${id}/unresolve`, {
			method: "PUT"
		});
	};

	/**
	 * 刪除警示（管理員）
	 */
	const deleteAlert = async (id: number): Promise<{ success: boolean; message: string }> => {
		return await requestWithBody<{ success: boolean; message: string }>(`/alerts/${id}`, {
			method: "DELETE"
		});
	};

	/**
	 * 取得未解決的警示數量
	 */
	const getUnresolvedAlertCount = async (filters?: {
		device_id?: number;
		alert_type?: string;
		severity?: string;
	}): Promise<UnresolvedAlertCountResponse> => {
		const queryParams = new URLSearchParams();

		if (filters?.device_id) {
			queryParams.append("device_id", String(filters.device_id));
		}
		if (filters?.alert_type) {
			queryParams.append("alert_type", filters.alert_type);
		}
		if (filters?.severity) {
			queryParams.append("severity", filters.severity);
		}

		const queryString = queryParams.toString();
		const path = queryString ? `/alerts/unresolved/count?${queryString}` : "/alerts/unresolved/count";

		return await request<UnresolvedAlertCountResponse>(path);
	};

	return {
		getAlerts,
		getAlertById,
		createAlert,
		resolveAlert,
		unresolveAlert,
		deleteAlert,
		getUnresolvedAlertCount
	};
};

