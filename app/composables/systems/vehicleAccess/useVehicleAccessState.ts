/**
 * 車輛進出狀態（地點、當日記錄、進出場／在場數量、車輛群組）
 */

import { ref, computed } from "vue";
import type {
	VehicleDataLog,
	VehicleAccessLocationSummary,
	VehicleAccessZone,
	VehicleAccessLocation
} from "~/types/vehicleAccess";
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { unifiedToVehicleAccessZone } from "~/utils/locationAdapter";
import type { UnifiedZone } from "~/types/location";

/** 時間範圍：今日、昨日、最近一週、自訂 */
export type VehicleAccessTimeRange = "today" | "yesterday" | "last7days" | "custom";

/** 篩選器時間範圍選項（UI 用：今日／自訂） */
export type TimeRangeOption = "today" | "custom";

export interface VehicleAccessFilters {
	locationId: string | null;
	timeRange: VehicleAccessTimeRange;
	/** 自訂時間起（datetime-local 字串） */
	startTime?: string | null;
	/** 自訂時間迄（datetime-local 字串） */
	endTime?: string | null;
	/** 僅顯示無群組 */
	onlyNoGroup?: boolean;
	/** 僅顯示黑名單 */
	onlyBlacklist?: boolean;
	/** 關鍵字搜尋（車牌、車道、群組、車主） */
	search?: string | null;
}

const getDefaultFilters = (): VehicleAccessFilters => ({
	locationId: null,
	timeRange: "today",
	startTime: null,
	endTime: null,
	onlyNoGroup: false,
	onlyBlacklist: false,
	search: null
});

/** 從地點取得車道 ID 列表（入口＋出口）；無則回傳空陣列 */
function getLaneIdsForLocation(loc: VehicleAccessLocation | null | undefined): number[] {
	if (!loc) return [];
	const ids: number[] = [];
	if (loc.entryLaneId != null) ids.push(Number(loc.entryLaneId));
	if (loc.exitLaneId != null) ids.push(Number(loc.exitLaneId));
	return ids;
}

