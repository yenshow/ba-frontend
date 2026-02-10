/**
 * 車輛進出 API（external-data vehiclebiz/passageway_log_data、vehiclebiz/lane_info）
 */

import type { VehicleDataLog, LaneInfo, VehicleListItem } from "~/types/vehicleAccess";
import { useExternalDataApi } from "~/composables/systems/useExternalDataApi";

const SCHEMA = "vehiclebiz";
const SCHEMA_PLATFORM = "platform";
const TABLE_PASSAGEWAY = "passageway_log_data";
const TABLE_LANE_INFO = "lane_info";
const TABLE_VEHICLE_LIST = "vehicle_list";

/** 時間範圍：今日、昨日、最近一週（後端 dateRangeUtils 支援） */
export type VehicleDataLogTimeRange = "today" | "yesterday" | "last7days";

export interface VehicleDataLogListFilters {
	timeRange?: VehicleDataLogTimeRange;
	startTime?: string;
	endTime?: string;
	passageway_id?: number | number[];
	lane_id?: number | number[];
	/** 1 進場 2 出場（count 時與 allow_result=1 搭配，只計放行） */
	lane_type?: 1 | 2;
	/** 1=放行 0=未放行；進場/出場數量僅計 allow_result=1 */
	allow_result?: number;
	vehicle_list_id?: number;
	vehicle_category?: number;
	search?: string;
	limit?: number;
	offset?: number;
	orderBy?: string;
	orderDirection?: "ASC" | "DESC";
}

const toQueryParams = (f: Record<string, unknown>): Record<string, unknown> => {
	const params = { ...f };
	if (Array.isArray(params.passageway_id)) {
		params.passageway_id = params.passageway_id.join(",");
	}
	if (Array.isArray(params.lane_id)) {
		params.lane_id = params.lane_id.join(",");
	}
	return params;
};

export const useVehicleAccessApi = () => {
	const externalDataApi = useExternalDataApi();

	const getVehicleDataLogList = async (
		filters: VehicleDataLogListFilters = {}
	): Promise<{ success: boolean; data: VehicleDataLog[]; total?: number }> => {
		const result = await externalDataApi.getList<VehicleDataLog>(
			SCHEMA,
			TABLE_PASSAGEWAY,
			toQueryParams(filters as Record<string, unknown>)
		);
		const data = result.data || [];
		const total = (result as { pagination?: { count?: number } }).pagination?.count ?? data.length;
		return { success: true, data, total };
	};

	const getVehicleDataLogCount = async (
		filters: Omit<VehicleDataLogListFilters, "limit" | "offset" | "orderBy" | "orderDirection"> = {}
	): Promise<number> => {
		const result = await externalDataApi.getCount(
			SCHEMA,
			TABLE_PASSAGEWAY,
			toQueryParams(filters as Record<string, unknown>)
		);
		const raw = result.data;
		return typeof raw === "number" ? raw : ((raw as { count?: number })?.count ?? 0);
	};

	const getVehicleDataLogById = async (id: number): Promise<VehicleDataLog | null> => {
		try {
			const result = await externalDataApi.getById<VehicleDataLog>(SCHEMA, TABLE_PASSAGEWAY, id);
			return result.data ?? null;
		} catch {
			return null;
		}
	};

	/**
	 * 取得車道列表（vehiclebiz.lane_info，後端預設 deleted=0）
	 * 供地點設定「入口車道／出口車道」下拉使用
	 */
	const getLaneInfoList = async (filters?: { lane_type?: number }): Promise<LaneInfo[]> => {
		const params: Record<string, unknown> = { limit: 200 };
		if (filters?.lane_type !== undefined) params.lane_type = filters.lane_type;
		const result = await externalDataApi.getList<LaneInfo>(SCHEMA, TABLE_LANE_INFO, params);
		return result.data || [];
	};

	/**
	 * 取得固定車輛名單（platform.vehicle_list）
	 * 欄位：plate_license、owner_name、person_id（查 standard_head_portrait）
	 */
	const getVehicleList = async (filters?: { limit?: number; search?: string }): Promise<VehicleListItem[]> => {
		const params: Record<string, unknown> = { limit: filters?.limit ?? 200 };
		if (filters?.search) params.search = filters.search;
		const result = await externalDataApi.getList<VehicleListItem>(
			SCHEMA_PLATFORM,
			TABLE_VEHICLE_LIST,
			params
		);
		return result.data || [];
	};

	return {
		getVehicleDataLogList,
		getVehicleDataLogCount,
		getVehicleDataLogById,
		getLaneInfoList,
		getVehicleList
	};
};
