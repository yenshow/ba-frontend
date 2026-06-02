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
import { buildLogsTimeQuery } from "~/utils/entryExitTimeRange";
import type { VehicleAccessDataSource } from "~/types/vehicleAccess";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi";
import { unifiedToVehicleAccessZone } from "~/utils/locationAdapter";
import {
	buildGroupMemberPresenceFromLogs,
	countReleasedPassages,
	normalizePlate,
	releasedLogs as releasedPassageLogs
} from "~/utils/vehicleAccessPassageStats";
import { buildPersonGroupMemberItems } from "~/utils/vehicleAccessPersonGroup";
import type { UnifiedZone } from "~/types/location";
import { compareZonesLoose } from "~/utils/sortOrder";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import { shouldHideVehicleAccessWhenYscpOff } from "~/utils/vehicleAccessDataSource";

const MAIN_LOG_LIMIT = 5;
const TODAY_TIME = { timeRange: "today" as const };

const YSCP_VEHICLE_EVENT = "yscp:event:vehicle";
const ISAPI_VEHICLE_EVENT = "vehicle-access:isapi-camera:event";

type PersonGroupCacheEntry = {
	total: number;
	onSite: number;
	items: VehicleGroupMemberItem[];
};

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

const getOperationMode = (loc: VehicleAccessLocation | null | undefined) =>
	loc?.operationMode === "parking" ? "parking" : "construction_flow";

const resolveSiteId = (loc: VehicleAccessLocation | null | undefined): number | null => {
	const n = Number(loc?.id ?? loc?.locationId);
	return Number.isFinite(n) ? n : null;
};

const toOptionalIdSet = (ids?: number[]) => (ids?.length ? new Set(ids) : null);

