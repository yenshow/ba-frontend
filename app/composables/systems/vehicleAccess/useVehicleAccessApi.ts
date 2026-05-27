/**
 * 車輛進出 API（external-data vehiclebiz/passageway_log_data、vehiclebiz/lane_info、vehicle-access/vehicle-groups）
 */

import type { VehicleDataLog, LaneInfo, VehicleGroupFromApi } from "~/types/vehicleAccess";
import { useExternalDataApi } from "~/composables/systems/externalData/useExternalDataApi";
import { useApiBase } from "~/composables/core/useApiBase";

const SCHEMA = "vehiclebiz";
const TABLE_PASSAGEWAY = "passageway_log_data";
const TABLE_LANE_INFO = "lane_info";

/** 時間範圍：今日、昨日、最近一週（後端 dateRangeUtils 支援） */
export type VehicleDataLogTimeRange = "today" | "yesterday";

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
	 * 取得車輛群組彙總（anpr.vehicle_custom_list + vehicle_and_list_relation + platform.vehicle_list）
	 * 供右側「車輛群組」使用；不含人員大頭照
	 */
	const getVehicleGroups = async (): Promise<VehicleGroupFromApi> => {
		const { request } = useApiBase();
		const res = await request<VehicleGroupFromApi>("/external-data/vehicle-access/vehicle-groups");
		const data = res && typeof res === "object" && "groups" in res ? (res as VehicleGroupFromApi) : undefined;
		return data ?? { groups: [] };
	};

	return {
		getVehicleDataLogList,
		getVehicleDataLogById,
		getLaneInfoList,
		getVehicleGroups
	};
};
