/**
 * 車輛進出狀態（地點、當日記錄、進出場／在場數量、車輛群組）
 */

import { ref, computed } from "vue";
import type {
	VehicleDataLog,
	VehicleAccessLocationSummary,
	VehicleAccessZone,
	VehicleAccessLocation,
	VehicleOrganizationGroupItem,
	VehicleGroupMemberItem,
	VehicleGroupFromApi
} from "~/types/vehicleAccess";
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi";
import { useVehicleAccessSitesApi } from "~/composables/systems/vehicleAccess/useVehicleAccessSitesApi";
import type { VehicleAccessDataSource } from "~/types/vehicleAccess";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { unifiedToVehicleAccessZone } from "~/utils/locationAdapter";
import { normalizePlate } from "~/utils/vehicleAccessUtils";
import type { UnifiedZone } from "~/types/location";
import { compareZonesLoose } from "~/utils/sortOrder";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import { shouldHideVehicleAccessWhenYscpOff } from "~/utils/vehicleAccessDataSource";

/** 時間範圍：今日、昨日、自訂 */
export type VehicleAccessTimeRange = "today" | "yesterday" | "custom";

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

const getLocationDataSource = (
	loc: VehicleAccessLocation | null | undefined
): VehicleAccessDataSource => (loc?.dataSource === "isapi_camera" ? "isapi_camera" : "yscp");

const resolveSiteId = (loc: VehicleAccessLocation | null | undefined): number | null => {
	if (!loc) return null;
	const raw = loc.id ?? loc.locationId;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
};