const buildVehicleGroupMemberFromLogs = (
	plate: string,
	ownerName: string | null,
	personId: number,
	validLogs: VehicleDataLog[]
): VehicleGroupMemberItem => {
	const presence = buildGroupMemberPresenceFromLogs(plate, validLogs);
	return {
		id: personId,
		name: ownerName?.trim() || plate,
		plate_license: plate,
		owner_name: ownerName,
		lastEntryDate: presence.lastEntryDate,
		entryTime: presence.entryTime,
		exitTime: presence.exitTime,
		isPresent: presence.isPresent
	};
};

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
	const todayPassageLogs = ref<VehicleDataLog[]>([]);
	const todayPassageSiteId = ref<number | null>(null);
	const overviewSummaries = ref<VehicleAccessLocationSummary[]>([]);
	const entryCount = ref(0);
	const exitCount = ref(0);
	const onSiteCount = ref(0);
	const onSiteCapacity = ref<number | null>(null);

	const vehicleGroupsFromApi = ref<VehicleGroupFromApi>({ groups: [] });
	const personGroupsForVehicle = ref<PersonGroup[]>([]);
	const personGroupCacheById = ref<Record<number, PersonGroupCacheEntry>>({});
	const presentPlatesSet = ref<Set<string>>(new Set());
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
	const isParkingMode = computed(
		() => isIsapiCamera.value && getOperationMode(selectedLocation.value) === "parking"
	);

	const filterLogsByLaneIds = (logList: VehicleDataLog[], ids: number[]) => {
		const laneSet = ids.length ? new Set(ids) : null;
		if (laneSet == null) return logList;
		return logList.filter(log => log.lane_id == null || laneSet.has(log.lane_id));
	};

	const filterTodayLogsForLanes = (logList: VehicleDataLog[]) =>
		filterLogsByLaneIds(logList, laneIds.value);

	const todayReleasedLogs = computed(() =>
		releasedPassageLogs(filterTodayLogsForLanes(todayPassageLogs.value))
	);

	const loadZones = async (): Promise<void> => {
		isLoadingZones.value = true;
		try {
			const result = await locationApi.getZones("vehicle_access");
			const yscpOn = enableYscpVehicleAccess.value;
			const zones = (result.zones || [])
				.map((z: UnifiedZone) => unifiedToVehicleAccessZone(z))
				.map((z: VehicleAccessZone) => ({
					...z,
					locations: (z.locations || []).filter(
						(loc: VehicleAccessLocation) =>
							!shouldHideVehicleAccessWhenYscpOff(loc.dataSource, yscpOn)
					)
				}));
			vehicleAccessZones.value = [...zones].sort((a, b) => compareZonesLoose(a, b));
		} catch (error) {
			handleError(error, "載入區域列表失敗");
			throw error;
		} finally {
			isLoadingZones.value = false;
		}
	};

	const loadTodayPassageLogs = async (force = false): Promise<void> => {
		const siteId = resolveSiteId(selectedLocation.value);
		if (siteId == null) {
			todayPassageLogs.value = [];
			todayPassageSiteId.value = null;
			return;
		}
		if (!force && siteId === todayPassageSiteId.value && todayPassageLogs.value.length > 0) {
			return;
		}
		try {
			if (isIsapiCamera.value) {
				if (isParkingMode.value) {
					const result = await vehicleAccessSitesApi.getSiteLogs(siteId, {
						limit: VEHICLE_ACCESS_FULL_REPORT_LIMIT
					});
					todayPassageLogs.value = result.logs || [];
				} else {
					const result = await vehicleAccessSitesApi.getSiteLogs(siteId, {
						limit: VEHICLE_ACCESS_FULL_REPORT_LIMIT,
						...TODAY_TIME
					});
					todayPassageLogs.value = result.logs || [];
				}
			} else {
				const ids = laneIds.value;
				if (!ids.length) {
					todayPassageLogs.value = [];
				} else {
					const result = await vehicleAccessApi.getVehicleDataLogList({
						limit: VEHICLE_ACCESS_FULL_REPORT_LIMIT,
						offset: 0,
						orderBy: "trigger_time",
						orderDirection: "DESC",
						lane_id: ids,
						...TODAY_TIME
					});
					todayPassageLogs.value = result.data || [];
				}
			}
			todayPassageSiteId.value = siteId;
		} catch {
			todayPassageLogs.value = [];
			todayPassageSiteId.value = null;
		}
	};

	const loadLogs = async (): Promise<void> => {
		isLoadingLogs.value = true;
		try {
			await loadTodayPassageLogs();
			logs.value = todayPassageLogs.value.slice(0, MAIN_LOG_LIMIT);
		} catch (error) {
			handleError(error, "載入過車記錄失敗");
			throw error;
		} finally {
			isLoadingLogs.value = false;
		}
	};

	const loadEntryExitOnSiteCounts = async (): Promise<void> => {
		const siteId = resolveSiteId(selectedLocation.value);
		if (siteId == null) {
			entryCount.value = 0;
			exitCount.value = 0;
			onSiteCount.value = 0;
			onSiteCapacity.value = null;
			return;
		}
		isLoadingCounts.value = true;
		try {
			if (isParkingMode.value) {
				const session = await vehicleAccessSitesApi.getSiteSessionStats(siteId);
				entryCount.value = session.entryCount;
				exitCount.value = session.exitCount;
				const presence = await vehicleAccessSitesApi.getSitePresence(siteId);
				onSiteCount.value = presence.currentCount;
				onSiteCapacity.value = presence.capacity;
			} else {
				const stats = await vehicleAccessSitesApi.getSiteStats(siteId, TODAY_TIME);
				entryCount.value = stats.entryCount;
				exitCount.value = stats.exitCount;
				onSiteCount.value = stats.currentCount;
				onSiteCapacity.value = null;
			}
		} catch (error) {
			handleError(error, "載入進出場數量失敗");
			entryCount.value = 0;
			exitCount.value = 0;
			onSiteCount.value = 0;
			onSiteCapacity.value = null;
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
					const siteId = resolveSiteId(loc);
					const site = siteId != null ? siteById.get(siteId) : undefined;
					summaries.push({
						id: loc.id || `${zone.id}-${loc.name}`,
						zoneId: zone.id || "",
						zoneName: zone.name,
						locationId: loc.id || "",
						name: loc.name,
						todayPassCount: (site?.entryCount ?? 0) + (site?.exitCount ?? 0),
						entryCount: site?.entryCount ?? 0,
						exitCount: site?.exitCount ?? 0,
						currentCount: site?.currentCount ?? 0
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

	const getOrganizationGroupsForLocation = (
		loc: VehicleAccessLocation | null | undefined
	): VehicleOrganizationGroupItem[] => {
		if (!loc) return [];

		if (getDataSource(loc) === "isapi_camera") {
			const personGroupFilter = toOptionalIdSet(loc.personGroupIds);
			return personGroupsForVehicle.value
				.filter(g => !personGroupFilter || personGroupFilter.has(g.id))
				.map(g => {
					const cache = personGroupCacheById.value[g.id];
					return {
						groupKey: `pg_${g.id}`,
						personGroupId: g.id,
						personGroupName: g.name ?? `群組 ${g.id}`,
						vehicleCount: cache?.total ?? 0,
						entryCount: 0,
						exitCount: 0,
						onSiteCount: cache?.onSite ?? 0
					};
				});
		}

		const locLaneIds = getLaneIds(loc);
		const laneSet = locLaneIds.length ? new Set(locLaneIds) : null;
		const logList = releasedPassageLogs(
			filterLogsByLaneIds(todayPassageLogs.value, getLaneIds(loc))
		);
		const vehicleGroupFilter = toOptionalIdSet(loc.vehicleGroupIds);
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
	};

	const organizationGroups = computed<VehicleOrganizationGroupItem[]>(() =>
		getOrganizationGroupsForLocation(selectedLocation.value)
	);

	const organizationGroupVehicleList = computed<VehicleGroupMemberItem[]>(() => {
		if (isIsapiCamera.value) {
			const key = selectedOrganizationKey.value;
			if (!key?.startsWith("pg_")) return [];
			const groupId = Number(key.slice(3));
			return personGroupCacheById.value[groupId]?.items ?? [];
		}

		const key = selectedOrganizationKey.value;
		const match = key?.match(/^vg_(\d+)$/);
		if (!match) return [];
		const group = (vehicleGroupsFromApi.value.groups ?? []).find(g => (g.id ?? 0) === Number(match[1]));
		if (!group?.vehicles?.length) return [];

		const laneSet = laneIds.value.length ? new Set(laneIds.value) : null;
		const plates = new Set(group.vehicles.map(v => normalizePlate(v.plate_license)).filter(Boolean));
		const valid = todayReleasedLogs.value.filter(log => {
			if (laneSet != null && log.lane_id != null && !laneSet.has(log.lane_id)) return false;
			return plates.has(normalizePlate(log.license_plate));
		});

		return group.vehicles.map(v =>
			buildVehicleGroupMemberFromLogs(
				v.plate_license ?? "",
				v.owner_name ?? null,
				v.vehicle_id,
				valid
			)
		);
	});

	const loadOrganizationData = async (): Promise<void> => {
		isLoadingVehicleGroups.value = true;
		try {
			await loadTodayPassageLogs(true);

			if (isIsapiCamera.value) {
				const siteId = resolveSiteId(selectedLocation.value);
				if (isParkingMode.value && siteId != null) {
					try {
						const { plates } = await vehicleAccessSitesApi.getPresencePlates(siteId);
						presentPlatesSet.value = new Set(
							(plates || []).map(p => normalizePlate(p)).filter(Boolean)
						);
					} catch {
						presentPlatesSet.value = new Set();
					}
				} else {
					presentPlatesSet.value = new Set();
				}

				const groups = await personnelApi.getPersonGroups({ tree: false });
				personGroupsForVehicle.value = Array.isArray(groups)
					? groups.filter(g => g.id != null && g.name?.trim())
					: [];

				const validToday = todayReleasedLogs.value;
				const platesForPresence = isParkingMode.value ? presentPlatesSet.value : undefined;
				const cacheEntries = await Promise.all(
					personGroupsForVehicle.value.map(async g => {
						try {
							const page = await personnelApi.getPersonGroupMembers(g.id, {
								limit: 500,
								offset: 0,
								status: "active"
							});
							const members = page.items ?? [];
							const items = buildPersonGroupMemberItems(
								members,
								validToday,
								platesForPresence
							);
							return [
								g.id,
								{
									total: Number(page?.total) || members.length,
									onSite: items.filter(i => i.isPresent).length,
									items
								}
							] as const;
						} catch {
							return [g.id, { total: 0, onSite: 0, items: [] }] as const;
						}
					})
				);
				personGroupCacheById.value = Object.fromEntries(cacheEntries);
			} else {
				vehicleGroupsFromApi.value = (await vehicleAccessApi.getVehicleGroups()) ?? { groups: [] };
			}
		} catch (error) {
			handleError(error, isIsapiCamera.value ? "載入人員群組失敗" : "載入車輛群組失敗");
			if (isIsapiCamera.value) {
				personGroupsForVehicle.value = [];
				personGroupCacheById.value = {};
			} else {
				vehicleGroupsFromApi.value = { groups: [] };
			}
		} finally {
			isLoadingVehicleGroups.value = false;
		}
	};

	const loadFullReportLogs = async (options: {
		startTime: string;
		endTime: string;
		preset?: string;
	}): Promise<VehicleDataLog[]> => {
		const timeQuery = buildLogsTimeQuery(
			options.preset ?? "custom",
			options.startTime,
			options.endTime
		);
		const result = await vehicleAccessSitesApi.getAllSiteLogs({
			limit: VEHICLE_ACCESS_FULL_REPORT_LIMIT,
			...timeQuery
		});
		return result.logs || [];
	};

	const clearUiForSelectedSite = (): void => {
		entryCount.value = 0;
		exitCount.value = 0;
		onSiteCount.value = 0;
		onSiteCapacity.value = null;
		logs.value = [];
		todayPassageLogs.value = [];
		todayPassageSiteId.value = null;
		personGroupCacheById.value = {};
		presentPlatesSet.value = new Set();
	};

	const resetParkingStatsForSelectedSite = async (): Promise<void> => {
		const siteId = resolveSiteId(selectedLocation.value);
		if (siteId == null || !isParkingMode.value) return;
		await vehicleAccessSitesApi.resetSiteStats(siteId);
		clearUiForSelectedSite();
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
		isParkingMode,
		logs,
		overviewSummaries,
		entryCount,
		exitCount,
		onSiteCount,
		onSiteCapacity,
		organizationGroups,
		getOrganizationGroupsForLocation,
		selectedOrganizationKey,
		organizationGroupVehicleList,
		isLoadingVehicleGroups,
		loadOrganizationData,
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
		clearUiForSelectedSite,
		resetParkingStatsForSelectedSite,
		setupEventListeners
	};
};
