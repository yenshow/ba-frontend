/**
 * 車輛進出狀態（地點、當日記錄、進出場／在場數量、人員群組／車輛群組）
 */

import { ref, computed } from "vue";
import { setupDebouncedRefetchListeners } from "~/composables/websocket/useWebSocket";
import { useAccessGate } from "~/composables/core/useAccessGate";
import { PERM } from "~/config/permissionCodes";
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
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi";
import {
	useVehicleAccessSitesApi,
	VEHICLE_ACCESS_FULL_REPORT_LIMIT
} from "~/composables/systems/vehicleAccess/useVehicleAccessSitesApi";
import { buildLogsTimeQuery } from "~/utils/entryExitTimeRange";
import type { VehicleAccessDataSource } from "~/types/vehicleAccess";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { unifiedToVehicleAccessZone } from "~/utils/locationAdapter";
import {
	buildGroupMemberPresenceFromLogs,
	countReleasedPassages,
	createVehicleDirectionResolver,
	normalizePlate,
	releasedLogs as releasedPassageLogs
} from "~/utils/vehicleAccessPassageStats";
import type { UnifiedZone } from "~/types/location";
import { compareZonesLoose } from "~/utils/sortOrder";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import { isVehicleAccessLocationVisible } from "~/utils/vehicleAccessDataSource";
import { parseVehicleAccessEventLocationIds } from "~/utils/vehicleAccessWs";

const MAIN_LOG_LIMIT = 5;
const TODAY_TIME = { timeRange: "today" as const };

const YSCP_VEHICLE_EVENT = "yscp:event:vehicle";
const ISAPI_VEHICLE_EVENT = "vehicle-access:isapi-camera:event";

type IsapiOrganizationGroupFromApi = {
	groupKey: string;
	personGroupId: number;
	personGroupName: string;
	vehicleCount: number;
	onSiteCount: number;
	entryCount?: number;
	exitCount?: number;
	members?: Array<{
		id: number;
		name: string;
		photoUrl?: string | null;
		plates?: string[];
		isPresent?: boolean;
		lastEntryDate?: string | null;
		entryTime?: string | null;
		exitTime?: string | null;
	}>;
};

export interface VehicleAccessFilters {
	locationId: string | null;
}

