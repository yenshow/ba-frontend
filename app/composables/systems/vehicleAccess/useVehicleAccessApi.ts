/**
 * 車輛進出 API：YSCP external-data + /vehicle-access sites／logs
 */
import type { VehicleDataLog, LaneInfo, VehicleGroupFromApi } from "~/types/vehicleAccess"
import { useExternalDataApi } from "~/composables/systems/externalData/useExternalDataApi"
import { useApiBase } from "~/composables/core/useApiBase"

const SCHEMA = "vehiclebiz"
const TABLE_PASSAGEWAY = "passageway_log_data"
const TABLE_LANE_INFO = "lane_info"

/** 時間範圍：今日、昨日、最近一週（後端 dateRangeUtils 支援） */
export type VehicleDataLogTimeRange = "today" | "yesterday"

export interface VehicleDataLogListFilters {
	timeRange?: VehicleDataLogTimeRange
	startTime?: string
	endTime?: string
	passageway_id?: number | number[]
	lane_id?: number | number[]
	/** 1 進場 2 出場（count 時與 allow_result=1 搭配，只計放行） */
	lane_type?: 1 | 2
	/** 1=放行 0=未放行；進場/出場數量僅計 allow_result=1 */
	allow_result?: number
	vehicle_list_id?: number
	vehicle_category?: number
	search?: string
	limit?: number
	offset?: number
	orderBy?: string
	orderDirection?: "ASC" | "DESC"
}

export interface VehicleAccessSiteSummary {
	id: number
	name: string
	zoneName?: string
	dataSource: "yscp" | "isapi_camera"
	operationMode?: "construction_flow" | "parking"
	entryCount: number
	exitCount: number
	currentCount: number
}

export interface VehicleAccessLogsFilters {
	limit?: number
	offset?: number
	startTime?: string
	endTime?: string
	timeRange?: "today" | "yesterday" | "last7days"
	search?: string
	/** 停車場主畫面：僅顯示此時間點之後的紀錄（Reset 後由後端帶入或自動套用） */
	since?: string
}

const toQueryParams = (f: Record<string, unknown>): Record<string, unknown> => {
	const params = { ...f }
	if (Array.isArray(params.passageway_id)) {
		params.passageway_id = params.passageway_id.join(",")
	}
	if (Array.isArray(params.lane_id)) {
		params.lane_id = params.lane_id.join(",")
	}
	return params
}

const buildLogsQuery = (filters: VehicleAccessLogsFilters = {}) => {
	const q = new URLSearchParams()
	if (filters.limit != null) q.set("limit", String(filters.limit))
	if (filters.offset != null) q.set("offset", String(filters.offset))
	if (filters.startTime) q.set("startTime", filters.startTime)
	if (filters.endTime) q.set("endTime", filters.endTime)
	if (filters.timeRange) q.set("timeRange", filters.timeRange)
	if (filters.since) q.set("since", filters.since)
	if (filters.search) q.set("search", filters.search)
	const qs = q.toString()
	return qs ? `?${qs}` : ""
}

