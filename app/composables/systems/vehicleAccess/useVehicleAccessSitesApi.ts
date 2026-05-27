/**
 * 車輛進出 sites/logs API（/api/vehicle-access）
 */
import type { VehicleDataLog } from "~/types/vehicleAccess";
import { useApiBase } from "~/composables/core/useApiBase";

export interface VehicleAccessSiteSummary {
	id: number;
	name: string;
	zoneName?: string;
	dataSource: "yscp" | "isapi_camera";
	entryCount: number;
	exitCount: number;
	currentCount: number;
}

export interface VehicleAccessLogsFilters {
	limit?: number;
	offset?: number;
	startTime?: string;
	endTime?: string;
	timeRange?: "today" | "yesterday" | "last7days";
	search?: string;
}

export const useVehicleAccessSitesApi = () => {
	const { request } = useApiBase();

	const getSites = async (): Promise<{ sites: VehicleAccessSiteSummary[] }> =>
		request<{ sites: VehicleAccessSiteSummary[] }>("/vehicle-access/sites");

	const getSiteStats = async (
		siteId: number,
		filters: Omit<VehicleAccessLogsFilters, "limit" | "offset" | "search"> = {}
	): Promise<{ entryCount: number; exitCount: number; currentCount: number }> => {
		const q = new URLSearchParams();
		if (filters.startTime) q.set("startTime", filters.startTime);
		if (filters.endTime) q.set("endTime", filters.endTime);
		if (filters.timeRange) q.set("timeRange", filters.timeRange);
		const qs = q.toString();
		return request(`/vehicle-access/sites/${siteId}/stats${qs ? `?${qs}` : ""}`);
	};

	const getSiteLogs = async (
		siteId: number,
		filters: VehicleAccessLogsFilters = {}
	): Promise<{ logs: VehicleDataLog[]; total: number; dataSource?: string }> => {
		const q = new URLSearchParams();
		if (filters.limit != null) q.set("limit", String(filters.limit));
		if (filters.offset != null) q.set("offset", String(filters.offset));
		if (filters.startTime) q.set("startTime", filters.startTime);
		if (filters.endTime) q.set("endTime", filters.endTime);
		if (filters.timeRange) q.set("timeRange", filters.timeRange);
		if (filters.search) q.set("search", filters.search);
		const qs = q.toString();
		return request(`/vehicle-access/sites/${siteId}/logs${qs ? `?${qs}` : ""}`);
	};

	return { getSites, getSiteStats, getSiteLogs };
};

/** 完整報表單次上限（與後端 ENTRY_EXIT_MAX_RECORDS 一致） */
export { ENTRY_EXIT_FULL_REPORT_LIMIT as VEHICLE_ACCESS_FULL_REPORT_LIMIT } from "~/utils/entryExitTimeRange";
