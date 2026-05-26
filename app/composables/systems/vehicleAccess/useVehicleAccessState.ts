/**
 * 車輛進出狀態（地點、當日記錄、進出場／在場數量、人員群組／車輛群組）
 */

import { ref, computed } from "vue";
import { setupDebouncedRefetchListeners } from "~/composables/websocket/useWebSocket";
import type { YscpEventPayload } from "~/types/websocket";
import type {
	VehicleDataLog,
	VehicleAccessLocationSummary,
	VehicleAccessZone,
	VehicleAccessLocation,
	VehicleOrganizationGroupItem,
	VehicleGroupMemberItem,
	VehicleGroupFromApi
} from "~/types/vehicleAccess";
import type { PersonGroup } from "~/types/personnel";
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi";
import {
	useVehicleAccessSitesApi,
	VEHICLE_ACCESS_FULL_REPORT_LIMIT
} from "~/composables/systems/vehicleAccess/useVehicleAccessSitesApi";
import type { VehicleAccessDataSource } from "~/types/vehicleAccess";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi";
import { unifiedToVehicleAccessZone } from "~/utils/locationAdapter";
import { normalizePlate } from "~/utils/vehicleAccessUtils";
import {
	buildGroupMemberFromLogs,
	countReleasedPassages
} from "~/utils/vehicleAccessPassageStats";
import type { UnifiedZone } from "~/types/location";
import { compareZonesLoose } from "~/utils/sortOrder";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import { shouldHideVehicleAccessWhenYscpOff } from "~/utils/vehicleAccessDataSource";

const MAIN_LOG_LIMIT = 5;
const TODAY_TIME = { timeRange: "today" as const };

const YSCP_VEHICLE_EVENT = "yscp:event:vehicle";
const ISAPI_VEHICLE_EVENT = "vehicle-access:isapi-camera:event";

export interface VehicleAccessFilters {
	locationId: string | null;
}

const getDefaultFilters = (): VehicleAccessFilters => ({
	locationId: null
});

const getLaneIds = (loc: VehicleAccessLocation | null | undefined): number[] => {
	if (!loc) return [];
	const ids: number[] = [];
	if (loc.entryLaneId != null) ids.push(Number(loc.entryLaneId));
	if (loc.exitLaneId != null) ids.push(Number(loc.exitLaneId));
	return ids;
};

const getDataSource = (loc: VehicleAccessLocation | null | undefined): VehicleAccessDataSource =>
	loc?.dataSource === "isapi_camera" ? "isapi_camera" : "yscp";

const resolveSiteId = (loc: VehicleAccessLocation | null | undefined): number | null => {
	const n = Number(loc?.id ?? loc?.locationId);
	return Number.isFinite(n) ? n : null;
};

const releasedLogs = (logList: VehicleDataLog[]) =>
	logList.filter(log => log.allow_result === 1 && (log.lane_type === 1 || log.lane_type === 2));

const toOptionalIdSet = (ids?: number[]) => (ids?.length ? new Set(ids) : null);

