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
	operationMode?: "construction_flow" | "parking";
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
	/** 停車場主畫面：僅顯示此時間點之後的紀錄（Reset 後由後端帶入或自動套用） */
	since?: string;
}

export const useVehicleAccessSitesApi = () => {
	const { request } = useApiBase();

	const getSites = async (): Promise<{ sites: VehicleAccessSiteSummary[] }> =>
		request<{ sites: VehicleAccessSiteSummary[] }>("/vehicle-access/sites");

	const getSiteStats = async (
		siteId: number,
		filters: Omit<VehicleAccessLogsFilters, "limit" | "offset" | "search" | "since"> = {}
	): Promise<{ entryCount: number; exitCount: number; currentCount: number }> => {
		const q = new URLSearchParams();
		if (filters.startTime) q.set("startTime", filters.startTime);
		if (filters.endTime) q.set("endTime", filters.endTime);
		if (filters.timeRange) q.set("timeRange", filters.timeRange);
		const qs = q.toString();
		return request(`/vehicle-access/sites/${siteId}/stats${qs ? `?${qs}` : ""}`);
	};

	const getSiteSessionStats = async (
		siteId: number
	): Promise<{ entryCount: number; exitCount: number; since: string | null }> =>
		request(`/vehicle-access/sites/${siteId}/session-stats`);

	const getSitePresence = async (
		siteId: number
	): Promise<{ currentCount: number; capacity: number | null }> =>
		request(`/vehicle-access/sites/${siteId}/presence`);

	const getPresencePlates = async (siteId: number): Promise<{ plates: string[] }> =>
		request(`/vehicle-access/sites/${siteId}/presence/plates`);

	const getOrganizationGroups = async (
		siteId: number
	): Promise<{
		groups: Array<{
			groupKey: string
			personGroupId: number
			personGroupName: string
			vehicleCount: number
			onSiteCount: number
			members?: Array<{
				id: number
				name: string
				photoUrl?: string | null
				plates?: string[]
				isPresent?: boolean
				lastEntryDate?: string | null
				entryTime?: string | null
				exitTime?: string | null
			}>
		}>
	}> => request(`/vehicle-access/sites/${siteId}/organization-groups`);

	const resetSiteStats = async (
		siteId: number
	): Promise<{ statsResetAt: string }> =>
		request(`/vehicle-access/sites/${siteId}/reset`, { method: "POST" });

	const getAllSiteLogs = async (
		filters: VehicleAccessLogsFilters = {}
	): Promise<{ logs: VehicleDataLog[] }> => {
		const q = new URLSearchParams();
		if (filters.limit != null) q.set("limit", String(filters.limit));
		if (filters.offset != null) q.set("offset", String(filters.offset));
		if (filters.startTime) q.set("startTime", filters.startTime);
		if (filters.endTime) q.set("endTime", filters.endTime);
		if (filters.timeRange) q.set("timeRange", filters.timeRange);
		if (filters.since) q.set("since", filters.since);
		if (filters.search) q.set("search", filters.search);
		const qs = q.toString();
		return request(`/vehicle-access/logs${qs ? `?${qs}` : ""}`);
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
		if (filters.since) q.set("since", filters.since);
		if (filters.search) q.set("search", filters.search);
		const qs = q.toString();
		return request(`/vehicle-access/sites/${siteId}/logs${qs ? `?${qs}` : ""}`);
	};

	const getSiteLogsLatest = async (
		siteId: number,
		since?: string
	): Promise<{ logs: VehicleDataLog[]; total: number }> => {
		const q = new URLSearchParams();
		if (since) q.set("since", since);
		const qs = q.toString();
		return request(
			`/vehicle-access/sites/${siteId}/logs/latest${qs ? `?${qs}` : ""}`
		);
	};

	return {
		getSites,
		getSiteStats,
		getSiteSessionStats,
		getSitePresence,
		getPresencePlates,
		getOrganizationGroups,
		resetSiteStats,
		getAllSiteLogs,
		getSiteLogs,
		getSiteLogsLatest
	};
};

/** 完整報表單次上限（與後端 ENTRY_EXIT_MAX_RECORDS 一致） */
export { ENTRY_EXIT_FULL_REPORT_LIMIT as VEHICLE_ACCESS_FULL_REPORT_LIMIT } from "~/utils/entryExitTimeRange";