export const useVehicleAccessState = () => {
	const vehicleAccessApi = useVehicleAccessApi();
	const locationApi = useLocationApi();
	const { handleError } = useErrorHandler();

	const filters = ref<VehicleAccessFilters>(getDefaultFilters());
	const vehicleAccessZones = ref<VehicleAccessZone[]>([]);
	const logs = ref<VehicleDataLog[]>([]);
	const totalCount = ref(0);
	const overviewSummaries = ref<VehicleAccessLocationSummary[]>([]);

	/** 當日進場車輛數（allow_result=1 且 lane_type=1，僅計放行） */
	const entryCount = ref(0);
	/** 當日出場車輛數（allow_result=1 且 lane_type=2，僅計放行） */
	const exitCount = ref(0);
	/** 當日在場車輛數（進場－出場，不小於 0） */
	const onSiteCount = ref(0);

	/** 點開群組時顯示的群組 key（vehicle_list_id 或 "none"） */
	const selectedVehicleGroupKey = ref<string | null>(null);

	const isLoadingZones = ref(false);
	const isLoadingLogs = ref(false);
	const isLoadingOverview = ref(false);
	const isLoadingCounts = ref(false);

	/** 有 vehicle_access 的地點列表（扁平化） */
	const locations = computed(() =>
		vehicleAccessZones.value.flatMap(zone =>
			(zone.locations || []).map(loc => ({
				...loc,
				zoneId: zone.id,
				zoneName: zone.name,
				locationId: loc.id
			}))
		)
	);

	/** 當前選中的地點（用於篩選與標題） */
	const selectedLocation = computed(() => {
		const id = filters.value.locationId;
		if (!id) return null;
		return locations.value.find(loc => loc.id === id || loc.locationId === id);
	});

	/** 當前選中地點的車道 ID（用於 API lane_id）；無則 undefined */
	const selectedLaneIds = computed((): number[] | undefined => {
		const ids = getLaneIdsForLocation(selectedLocation.value);
		return ids.length ? ids : undefined;
	});

	/**
	 * 載入區域列表（含 vehicle_access 地點）
	 */
	const loadZones = async (): Promise<void> => {
		isLoadingZones.value = true;
		try {
			const result = await locationApi.getZones("vehicle_access");
			const zones = (result.zones || []).map((z: UnifiedZone) => unifiedToVehicleAccessZone(z));
			vehicleAccessZones.value = zones;
		} catch (error) {
			handleError(error, "載入區域列表失敗");
			throw error;
		} finally {
			isLoadingZones.value = false;
		}
	};

	/**
	 * 載入過車記錄列表（依篩選：時間範圍／自訂起迄／車道／搜尋等）
	 */
	const loadLogs = async (): Promise<void> => {
		isLoadingLogs.value = true;
		try {
			const tr = filters.value.timeRange || "today";
			const params: Record<string, unknown> = {
				limit: 5,
				offset: 0,
				orderBy: "trigger_time",
				orderDirection: "DESC"
			};
			if (tr === "custom" && filters.value.startTime && filters.value.endTime) {
				params.startTime = filters.value.startTime;
				params.endTime = filters.value.endTime;
			} else {
				params.timeRange = tr === "custom" ? "today" : tr;
			}
			if (selectedLaneIds.value?.length) {
				params.lane_id = selectedLaneIds.value;
			}
			if (filters.value.search) {
				params.search = filters.value.search;
			}

			const result = await vehicleAccessApi.getVehicleDataLogList(params as any);
			logs.value = result.data || [];
			totalCount.value = result.total ?? result.data?.length ?? 0;
		} catch (error) {
			handleError(error, "載入過車記錄失敗");
			throw error;
		} finally {
			isLoadingLogs.value = false;
		}
	};

	/** 載入當日進場／出場／在場數量（僅計放行 allow_result=1 + lane_type） */
	const loadEntryExitOnSiteCounts = async (): Promise<void> => {
		const laneIds = selectedLaneIds.value;
		if (!laneIds?.length) {
			entryCount.value = 0;
			exitCount.value = 0;
			onSiteCount.value = 0;
			return;
		}
		isLoadingCounts.value = true;
		const tr = filters.value.timeRange || "today";
		const countTime =
			tr === "custom" && filters.value.startTime && filters.value.endTime
				? { startTime: filters.value.startTime, endTime: filters.value.endTime }
				: { timeRange: tr === "custom" ? ("today" as const) : tr };
		try {
			const [entry, exit] = await Promise.all([
				vehicleAccessApi.getVehicleDataLogCount({
					...countTime,
					lane_id: laneIds,
					allow_result: 1,
					lane_type: 1
				}),
				vehicleAccessApi.getVehicleDataLogCount({
					...countTime,
					lane_id: laneIds,
					allow_result: 1,
					lane_type: 2
				})
			]);
			entryCount.value = entry;
			exitCount.value = exit;
			onSiteCount.value = Math.max(0, entry - exit);
		} catch (error) {
			handleError(error, "載入進出場數量失敗");
			entryCount.value = 0;
			exitCount.value = 0;
			onSiteCount.value = 0;
		} finally {
			isLoadingCounts.value = false;
		}
	};

	/** 載入總覽各地點：今日過車筆數、進場／出場／在場（僅計放行） */
	const loadOverviewSummaries = async (): Promise<void> => {
		isLoadingOverview.value = true;
		try {
			const summaries: VehicleAccessLocationSummary[] = [];
			for (const zone of vehicleAccessZones.value) {
				for (const loc of zone.locations || []) {
					const laneIds = getLaneIdsForLocation(loc);
					let todayPassCount = 0;
					let entryCountVal = 0;
					let exitCountVal = 0;
					if (laneIds.length > 0) {
						const [entry, exit] = await Promise.all([
							vehicleAccessApi.getVehicleDataLogCount({
								timeRange: "today",
								lane_id: laneIds,
								allow_result: 1,
								lane_type: 1
							}),
							vehicleAccessApi.getVehicleDataLogCount({
								timeRange: "today",
								lane_id: laneIds,
								allow_result: 1,
								lane_type: 2
							})
						]);
						entryCountVal = entry;
						exitCountVal = exit;
						todayPassCount = entry + exit;
					}
					const currentCountVal = Math.max(0, entryCountVal - exitCountVal);
					summaries.push({
						id: loc.id || `${zone.id}-${loc.name}`,
						zoneId: zone.id || "",
						zoneName: zone.name,
						locationId: loc.id || "",
						name: loc.name,
						todayPassCount,
						entryCount: entryCountVal,
						exitCount: exitCountVal,
						currentCount: currentCountVal
					});
				}
			}
			overviewSummaries.value = summaries;
		} catch (error) {
			handleError(error, "載入總覽失敗");
		} finally {
			isLoadingOverview.value = false;
		}
	};

	const getLocationZone = (location: VehicleAccessLocation & { zoneName?: string }): string | null =>
		location.zoneName ??
		vehicleAccessZones.value.find(z => z.locations?.some(l => l.id === location.id))?.name ??
		null;

	/** 車輛群組（依 vehicle_list_id／name 彙總當日 logs 的進／出／在場） */
	interface VehicleGroupItem {
		key: string;
		id: number;
		name: string;
		entryCount: number;
		exitCount: number;
		onSiteCount: number;
		totalPassCount: number;
	}
	/** 車輛群組：進／出僅計 allow_result=1 且 lane_type=1 或 2 */
	const vehicleGroups = computed<VehicleGroupItem[]>(() => {
		const list = logs.value;
		const map = new Map<string, { id: number; name: string; entry: number; exit: number }>();
		for (const log of list) {
			if (log.allow_result !== 1) continue;
			const lt = log.lane_type ?? null;
			if (lt !== 1 && lt !== 2) continue;
			const id = log.vehicle_list_id ?? -1;
			const name = log.vehicle_list_name?.trim() || "未分組";
			const key = id <= 0 ? "none" : String(id);
			let item = map.get(key);
			if (!item) {
				item = { id, name, entry: 0, exit: 0 };
				map.set(key, item);
			}
			if (lt === 1) item.entry += 1;
			else item.exit += 1;
		}
		return Array.from(map.entries()).map(([key, item]) => ({
			key,
			id: item.id,
			name: item.name,
			entryCount: item.entry,
			exitCount: item.exit,
			onSiteCount: Math.max(0, item.entry - item.exit),
			totalPassCount: item.entry + item.exit
		}));
	});

	/** 選中群組下的當日記錄（供彈窗顯示） */
	const vehicleGroupRecords = computed<VehicleDataLog[]>(() => {
		const key = selectedVehicleGroupKey.value;
		if (!key) return [];
		const list = logs.value;
		if (key === "none") {
			return list.filter(log => log.vehicle_list_id == null || log.vehicle_list_id <= 0);
		}
		const id = Number(key);
		return list.filter(log => log.vehicle_list_id === id);
	});

	const setVehicleGroupSelection = (key: string | null) => {
		selectedVehicleGroupKey.value = key;
	};

	return {
		filters,
		vehicleAccessZones,
		locations,
		selectedLocation,
		selectedLaneIds,
		logs,
		overviewSummaries,
		entryCount,
		exitCount,
		onSiteCount,
		vehicleGroups,
		selectedVehicleGroupKey,
		vehicleGroupRecords,
		isLoadingZones,
		isLoadingLogs,
		loadZones,
		loadLogs,
		loadEntryExitOnSiteCounts,
		loadOverviewSummaries,
		getLocationZone,
		setVehicleGroupSelection
	};
};