export const useVehicleAccessState = () => {
	const vehicleAccessApi = useVehicleAccessApi();
	const vehicleAccessSitesApi = useVehicleAccessSitesApi();
	const locationApi = useLocationApi();
	const { handleError } = useErrorHandler();
	const { enableYscpVehicleAccess } = useModuleRegistry();

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

	/** 車輛群組彙總（anpr.vehicle_custom_list + vehicle_and_list_relation + platform.vehicle_list，不含人員大頭照） */
	const vehicleGroupsFromApi = ref<VehicleGroupFromApi>({ groups: [] });
	/** 選中的車輛群組 key（"vg_1" = 群組 id），用於彈窗顯示該群組車輛名單 */
	const selectedOrganizationKey = ref<string | null>(null);
	const isLoadingVehicleGroups = ref(false);

	const isLoadingZones = ref(false);
	const isLoadingLogs = ref(false);
	const isLoadingOverview = ref(false);
	const isLoadingCounts = ref(false);

	/** 有 vehicle_access 的地點列表（扁平化；YSCP 關閉時略過 yscp 地點，與後端 getSites 一致） */
	const locations = computed(() =>
		[...vehicleAccessZones.value]
			.sort((a, b) => compareZonesLoose(a, b))
			.flatMap(zone =>
				(zone.locations || [])
					.filter(
						loc =>
							!shouldHideVehicleAccessWhenYscpOff(loc.dataSource, enableYscpVehicleAccess.value)
					)
					.map(loc => ({
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
			vehicleAccessZones.value = [...zones].sort((a, b) => compareZonesLoose(a, b));
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
			const loc = selectedLocation.value;
			const siteId = resolveSiteId(loc);
			const tr = filters.value.timeRange || "today";
			const timeParams =
				tr === "custom" && filters.value.startTime && filters.value.endTime
					? { startTime: filters.value.startTime, endTime: filters.value.endTime }
					: { timeRange: tr === "custom" ? ("today" as const) : tr };

			if (getLocationDataSource(loc) === "isapi_camera" && siteId != null) {
				const result = await vehicleAccessSitesApi.getSiteLogs(siteId, {
					limit: 10,
					offset: 0,
					...timeParams,
					search: filters.value.search || undefined
				});
				logs.value = result.logs || [];
				totalCount.value = result.total ?? logs.value.length;
			} else {
				const params: Record<string, unknown> = {
					limit: 10,
					offset: 0,
					orderBy: "trigger_time",
					orderDirection: "DESC",
					...timeParams
				};
				if (selectedLaneIds.value?.length) {
					params.lane_id = selectedLaneIds.value;
				}
				if (filters.value.search) {
					params.search = filters.value.search;
				}
				const result = await vehicleAccessApi.getVehicleDataLogList(params as any);
				logs.value = result.data || [];
				totalCount.value = result.total ?? result.data?.length ?? 0;
			}
		} catch (error) {
			handleError(error, "載入過車記錄失敗");
			throw error;
		} finally {
			isLoadingLogs.value = false;
		}
	};

	/** 載入當日進場／出場／在場數量（僅計放行 allow_result=1 + lane_type） */
	const loadEntryExitOnSiteCounts = async (): Promise<void> => {
		const loc = selectedLocation.value;
		const siteId = resolveSiteId(loc);
		const laneIds = selectedLaneIds.value;
		const tr = filters.value.timeRange || "today";
		const countTime =
			tr === "custom" && filters.value.startTime && filters.value.endTime
				? { startTime: filters.value.startTime, endTime: filters.value.endTime }
				: { timeRange: tr === "custom" ? ("today" as const) : tr };

		if (getLocationDataSource(loc) === "isapi_camera") {
			if (siteId == null) {
				entryCount.value = 0;
				exitCount.value = 0;
				onSiteCount.value = 0;
				return;
			}
			isLoadingCounts.value = true;
			try {
				const stats = await vehicleAccessSitesApi.getSiteStats(siteId, countTime);
				entryCount.value = stats.entryCount;
				exitCount.value = stats.exitCount;
				onSiteCount.value = stats.currentCount;
			} catch (error) {
				handleError(error, "載入進出場數量失敗");
				entryCount.value = 0;
				exitCount.value = 0;
				onSiteCount.value = 0;
			} finally {
				isLoadingCounts.value = false;
			}
			return;
		}

		if (!laneIds?.length) {
			entryCount.value = 0;
			exitCount.value = 0;
			onSiteCount.value = 0;
			return;
		}
		isLoadingCounts.value = true;
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

	/** 載入總覽各地點：依當前篩選時間範圍的過車筆數、進場／出場／在場（僅計放行） */
	const loadOverviewSummaries = async (): Promise<void> => {
		isLoadingOverview.value = true;
		try {
			const { sites } = await vehicleAccessSitesApi.getSites();
			const siteById = new Map(sites.map(s => [s.id, s]));
			const summaries: VehicleAccessLocationSummary[] = [];
			for (const zone of vehicleAccessZones.value) {
				for (const loc of zone.locations || []) {
					if (shouldHideVehicleAccessWhenYscpOff(loc.dataSource, enableYscpVehicleAccess.value)) {
						continue;
					}
					const siteId = resolveSiteId(loc);
					const site = siteId != null ? siteById.get(siteId) : undefined;
					if (site) {
						summaries.push({
							id: loc.id || `${zone.id}-${loc.name}`,
							zoneId: zone.id || "",
							zoneName: zone.name,
							locationId: loc.id || "",
							name: loc.name,
							todayPassCount: site.entryCount + site.exitCount,
							entryCount: site.entryCount,
							exitCount: site.exitCount,
							currentCount: site.currentCount
						});
					} else {
						const laneIds = getLaneIdsForLocation(loc);
						let entryCountVal = 0;
						let exitCountVal = 0;
						if (laneIds.length > 0) {
							const tr = filters.value.timeRange || "today";
							const countTime =
								tr === "custom" && filters.value.startTime && filters.value.endTime
									? { startTime: filters.value.startTime, endTime: filters.value.endTime }
									: { timeRange: tr === "custom" ? ("today" as const) : tr };
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
							entryCountVal = entry;
							exitCountVal = exit;
						}
						summaries.push({
							id: loc.id || `${zone.id}-${loc.name}`,
							zoneId: zone.id || "",
							zoneName: zone.name,
							locationId: loc.id || "",
							name: loc.name,
							todayPassCount: entryCountVal + exitCountVal,
							entryCount: entryCountVal,
							exitCount: exitCountVal,
							currentCount: Math.max(0, entryCountVal - exitCountVal)
						});
					}
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

	/**
	 * 車輛群組（來源：anpr.vehicle_custom_list list_type=0；不含未分類；進出／在場由 passageway_log_data 計算）
	 */
	const organizationGroups = computed<VehicleOrganizationGroupItem[]>(() => {
		const apiGroups = (vehicleGroupsFromApi.value.groups ?? []).filter(
			(g) => (g.id ?? 0) !== 0
		);
		const logList = logs.value;
		const laneIds = selectedLaneIds.value;
		const laneSet =
			getLocationDataSource(selectedLocation.value) === "isapi_camera"
				? null
				: laneIds?.length
					? new Set(laneIds)
					: null;

		const result: VehicleOrganizationGroupItem[] = [];

		for (const g of apiGroups) {
			const groupId = g.id ?? 0;
			const groupKey = `vg_${groupId}`;
			const vehicles = g.vehicles ?? [];
			const plates = new Set(vehicles.map(v => normalizePlate(v.plate_license)).filter(Boolean));

			let entry = 0;
			let exit = 0;
			for (const log of logList) {
				if (log.allow_result !== 1) continue;
				const lt = log.lane_type ?? null;
				if (lt !== 1 && lt !== 2) continue;
				if (laneSet != null && log.lane_id != null && !laneSet.has(log.lane_id)) continue;
				if (!plates.has(normalizePlate(log.license_plate))) continue;
				if (lt === 1) entry += 1;
				else exit += 1;
			}

			result.push({
				groupKey,
				personGroupId: groupId,
				personGroupName: g.list_name ?? (groupId === 0 ? "未分類" : `群組 ${groupId}`),
				vehicleCount: vehicles.length,
				entryCount: entry,
				exitCount: exit,
				onSiteCount: Math.max(0, entry - exit)
			});
		}

		return result;
	});

	/**
	 * 選中群組的車輛名單（來自 anpr + platform.vehicle_list；含進出場時間，不含人員大頭照）
	 */
	const organizationGroupVehicleList = computed<VehicleGroupMemberItem[]>(() => {
		const key = selectedOrganizationKey.value;
		if (!key) return [];
		const match = key.match(/^vg_(\d+)$/);
		if (!match) return [];
		const groupId = Number(match[1]);
		const apiGroups = vehicleGroupsFromApi.value.groups ?? [];
		const group = apiGroups.find(g => (g.id ?? 0) === groupId);
		if (!group) return [];
		const vehicles = group.vehicles ?? [];
		const logList = logs.value;
		const laneIds = selectedLaneIds.value;
		const laneSet = laneIds?.length ? new Set(laneIds) : null;
		const plates = new Set(vehicles.map(v => normalizePlate(v.plate_license)).filter(Boolean));

		const validLogs = logList.filter(log => {
			if (log.allow_result !== 1 || (log.lane_type !== 1 && log.lane_type !== 2)) return false;
			if (laneSet != null && log.lane_id != null && !laneSet.has(log.lane_id)) return false;
			return plates.has(normalizePlate(log.license_plate));
		});

		const result: VehicleGroupMemberItem[] = [];
		for (const v of vehicles) {
			const plateNorm = normalizePlate(v.plate_license);
			const plateLogs = validLogs
				.filter(log => normalizePlate(log.license_plate) === plateNorm)
				.map(log => ({ ...log, t: new Date(log.trigger_time ?? 0).getTime() }))
				.sort((a, b) => b.t - a.t);

			let lastEntryDate: string | null = null;
			let entryTime: string | null = null;
			let exitTime: string | null = null;
			let isPresent = false;

			const lastEntry = plateLogs.find(l => l.lane_type === 1);
			if (lastEntry) {
				const d = new Date(lastEntry.trigger_time ?? "");
				lastEntryDate = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
				entryTime = lastEntry.trigger_time
					? new Date(lastEntry.trigger_time).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
					: null;
				const exitAfter = plateLogs.find(l => l.lane_type === 2 && new Date(l.trigger_time ?? 0).getTime() > (lastEntry.t ?? 0));
				if (exitAfter) {
					exitTime = exitAfter.trigger_time
						? new Date(exitAfter.trigger_time).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
						: null;
				} else {
					isPresent = true;
				}
			}

			result.push({
				id: v.vehicle_id,
				plate_license: v.plate_license,
				owner_name: v.owner_name ?? null,
				lastEntryDate: lastEntryDate ?? undefined,
				entryTime: entryTime ?? undefined,
				exitTime: exitTime ?? undefined,
				isPresent
			});
		}
		return result;
	});

	const setSelectedOrganizationKey = (key: string | null) => {
		selectedOrganizationKey.value = key;
	};

	/** 載入車輛群組彙總（anpr.vehicle_custom_list + vehicle_and_list_relation + platform.vehicle_list） */
	const loadVehicleGroups = async (): Promise<void> => {
		isLoadingVehicleGroups.value = true;
		try {
			const data = await vehicleAccessApi.getVehicleGroups();
			vehicleGroupsFromApi.value = data ?? { groups: [] };
		} catch (error) {
			handleError(error, "載入車輛群組失敗");
			vehicleGroupsFromApi.value = { groups: [] };
		} finally {
			isLoadingVehicleGroups.value = false;
		}
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
		organizationGroups,
		selectedOrganizationKey,
		organizationGroupVehicleList,
		vehicleGroupsFromApi,
		isLoadingVehicleGroups,
		loadVehicleGroups,
		setSelectedOrganizationKey,
		isLoadingZones,
		isLoadingLogs,
		loadZones,
		loadLogs,
		loadEntryExitOnSiteCounts,
		loadOverviewSummaries,
		getLocationZone
	};
};