export const useVehicleAccessApi = () => {
	const externalDataApi = useExternalDataApi()
	const { request } = useApiBase()

	const getVehicleDataLogList = async (
		filters: VehicleDataLogListFilters = {}
	): Promise<{ success: boolean; data: VehicleDataLog[]; total?: number }> => {
		const result = await externalDataApi.getList<VehicleDataLog>(
			SCHEMA,
			TABLE_PASSAGEWAY,
			toQueryParams(filters as Record<string, unknown>)
		)
		const data = result.data || []
		const total =
			(result as { pagination?: { count?: number } }).pagination?.count ?? data.length
		return { success: true, data, total }
	}

	const getVehicleDataLogById = async (id: number): Promise<VehicleDataLog | null> => {
		try {
			const result = await externalDataApi.getById<VehicleDataLog>(
				SCHEMA,
				TABLE_PASSAGEWAY,
				id
			)
			return result.data ?? null
		} catch {
			return null
		}
	}

	/**
	 * 取得車道列表（vehiclebiz.lane_info，後端預設 deleted=0）
	 * 供地點設定「入口車道／出口車道」下拉使用
	 */
	const getLaneInfoList = async (filters?: {
		lane_type?: number
	}): Promise<LaneInfo[]> => {
		const params: Record<string, unknown> = { limit: 200 }
		if (filters?.lane_type !== undefined) params.lane_type = filters.lane_type
		const result = await externalDataApi.getList<LaneInfo>(SCHEMA, TABLE_LANE_INFO, params)
		return result.data || []
	}

	/**
	 * 取得車輛群組彙總（anpr.vehicle_custom_list + vehicle_and_list_relation + platform.vehicle_list）
	 * 供右側「車輛群組」使用；不含人員大頭照
	 */
	const getVehicleGroups = async (): Promise<VehicleGroupFromApi> => {
		const res = await request<VehicleGroupFromApi>(
			"/external-data/vehicle-access/vehicle-groups"
		)
		const data =
			res && typeof res === "object" && "groups" in res
				? (res as VehicleGroupFromApi)
				: undefined
		return data ?? { groups: [] }
	}

	const getSites = async (): Promise<{ sites: VehicleAccessSiteSummary[] }> =>
		request<{ sites: VehicleAccessSiteSummary[] }>("/vehicle-access/sites")

	const getSiteStats = async (
		siteId: number,
		filters: Omit<VehicleAccessLogsFilters, "limit" | "offset" | "search" | "since"> = {}
	): Promise<{ entryCount: number; exitCount: number; currentCount: number }> => {
		const q = new URLSearchParams()
		if (filters.startTime) q.set("startTime", filters.startTime)
		if (filters.endTime) q.set("endTime", filters.endTime)
		if (filters.timeRange) q.set("timeRange", filters.timeRange)
		const qs = q.toString()
		return request(`/vehicle-access/sites/${siteId}/stats${qs ? `?${qs}` : ""}`)
	}

	const getSiteSessionStats = async (
		siteId: number
	): Promise<{
		entryCount: number
		exitCount: number
		currentCount: number
		capacity: number | null
		since: string | null
	}> => request(`/vehicle-access/sites/${siteId}/session-stats`)

	const getSitePresence = async (
		siteId: number
	): Promise<{ currentCount: number; capacity: number | null }> =>
		request(`/vehicle-access/sites/${siteId}/presence`)

	const getPresencePlates = async (siteId: number): Promise<{ plates: string[] }> =>
		request(`/vehicle-access/sites/${siteId}/presence/plates`)

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
	}> => request(`/vehicle-access/sites/${siteId}/organization-groups`)

	const resetSiteStats = async (siteId: number): Promise<{ statsResetAt: string }> =>
		request(`/vehicle-access/sites/${siteId}/reset`, { method: "POST" })

	const getAllSiteLogs = async (
		filters: VehicleAccessLogsFilters = {}
	): Promise<{ logs: VehicleDataLog[] }> =>
		request(`/vehicle-access/logs${buildLogsQuery(filters)}`)

	const getSiteLogs = async (
		siteId: number,
		filters: VehicleAccessLogsFilters = {}
	): Promise<{ logs: VehicleDataLog[]; total: number; dataSource?: string }> =>
		request(`/vehicle-access/sites/${siteId}/logs${buildLogsQuery(filters)}`)

	const getSiteLogsLatest = async (
		siteId: number,
		since?: string
	): Promise<{ logs: VehicleDataLog[]; total: number }> => {
		const q = new URLSearchParams()
		if (since) q.set("since", since)
		const qs = q.toString()
		return request(`/vehicle-access/sites/${siteId}/logs/latest${qs ? `?${qs}` : ""}`)
	}

	return {
		getVehicleDataLogList,
		getVehicleDataLogById,
		getLaneInfoList,
		getVehicleGroups,
		getSites,
		getSiteStats,
		getSiteSessionStats,
		getSitePresence,
		getPresencePlates,
		getOrganizationGroups,
		resetSiteStats,
		getAllSiteLogs,
		getSiteLogs,
		getSiteLogsLatest,
	}
}

/** 完整報表單次上限（與後端 ENTRY_EXIT_MAX_RECORDS 一致） */
export { ENTRY_EXIT_FULL_REPORT_LIMIT as VEHICLE_ACCESS_FULL_REPORT_LIMIT } from "~/utils/entryExitTimeRange"