export const useVehicleAccessState = () => {
	const vehicleAccessApi = useVehicleAccessApi();
	const vehicleAccessSitesApi = useVehicleAccessSitesApi();
	const locationApi = useLocationApi();
	const personnelApi = usePersonnelApi();
	const { handleError } = useErrorHandler();
	const { enableYscpVehicleAccess } = useModuleRegistry();

	const filters = ref<VehicleAccessFilters>(getDefaultFilters());
	const vehicleAccessZones = ref<VehicleAccessZone[]>([]);
	const logs = ref<VehicleDataLog[]>([]);
	const overviewSummaries = ref<VehicleAccessLocationSummary[]>([]);
	const entryCount = ref(0);
	const exitCount = ref(0);
	const onSiteCount = ref(0);

	const vehicleGroupsFromApi = ref<VehicleGroupFromApi>({ groups: [] });
	const personGroupsForVehicle = ref<PersonGroup[]>([]);
	const personGroupVehicleList = ref<VehicleGroupMemberItem[]>([]);
	const selectedOrganizationKey = ref<string | null>(null);
	const isLoadingVehicleGroups = ref(false);
	const isLoadingZones = ref(false);
	const isLoadingLogs = ref(false);
	const isLoadingOverview = ref(false);
	const isLoadingCounts = ref(false);

	const locations = computed(() =>
		[...vehicleAccessZones.value]
			.sort((a, b) => compareZonesLoose(a, b))
			.flatMap(zone =>
				(zone.locations || [])
					.filter(
						loc =>
							!shouldHideVehicleAccessWhenYscpOff(loc.dataSource, enableYscpVehicleAccess.value)
					)
					.map(loc => ({ ...loc, zoneId: zone.id, zoneName: zone.name, locationId: loc.id }))
			)
	);

	const selectedLocation = computed(() => {
		const id = filters.value.locationId;
		if (!id) return null;
		return locations.value.find(loc => loc.id === id || loc.locationId === id);
	});

	const laneIds = computed(() => getLaneIds(selectedLocation.value));

	const isIsapiCamera = computed(() => getDataSource(selectedLocation.value) === "isapi_camera");

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

	const loadLogs = async (): Promise<void> => {
		isLoadingLogs.value = true;
		try {
			const loc = selectedLocation.value;
			const siteId = resolveSiteId(loc);

			if (isIsapiCamera.value && siteId != null) {
				const result = await vehicleAccessSitesApi.getSiteLogs(siteId, {
					limit: MAIN_LOG_LIMIT,
					...TODAY_TIME
				});
				logs.value = result.logs || [];
				return;
			}

			const ids = laneIds.value;
			if (!ids.length) {
				logs.value = [];
				return;
			}
			const result = await vehicleAccessApi.getVehicleDataLogList({
				limit: MAIN_LOG_LIMIT,
				offset: 0,
				orderBy: "trigger_time",
				orderDirection: "DESC",
				lane_id: ids,
				...TODAY_TIME
			});
			logs.value = result.data || [];
		} catch (error) {
			handleError(error, "載入過車記錄失敗");
			throw error;
		} finally {
			isLoadingLogs.value = false;
		}
	};

	const loadEntryExitOnSiteCounts = async (): Promise<void> => {
		const siteId = resolveSiteId(selectedLocation.value);
		const ids = laneIds.value;

		if (isIsapiCamera.value) {
			if (siteId == null) {
				entryCount.value = 0;
				exitCount.value = 0;
				onSiteCount.value = 0;
				return;
			}
			isLoadingCounts.value = true;
			try {
				const stats = await vehicleAccessSitesApi.getSiteStats(siteId, TODAY_TIME);
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

		if (!ids.length) {
			entryCount.value = 0;
			exitCount.value = 0;
			onSiteCount.value = 0;
			return;
		}
		isLoadingCounts.value = true;
		try {
			const [entry, exit] = await Promise.all([
				vehicleAccessApi.getVehicleDataLogCount({
					...TODAY_TIME,
					lane_id: ids,
					allow_result: 1,
					lane_type: 1
				}),
				vehicleAccessApi.getVehicleDataLogCount({
					...TODAY_TIME,
					lane_id: ids,
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
						continue;
					}
					const ids = getLaneIds(loc);
					let entryCountVal = 0;
					let exitCountVal = 0;
					if (ids.length > 0) {
						const [entry, exit] = await Promise.all([
							vehicleAccessApi.getVehicleDataLogCount({
								...TODAY_TIME,
								lane_id: ids,
								allow_result: 1,
								lane_type: 1
							}),
							vehicleAccessApi.getVehicleDataLogCount({
								...TODAY_TIME,
								lane_id: ids,
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
		const logList = logs.value;
		const loc = selectedLocation.value;

		if (isIsapiCamera.value) {
			const personGroupFilter = toOptionalIdSet(loc?.personGroupIds);
			return personGroupsForVehicle.value
				.filter(g => !personGroupFilter || personGroupFilter.has(g.id))
				.map(g => {
				const stats = countReleasedPassages(logList, log => log.organization_id === g.id);
				return {
					groupKey: `pg_${g.id}`,
					personGroupId: g.id,
					personGroupName: g.name ?? `群組 ${g.id}`,
					vehicleCount: 0,
					...stats
				};
			});
		}

		const laneSet = laneIds.value.length ? new Set(laneIds.value) : null;
		const vehicleGroupFilter = toOptionalIdSet(loc?.vehicleGroupIds);
		return (vehicleGroupsFromApi.value.groups ?? [])
			.filter(g => (g.id ?? 0) !== 0)
			.filter(g => !vehicleGroupFilter || vehicleGroupFilter.has(g.id ?? 0))
			.map(g => {
				const groupId = g.id ?? 0;
				const plates = new Set(
					(g.vehicles ?? []).map(v => normalizePlate(v.plate_license)).filter(Boolean)
				);
				const stats = countReleasedPassages(logList, log => {
					if (laneSet != null && log.lane_id != null && !laneSet.has(log.lane_id)) return false;
					return plates.has(normalizePlate(log.license_plate));
				});
				return {
					groupKey: `vg_${groupId}`,
					personGroupId: groupId,
					personGroupName: g.list_name ?? `群組 ${groupId}`,
					vehicleCount: g.vehicles?.length ?? 0,
					...stats
				};
			});
	});

	const organizationGroupVehicleList = computed<VehicleGroupMemberItem[]>(() => {
		if (isIsapiCamera.value) return personGroupVehicleList.value;

		const key = selectedOrganizationKey.value;
		const match = key?.match(/^vg_(\d+)$/);
		if (!match) return [];
		const group = (vehicleGroupsFromApi.value.groups ?? []).find(g => (g.id ?? 0) === Number(match[1]));
		if (!group?.vehicles?.length) return [];

		const laneSet = laneIds.value.length ? new Set(laneIds.value) : null;
		const plates = new Set(group.vehicles.map(v => normalizePlate(v.plate_license)).filter(Boolean));
		const valid = releasedLogs(logs.value).filter(log => {
			if (laneSet != null && log.lane_id != null && !laneSet.has(log.lane_id)) return false;
			return plates.has(normalizePlate(log.license_plate));
		});

		return group.vehicles.map(v =>
			buildGroupMemberFromLogs(v.plate_license ?? "", v.owner_name ?? null, v.vehicle_id, valid)
		);
	});

	const loadOrganizationData = async (): Promise<void> => {
		isLoadingVehicleGroups.value = true;
		try {
			if (isIsapiCamera.value) {
				const groups = await personnelApi.getPersonGroups({ tree: false });
				personGroupsForVehicle.value = Array.isArray(groups)
					? groups.filter(g => g.id != null && g.name?.trim())
					: [];
			} else {
				vehicleGroupsFromApi.value = (await vehicleAccessApi.getVehicleGroups()) ?? { groups: [] };
			}
		} catch (error) {
			handleError(error, isIsapiCamera.value ? "載入人員群組失敗" : "載入車輛群組失敗");
			if (isIsapiCamera.value) personGroupsForVehicle.value = [];
			else vehicleGroupsFromApi.value = { groups: [] };
		} finally {
			isLoadingVehicleGroups.value = false;
		}
	};

	const loadTodayReleasedLogsForGroupDialog = async (): Promise<VehicleDataLog[]> => {
		const siteId = resolveSiteId(selectedLocation.value);
		if (isIsapiCamera.value && siteId != null) {
			const result = await vehicleAccessSitesApi.getSiteLogs(siteId, {
				limit: VEHICLE_ACCESS_FULL_REPORT_LIMIT,
				...TODAY_TIME
			});
			return releasedLogs(result.logs || []);
		}
		return releasedLogs(logs.value);
	};

	const loadPersonGroupVehicleList = async (groupKey: string | null): Promise<void> => {
		personGroupVehicleList.value = [];
		if (!groupKey?.startsWith("pg_")) return;
		const groupId = Number(groupKey.slice(3));
		if (!Number.isFinite(groupId)) return;

		const valid = await loadTodayReleasedLogsForGroupDialog();
		try {
			const page = await personnelApi.getPersonGroupMembers(groupId, { limit: 500, status: "active" });
			const items: VehicleGroupMemberItem[] = [];
			for (const person of page.items ?? []) {
				const ownerName = person.full_name?.trim() || null;
				const plates = (person.license_plates ?? [])
					.map(p => p.plate_number?.trim())
					.filter(Boolean) as string[];
				if (!plates.length) {
					items.push({ id: person.id, plate_license: "—", owner_name: ownerName, isPresent: false });
					continue;
				}
				for (const plate of plates) {
					items.push(buildGroupMemberFromLogs(plate, ownerName, person.id, valid));
				}
			}
			personGroupVehicleList.value = items;
		} catch (error) {
			handleError(error, "載入群組車輛名單失敗");
		}
	};

	const loadFullReportLogs = async (options: { startTime: string; endTime: string }): Promise<VehicleDataLog[]> => {
		const siteId = resolveSiteId(selectedLocation.value);
		if (isIsapiCamera.value && siteId != null) {
			const result = await vehicleAccessSitesApi.getSiteLogs(siteId, {
				limit: VEHICLE_ACCESS_FULL_REPORT_LIMIT,
				startTime: options.startTime,
				endTime: options.endTime
			});
			return result.logs || [];
		}
		const ids = laneIds.value;
		if (!ids.length) return [];
		const result = await vehicleAccessApi.getVehicleDataLogList({
			lane_id: ids,
			startTime: options.startTime,
			endTime: options.endTime,
			limit: VEHICLE_ACCESS_FULL_REPORT_LIMIT,
			orderBy: "trigger_time",
			orderDirection: "ASC"
		});
		return result.data ?? [];
	};

	const setupEventListeners = (onRefetch: () => void | Promise<void>, debounceMs = 500) =>
		setupDebouncedRefetchListeners(
			onRefetch,
			[
				{
					event: YSCP_VEHICLE_EVENT,
					enabled: enableYscpVehicleAccess,
					accept: (data?: unknown) => {
						const p = data as YscpEventPayload | undefined;
						return !p?.type || p.type === "vehicle_access";
					}
				},
				{ event: ISAPI_VEHICLE_EVENT }
			],
			debounceMs,
			"VehicleAccess WebSocket"
		);

	return {
		filters,
		vehicleAccessZones,
		locations,
		selectedLocation,
		isIsapiCamera,
		logs,
		overviewSummaries,
		entryCount,
		exitCount,
		onSiteCount,
		organizationGroups,
		selectedOrganizationKey,
		organizationGroupVehicleList,
		isLoadingVehicleGroups,
		loadOrganizationData,
		loadPersonGroupVehicleList,
		loadFullReportLogs,
		setSelectedOrganizationKey: (key: string | null) => {
			selectedOrganizationKey.value = key;
		},
		isLoadingZones,
		isLoadingLogs,
		loadZones,
		loadLogs,
		loadEntryExitOnSiteCounts,
		loadOverviewSummaries,
		getLocationZone,
		setupEventListeners
	};
};
