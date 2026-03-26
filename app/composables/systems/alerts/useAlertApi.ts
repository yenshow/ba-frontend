import type {
	Alert,
	AlertListResponse,
	AlertFilters,
	UnresolvedAlertCountResponse
} from "~/types/alert";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

export const useAlertApi = () => {
	const { request } = useApiBase();

	const getAlerts = async (filters?: AlertFilters): Promise<AlertListResponse> => {
		const path = buildPathWithQuery("/alerts", filters as Record<string, unknown>);
		return await request<AlertListResponse>(path);
	};

	const getAlertById = async (id: number): Promise<{ alert: Alert }> => {
		return await request<{ alert: Alert }>(`/alerts/${id}`);
	};

	const unresolveAlert = async (id: number): Promise<{ alert: Alert }> => {
		return await request<{ alert: Alert }>(`/alerts/${id}/unresolve`, {
			method: "PUT"
		});
	};

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

	const ignoreAlert = async (
		sourceId: number,
		alertType: string,
		source?: string,
		dimensionKey?: string
	): Promise<{ success: boolean; message: string; count: number }> => {
		return toggleIgnoreAlert(sourceId, alertType, "ignore", source, dimensionKey);
	};

	const unignoreAlert = async (
		sourceId: number,
		alertType: string,
		source?: string,
		dimensionKey?: string
	): Promise<{ success: boolean; message: string; count: number }> => {
		return toggleIgnoreAlert(sourceId, alertType, "unignore", source, dimensionKey);
	};

	const getUnresolvedAlertCount = async (
		filters?: Pick<
			AlertFilters,
			| "source"
			| "source_id"
			| "device_id"
			| "exclude_sources"
			| "alert_type"
			| "severity"
			| "start_date"
			| "end_date"
		>
	): Promise<UnresolvedAlertCountResponse> => {
		const path = buildPathWithQuery("/alerts/unresolved/count", filters as Record<string, unknown>);
		return await request<UnresolvedAlertCountResponse>(path);
	};

	const getAlertRules = async (
		source: string,
		alertType?: string,
		parameter?: string
	): Promise<{ rules: any[] }> => {
		const params: Record<string, unknown> = { source };
		if (alertType) params.alert_type = alertType;
		if (parameter) params.parameter = parameter;
		const path = buildPathWithQuery("/alerts/rules", params);
		return await request<{ rules: any[] }>(path);
	};

	return {
		getAlerts,
		getAlertById,
		unresolveAlert,
		ignoreAlert,
		unignoreAlert,
		getUnresolvedAlertCount,
		getAlertRules
	};
};