const getDefaultFilters = (): VehicleAccessFilters => ({
	locationId: null
});

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
	validLogs: VehicleDataLog[],
	getDirection: ReturnType<typeof createVehicleDirectionResolver>
): VehicleGroupMemberItem => {
	const presence = buildGroupMemberPresenceFromLogs(plate, validLogs, getDirection);
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
	const { handleError } = useErrorHandler();
	const { enableYscpVehicleAccess } = useModuleRegistry();
	const { useWsModuleGate } = useAccessGate();
	const canSubscribe = useWsModuleGate("vehicle_access", {
		permissionCode: PERM.vehicleAccess.module,
	});

	const filters = ref<VehicleAccessFilters>(getDefaultFilters());
	const vehicleAccessZones = ref<VehicleAccessZone[]>([]);
	const logs = ref<VehicleDataLog[]>([]);
	const todayPassageLogs = ref<VehicleDataLog[]>([]);
	const todayPassageSiteId = ref<number | null>(null);
	const overviewSummaries = ref<VehicleAccessLocationSummary[]>([]);
	const entryCount = ref(0);
	const exitCount = ref(0);
	const onSiteCount = ref(0);
	/** 停車場在場上限（主畫面顯示 n/capacity） */
	const onSiteCapacity = ref<number | null>(null);

	const vehicleGroupsFromApi = ref<VehicleGroupFromApi>({ groups: [] });
	const isapiOrganizationGroups = ref<IsapiOrganizationGroupFromApi[]>([]);
	const presentPlatesSet = ref<Set<string>>(new Set());
	const selectedOrganizationKey = ref<string | null>(null);
	const isLoadingVehicleGroups = ref(false);
	const isLoadingZones = ref(false);
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
		return locations.value.find(
			loc =>
				loc.id === id ||
				loc.locationId === id ||
				String(loc.id ?? "") === id ||
				String(loc.locationId ?? "") === id
		);
	});

	const vehicleDirectionForSelected = computed(() =>
		createVehicleDirectionResolver(
			selectedLocation.value?.entryLaneId,
			selectedLocation.value?.exitLaneId
		)
	);

	const isIsapiCamera = computed(() => getDataSource(selectedLocation.value) === "isapi_camera");
	const isParkingMode = computed(
		() => isIsapiCamera.value && getOperationMode(selectedLocation.value) === "parking"
	);

	const todayReleasedLogs = computed(() =>
		releasedPassageLogs(todayPassageLogs.value, vehicleDirectionForSelected.value)
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
					locations: (z.locations || []).filter((loc: VehicleAccessLocation) =>
						isVehicleAccessLocationVisible(loc.dataSource, yscpOn)
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
			const timeQuery =
				isIsapiCamera.value && isParkingMode.value ? {} : TODAY_TIME;
			const result = await vehicleAccessSitesApi.getSiteLogs(siteId, {
				limit: VEHICLE_ACCESS_FULL_REPORT_LIMIT,
				...timeQuery
			});
			todayPassageLogs.value = result.logs || [];
			todayPassageSiteId.value = siteId;
		} catch {
			todayPassageLogs.value = [];
			todayPassageSiteId.value = null;
		}
	};

	const loadLogs = async (): Promise<void> => {
		try {
			await loadTodayPassageLogs();
			logs.value = todayPassageLogs.value.slice(0, MAIN_LOG_LIMIT);
		} catch (error) {
			handleError(error, "載入過車記錄失敗");
			throw error;
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

	/** WS 增量：僅更新受影響地點的總覽卡片；locationIds 為 null 時等同全量 */
	const patchOverviewSummaries = async (locationIds: number[] | null): Promise<void> => {
		if (!vehicleAccessZones.value.length) return;
		if (!locationIds?.length) {
			await loadOverviewSummaries();
			return;
		}

		isLoadingOverview.value = true;
		try {
			const { sites } = await vehicleAccessSitesApi.getSites();
			const siteById = new Map(sites.map(s => [s.id, s]));
			const idSet = new Set(locationIds.map(Number));

			overviewSummaries.value = overviewSummaries.value.map(summary => {
				const locId = Number(summary.locationId);
				if (!idSet.has(locId)) return summary;
				const site = siteById.get(locId);
				if (!site) return summary;
				return {
					...summary,
					todayPassCount: (site.entryCount ?? 0) + (site.exitCount ?? 0),
					entryCount: site.entryCount ?? 0,
					exitCount: site.exitCount ?? 0,
					currentCount: site.currentCount ?? 0
				};
			});
		} catch (error) {
			handleError(error, "更新總覽失敗");
		} finally {
			isLoadingOverview.value = false;
		}
	};

	const eventAffectsSelectedSite = (payload?: unknown): boolean => {
		const eventLocationIds = parseVehicleAccessEventLocationIds(payload);
		if (!eventLocationIds?.length) return true;

		const selected = selectedLocation.value;
		if (!selected) return false;

		const siteId = resolveSiteId(selected);
		const locId = Number(selected.id ?? selected.locationId);
		return eventLocationIds.some(
			id => id === locId || (siteId != null && id === siteId)
		);
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
			return (isapiOrganizationGroups.value ?? []).map(g => ({
				groupKey: g.groupKey,
				personGroupId: g.personGroupId,
				personGroupName: g.personGroupName,
				vehicleCount: g.vehicleCount,
				entryCount: g.entryCount ?? 0,
				exitCount: g.exitCount ?? 0,
				onSiteCount: g.onSiteCount ?? 0
			}));
		}

		const direction = createVehicleDirectionResolver(loc.entryLaneId, loc.exitLaneId);
		const logList = releasedPassageLogs(todayPassageLogs.value, direction);
		const vehicleGroupFilter = toOptionalIdSet(loc.vehicleGroupIds);
		return (vehicleGroupsFromApi.value.groups ?? [])
			.filter(g => (g.id ?? 0) !== 0)
			.filter(g => !vehicleGroupFilter || vehicleGroupFilter.has(g.id ?? 0))
			.map(g => {
				const groupId = g.id ?? 0;
				const plates = new Set(
					(g.vehicles ?? []).map(v => normalizePlate(v.plate_license)).filter(Boolean)
				);
				const stats = countReleasedPassages(
					logList,
					log => plates.has(normalizePlate(log.license_plate)),
					direction
				);
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
			if (!key) return [];
			const group = (isapiOrganizationGroups.value ?? []).find(g => g.groupKey === key);
			return (group?.members ?? []).map(m => ({
				id: m.id,
				name: m.name,
				owner_name: m.name,
				plate_license: (m.plates ?? []).join("、") || "—",
				photoUrl: m.photoUrl ?? undefined,
				lastEntryDate: m.lastEntryDate ?? undefined,
				entryTime: m.entryTime ?? undefined,
				exitTime: m.exitTime ?? undefined,
				isPresent: Boolean(m.isPresent)
			}));
		}

		const key = selectedOrganizationKey.value;
		const match = key?.match(/^vg_(\d+)$/);
		if (!match) return [];
		const group = (vehicleGroupsFromApi.value.groups ?? []).find(g => (g.id ?? 0) === Number(match[1]));
		if (!group?.vehicles?.length) return [];

		const plates = new Set(group.vehicles.map(v => normalizePlate(v.plate_license)).filter(Boolean));
		const valid = todayReleasedLogs.value.filter(log =>
			plates.has(normalizePlate(log.license_plate))
		);

		return group.vehicles.map(v =>
			buildVehicleGroupMemberFromLogs(
				v.plate_license ?? "",
				v.owner_name ?? null,
				v.vehicle_id,
				valid,
				vehicleDirectionForSelected.value
			)
		);
	});

	const loadOrganizationData = async (): Promise<void> => {
		isLoadingVehicleGroups.value = true;
		try {
			await loadTodayPassageLogs(true);

			if (isIsapiCamera.value) {
				const siteId = resolveSiteId(selectedLocation.value);
				if (siteId != null) {
					const { groups } = await vehicleAccessSitesApi.getOrganizationGroups(siteId);
					isapiOrganizationGroups.value = Array.isArray(groups) ? groups : [];
				} else {
					isapiOrganizationGroups.value = [];
				}
			} else {
				vehicleGroupsFromApi.value = (await vehicleAccessApi.getVehicleGroups()) ?? { groups: [] };
			}
		} catch (error) {
			handleError(error, isIsapiCamera.value ? "載入人員群組失敗" : "載入車輛群組失敗");
			if (isIsapiCamera.value) {
				isapiOrganizationGroups.value = [];
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
		isapiOrganizationGroups.value = [];
		presentPlatesSet.value = new Set();
	};

	const resetParkingStatsForSelectedSite = async (): Promise<void> => {
		const siteId = resolveSiteId(selectedLocation.value);
		if (siteId == null || !isParkingMode.value) return;
		await vehicleAccessSitesApi.resetSiteStats(siteId);
		clearUiForSelectedSite();
	};

	/** 切換地點後載入詳情（統計、群組、過車表）；總覽摘要請另行 loadOverviewSummaries */
	const loadLocationDetail = async (): Promise<void> => {
		if (!filters.value.locationId) return;
		try {
			await Promise.all([
				loadEntryExitOnSiteCounts(),
				loadOrganizationData(),
				loadLogs(),
			]);
		} catch {
			// 錯誤已在各 loader 處理
		}
	};

	/** WS 事件後輕量刷新：統計與過車表，不重拉群組資料 */
	const refreshSelectedLocationLive = async (): Promise<void> => {
		if (!filters.value.locationId) return
		await Promise.all([loadEntryExitOnSiteCounts(), loadLogs()])
	}

	/** WS 增量：更新人員／車輛群組在場統計（ISAPI 拉 API；YSCP 刷新當日 log 後由 computed 重算） */
	const refreshOrganizationGroupsLive = async (): Promise<void> => {
		if (!filters.value.locationId || !selectedLocation.value) return
		try {
			if (isIsapiCamera.value) {
				const siteId = resolveSiteId(selectedLocation.value)
				if (siteId == null) return
				const { groups } = await vehicleAccessSitesApi.getOrganizationGroups(siteId)
				isapiOrganizationGroups.value = Array.isArray(groups) ? groups : []
				return
			}
			await loadTodayPassageLogs(true)
		} catch (error) {
			handleError(error, isIsapiCamera.value ? "更新人員群組失敗" : "更新車輛群組統計失敗")
		}
	}

	const handleVehicleAccessWsRefetch = async (payload?: unknown): Promise<void> => {
		const eventLocationIds = parseVehicleAccessEventLocationIds(payload)
		await patchOverviewSummaries(eventLocationIds)

		if (!filters.value.locationId) return
		if (!eventAffectsSelectedSite(payload)) return

		await Promise.all([
			refreshSelectedLocationLive(),
			refreshOrganizationGroupsLive()
		])
	}

	const setupEventListeners = (
		onRefetch?: (payload?: unknown) => void | Promise<void>,
		debounceMs = 500
	) =>
		setupDebouncedRefetchListeners(
			onRefetch ?? handleVehicleAccessWsRefetch,
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
			"VehicleAccess WebSocket",
			{ enabled: canSubscribe },
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
		loadZones,
		loadLogs,
		loadLocationDetail,
		loadEntryExitOnSiteCounts,
		loadOverviewSummaries,
		getLocationZone,
		refreshSelectedLocationLive,
		refreshOrganizationGroupsLive,
		handleVehicleAccessWsRefetch,
		clearUiForSelectedSite,
		resetParkingStatsForSelectedSite,
		setupEventListeners
	};
};
