import type {
	Alert,
	AlertListResponse,
	CreateAlertData,
	AlertFilters,
	UnresolvedAlertCountResponse
} from "~/types/alert";
import { useApiBase } from "~/composables/useApiBase";

export const useAlertApi = () => {
	const { request } = useApiBase();

	/**
	 * 取得警示列表
	 */
	const getAlerts = async (filters?: AlertFilters): Promise<AlertListResponse> => {
		const queryParams = new URLSearchParams();

		// 多系統來源篩選
		if (filters?.source) {
			queryParams.append("source", filters.source);
		}
		if (filters?.source_id) {
			queryParams.append("source_id", String(filters.source_id));
		}
		// 向後兼容
		if (filters?.device_id) {
			queryParams.append("device_id", String(filters.device_id));
		}
		if (filters?.device_type_code) {
			queryParams.append("device_type_code", filters.device_type_code);
		}
		if (filters?.alert_type) {
			queryParams.append("alert_type", filters.alert_type);
		}
		if (filters?.severity) {
			queryParams.append("severity", filters.severity);
		}
		// 狀態篩選（新）
		if (filters?.status) {
			queryParams.append("status", filters.status);
		}
		// 向後兼容（舊的狀態篩選）
		if (filters?.resolved !== undefined) {
			queryParams.append("resolved", String(filters.resolved));
		}
		if (filters?.ignored !== undefined) {
			queryParams.append("ignored", String(filters.ignored));
		}
		if (filters?.start_date) {
			queryParams.append("start_date", filters.start_date);
		}
		if (filters?.end_date) {
			queryParams.append("end_date", filters.end_date);
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
		return await request<{ alert: Alert }>("/alerts", {
			method: "POST",
			body: JSON.stringify(data)
		});
	};

	/**
	 * 標記警示為已解決
	 */
	const resolveAlert = async (sourceId: number, alertType: string, source?: string): Promise<{ success: boolean; message: string; count: number }> => {
		const queryParams = new URLSearchParams();
		if (source) {
			queryParams.append("source", source);
		}
		const queryString = queryParams.toString();
		const path = queryString ? `/alerts/${sourceId}/${alertType}/resolve?${queryString}` : `/alerts/${sourceId}/${alertType}/resolve`;
		
		return await request<{ success: boolean; message: string; count: number }>(
			path,
			{
				method: "PUT"
			}
		);
	};

	/**
	 * 標記警示為未解決（管理員）
	 */
	const unresolveAlert = async (id: number): Promise<{ alert: Alert }> => {
		return await request<{ alert: Alert }>(`/alerts/${id}/unresolve`, {
			method: "PUT"
		});
	};

	/**
	 * 忽視警示（不再顯示相同來源和類型的警示）
	 */
	const ignoreAlert = async (sourceId: number, alertType: string, source?: string): Promise<{ success: boolean; message: string; count: number }> => {
		const queryParams = new URLSearchParams();
		if (source) {
			queryParams.append("source", source);
		}
		const queryString = queryParams.toString();
		const path = queryString ? `/alerts/${sourceId}/${alertType}/ignore?${queryString}` : `/alerts/${sourceId}/${alertType}/ignore`;
		
		return await request<{ success: boolean; message: string; count: number }>(
			path,
			{
				method: "POST"
			}
		);
	};

	/**
	 * 取得未解決的警示數量
	 */
	const getUnresolvedAlertCount = async (filters?: {
		source?: string;
		source_id?: number;
		device_id?: number;
		alert_type?: string;
		severity?: string;
	}): Promise<UnresolvedAlertCountResponse> => {
		const queryParams = new URLSearchParams();

		if (filters?.source) {
			queryParams.append("source", filters.source);
		}
		if (filters?.source_id) {
			queryParams.append("source_id", String(filters.source_id));
		}
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
		ignoreAlert,
		getUnresolvedAlertCount
	};
};
