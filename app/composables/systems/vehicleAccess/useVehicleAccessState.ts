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
	startTime?: string | null;
	endTime?: string | null;
	onlyNoGroup?: boolean;
	onlyBlacklist?: boolean;
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

function getLaneIdsForLocation(loc: VehicleAccessLocation | null | undefined): number[] {
	if (!loc) return [];
	const ids: number[] = [];
	if (loc.entryLaneId != null) ids.push(Number(loc.entryLaneId));
	if (loc.exitLaneId != null) ids.push(Number(loc.exitLaneId));
	return ids;
}

function normalizePlate(plate: string | null | undefined): string {
	if (plate == null) return "";
	return String(plate).trim().toUpperCase();
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

	const entryCount = ref(0);
	const exitCount = ref(0);
	const onSiteCount = ref(0);

	const vehicleGroupsFromApi = ref<VehicleGroupFromApi>({ groups: [] });
	const selectedOrganizationKey = ref<string | null>(null);
	const isLoadingVehicleGroups = ref(false);

	const isLoadingZones = ref(false);
	const isLoadingLogs = ref(false);
	const isLoadingOverview = ref(false);
	const isLoadingCounts = ref(false);

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

	const selectedLocation = computed(() => {
		const id = filters.value.locationId;
		if (!id) return null;
		return locations.value.find(loc => loc.id === id || loc.locationId === id);
	});

	const selectedLaneIds = computed((): number[] | undefined => {
		const ids = getLaneIdsForLocation(selectedLocation.value);
		return ids.length ? ids : undefined;
	});

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

	const loadLogs = async (): Promise<void> => {
		isLoadingLogs.value = true;
		try {
			const tr = filters.value.timeRange || "today";
			const params: Record<string, unknown> = {
				limit: 10,
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

	const organizationGroups = computed<VehicleOrganizationGroupItem[]>(() => {
		const apiGroups = vehicleGroupsFromApi.value.groups ?? [];
		const logList = logs.value;
		const laneIds = selectedLaneIds.value;
		const laneSet = laneIds?.length ? new Set(laneIds) : null;

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
