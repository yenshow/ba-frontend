<template>
	<div>
		<div
			class="flex min-w-0 flex-col items-stretch justify-center lg:flex-row"
			:class="isOverviewCollapsed ? 'gap-0' : 'gap-4 xl:gap-6 2xl:gap-8'"
		>
			<section class="relative min-w-0 flex-1 2xl:flex-[1.3]">
				<Transition name="fade" mode="out-in">
					<button
						v-if="isOverviewCollapsed"
						key="overview-expand-tab"
						type="button"
						class="absolute -right-px top-24 z-20 flex flex-col items-center gap-2 rounded-l-xl border-2 border-r-0 border-white/80 bg-white/30 px-2.5 py-4 text-white shadow-md transition-colors hover:bg-white/40 2xl:top-32"
						aria-label="展開總覽"
						title="展開總覽"
						@click="isOverviewCollapsed = false"
					>
						<span
							class="text-sm font-semibold tracking-[0.35em] text-white xl:text-base"
							style="writing-mode: vertical-rl"
						>
							總覽
						</span>
					</button>
				</Transition>

				<div
					class="relative flex min-h-[664px] flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 2xl:min-h-[848px] 2xl:p-6"
				>
					<div
						class="absolute left-1/2 top-0 flex h-[36px] translate-x-[-50%] items-center justify-center bg-white text-[#595959] 2xl:h-[48px]"
						style="clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, calc(0% + 24px) 100%)"
					>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="ps-[12px] text-[24px] 2xl:text-[36px]">
								{{ getLocationZone(selectedLocation) || "－" }}
							</span>
						</div>
						<div class="h-[24px] w-px bg-[#595959]"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="pe-[12px] text-[24px] 2xl:text-[36px]">
								{{ selectedLocation.name }}
							</span>
						</div>
					</div>
					<PermissionActionButton
						:allowed="canManageLocation"
						aria-label="地點管理"
						class="btn-monitoring-overlay absolute left-8 top-2"
						@click="handleOpenLocationDialog"
					>
						地點管理
					</PermissionActionButton>
					<PermissionActionButton
						v-show="isIsapiCamera && selectedLocation"
						:allowed="canOpenPlateManage"
						aria-label="車牌管理"
						class="btn-monitoring-overlay absolute left-32 top-2 2xl:left-36"
						@click="showIsapiManageDialog = true"
					>
						車牌管理
					</PermissionActionButton>
					<PermissionActionButton
						v-show="isParkingMode"
						:allowed="canResetStatistics"
						aria-label="重製停車場統計"
						class="btn-monitoring-overlay absolute right-32 top-2 2xl:right-36"
						@click="handleResetParkingStats"
					>
						重製統計
					</PermissionActionButton>
					<PermissionActionButton
						:allowed="canFullReport"
						aria-label="開啟完整報表"
						class="btn-monitoring-overlay absolute right-8 top-2"
						@click="handleOpenSimulation"
					>
						完整報表
					</PermissionActionButton>

					<MonitoringDetailShell
						:empty="detailEmpty"
						:enlarged="isOverviewCollapsed"
						:content-class="vehicleDetailContentClass"
						empty-title="尚無車輛進出地點"
						empty-description="請在「地點管理」中新增含車輛進出系統的地點"
					>
						<template v-if="selectedLocation">
							<VehicleStatsPanel
								:entry-count="entryCount"
								:exit-count="exitCount"
								:current-count="onSiteCount"
								:on-site-capacity="onSiteCapacity"
							/>
							<div class="grid min-w-0 grid-cols-2 items-stretch gap-4">
								<div class="flex min-w-0 flex-col">
									<VehicleDataLogTable :logs="logs" :display-columns="selectedLocation?.logDisplayColumns" />
								</div>
								<VehicleOrganizationGroupPanel
									:groups="organizationGroups ?? []"
									:selected-group-key="selectedOrganizationKey ?? undefined"
									:panel-title="isIsapiCamera ? '人員群組' : '車輛群組'"
									@select="handleOrganizationGroupSelect"
								/>
							</div>
						</template>
					</MonitoringDetailShell>
				</div>
			</section>

			<aside
				class="overview-sidebar"
				:class="isOverviewCollapsed ? 'overview-sidebar--collapsed' : 'overview-sidebar--expanded'"
				:aria-hidden="isOverviewCollapsed"
			>
				<div
					class="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 py-8"
				>
					<Transition name="fade" mode="out-in">
						<div
							v-if="!isOverviewCollapsed"
							key="overview-panel"
							class="flex h-full min-h-0 flex-col overflow-hidden"
						>
							<button
								type="button"
								class="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 text-white transition-colors hover:bg-white/20 2xl:h-12 2xl:w-12"
								aria-expanded="true"
								aria-label="收縮總覽"
								title="收縮總覽"
								@click="isOverviewCollapsed = true"
							>
								<svg
									class="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</button>

							<h2
								class="mb-4 text-center text-xl font-semibold tracking-[12px] text-white xl:text-2xl 2xl:text-3xl"
								style="padding-left: 12px"
							>
								總覽
							</h2>

							<div
								ref="overviewListRef"
								class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
							>
								<template v-if="overviewSummariesWithZone.length > 0">
									<VehicleOverviewCard
										v-for="summary in overviewSummariesWithZone"
										:key="getSummaryCanonicalId(summary)"
										:data-overview-location-id="getSummaryCanonicalId(summary)"
										:summary="summary"
										:groups="getOrganizationGroupsForLocation(findLocationForSummary(summary))"
										:location="findLocationForSummary(summary)"
										:can-write="canBarrierControl"
										class="cursor-pointer transition-all hover:ring-2 hover:ring-cyan-300/50"
										:class="{ 'ring-2 ring-cyan-400': isCurrentSummary(summary) }"
										@click="handleOverviewClick(summary)"
									/>
								</template>
								<div v-else class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無地點資料</p>
									<p class="mt-2 text-sm 2xl:text-base">請在「地點管理」中新增地點</p>
								</div>
							</div>
						</div>
					</Transition>
				</div>
			</aside>
		</div>
	</div>

	<ZoneManagementDialog
		v-model="showLocationManagementDialog"
		:zones="vehicleAccessZones"
		system-type="vehicle_access"
		:require-image-url="false"
		:can-create-zone="canCreateLocation"
		:can-update-zone="canUpdateLocation"
		:can-delete-zone="canDeleteLocation"
		:on-save-zone="handleSaveZone"
		@saved="handleZonesSaved"
		@delete="handleDeleteZone"
	/>

	<VehicleGroupDetailDialog
		v-model="isGroupDialogOpen"
		:group-name="selectedOrganizationGroupName"
		:vehicle-list="organizationGroupVehicleList"
		:list-variant="isIsapiCamera ? 'personnel' : 'vehicle'"
		@close="handleOrganizationDialogClose"
	/>

	<VehicleAccessIsapiManageDialog
		v-model="showIsapiManageDialog"
		:location="selectedLocation"
		:can-create-plate="canCreatePlate"
		:can-update-plate="canUpdatePlate"
		:can-delete-plate="canDeletePlate"
		:can-edit-members="canEditPlateMembers"
		:can-resync-plates="canResyncPlates"
		:plate-sync="plateSync"
		@members-updated="handleVehicleMembersUpdated"
		@synced="handleVehicleMembersUpdated"
	/>

	<SimulationFrame v-model="showSimulationFrame" title="車輛進出 - 完整報表">
		<VehicleAccessSimulation
			:logs="simulationLogs"
			:location-options="simulationLocationOptions"
			:location-display-columns="simulationLocationDisplayColumns"
			:time-range="simulationTimeRange"
			@update:time-range="handleSimulationTimeRangeUpdate"
		/>
	</SimulationFrame>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog";
import { onMounted, onBeforeUnmount, watch, nextTick, computed, ref } from "vue";
import type {
	VehicleAccessZone,
	VehicleAccessLocation,
	VehicleAccessLocationSummary,
	VehicleDataLog
} from "~/types/vehicleAccess";
import MonitoringDetailShell from "~/components/common/MonitoringDetailShell.vue";
import VehicleStatsPanel from "~/components/vehicle-access/VehicleStatsPanel.vue";
import VehicleDataLogTable from "~/components/vehicle-access/VehicleDataLogTable.vue";
import VehicleOrganizationGroupPanel from "~/components/vehicle-access/VehicleOrganizationGroupPanel.vue";
import VehicleOverviewCard from "~/components/vehicle-access/VehicleOverviewCard.vue";
import VehicleGroupDetailDialog from "~/components/vehicle-access/VehicleGroupDetailDialog.vue";
import VehicleAccessIsapiManageDialog from "~/components/vehicle-access/VehicleAccessIsapiManageDialog.vue";
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue";
import SimulationFrame from "~/components/common/SimulationFrame.vue";
import VehicleAccessSimulation, {
	type VehicleAccessSimulationLocationOption
} from "~/components/vehicle-access/VehicleAccessSimulation.vue";
import { useVehicleAccessState } from "~/composables/systems/vehicleAccess/useVehicleAccessState";
import { useVehicleAccessLocationApi } from "~/composables/location/api/useVehicleAccessLocationApi";
import {
	useZoneManagement,
	ZONE_DIALOG_BATCH_SAVE_OPTIONS
} from "~/composables/location/management/useZoneManagement";
import { useZoneSystemAdapter } from "~/composables/location/adapters/useZoneSystemAdapter";
import {
	useLocationModuleRbac,
	useVehicleAccessRbac,
	useVehiclePlateManageRbac
} from "~/composables/core/useAccessGate";
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useLocationPlateSync } from "~/composables/systems/personnel/useLocationPlateSync";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useApiBase } from "~/composables/core/useApiBase";
import {
	toSimulationTimeRange,
	type OperationalDayRangeResponse
} from "~/utils/entryExitTimeRange";
import { PERM } from "~/config/permissionCodes";
import PermissionActionButton from "~/components/common/PermissionActionButton.vue";

const {
	canManageLocation,
	canCreateLocation,
	canUpdateLocation,
	canDeleteLocation,
	canFullReport
} = useLocationModuleRbac(PERM.vehicleAccess);
const { canResetStatistics, canBarrierControl } = useVehicleAccessRbac();
const {
	canOpenPlateManage,
	canEditPlateMembers,
	canResyncPlates,
	canCreatePlate,
	canUpdatePlate,
	canDeletePlate
} = useVehiclePlateManageRbac();
const personnelApi = usePersonnelApi();
const locationApi = useLocationApi();
const { showToast } = useToast();
const { handleError: handleApiError } = useErrorHandler();
const plateSync = useLocationPlateSync({
	personnelApi,
	locationApi,
	toast: { success: (m: string) => showToast("success", m) },
	toastError: (m: string) => showToast("error", m),
	handleApiError,
	canResyncPlates
});
const {
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
	setSelectedOrganizationKey,
	isLoadingZones,
	loadZones,
	loadLocationDetail,
	loadFullReportLogs,
	loadOverviewSummaries,
	loadOrganizationData,
	getLocationZone,
	setupEventListeners,
	resetParkingStatsForSelectedSite
} = useVehicleAccessState();

const detailEmpty = computed(() => locations.value.length === 0 && !isLoadingZones.value);

const vehicleDetailContentClass = "flex flex-col gap-12"

const { request } = useApiBase();

const showSimulationFrame = ref(false);
const isGroupDialogOpen = ref(false);
const showIsapiManageDialog = ref(false);

const handleVehicleMembersUpdated = async () => {
	await loadOrganizationData();
};
const isOverviewCollapsed = ref(false);
const showLocationManagementDialog = ref(false);

const overviewListRef = ref<HTMLElement | null>(null);
const simulationLogs = ref<VehicleDataLog[]>([]);
const simulationTimeRange = ref({ startDate: "", endDate: "", preset: "today" });

const vehicleAccessLocationApi = useVehicleAccessLocationApi();
const adapter = useZoneSystemAdapter<VehicleAccessZone, VehicleAccessLocation>("vehicle_access");
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<VehicleAccessLocation, VehicleAccessZone>();

const selectedLocationIdRef = computed({
	get: () => filters.value.locationId ?? "",
	set: (id: string) => {
		filters.value = { ...filters.value, locationId: id || null };
	}
});

const overviewSummariesWithZone = computed(() =>
	overviewSummaries.value.map(s => ({
		...s,
		zoneName: s.zoneName ?? vehicleAccessZones.value.find(z => z.id === s.zoneId)?.name ?? null
	}))
);

const selectedOrganizationGroupName = computed(() => {
	const key = selectedOrganizationKey.value;
	if (!key) return "";
	return organizationGroups.value.find(gr => gr.groupKey === key)?.personGroupName ?? "";
});

const simulationLocationOptions = computed((): VehicleAccessSimulationLocationOption[] => {
	const opts: VehicleAccessSimulationLocationOption[] = [];
	for (const loc of locations.value) {
		const locationId = loc.id != null ? Number(loc.id) : Number(loc.locationId);
		if (!Number.isFinite(locationId)) continue;
		const zoneName = loc.zoneName || "";
		const locationName = loc.name || "";
		opts.push({
			locationId,
			label: [zoneName, locationName].filter(Boolean).join("-") || String(locationId),
			zoneName,
			locationName
		});
	}
	return opts;
});

const simulationLocationDisplayColumns = computed(() => {
	const map: Record<number, string[] | null | undefined> = {};
	for (const loc of locations.value) {
		const id = loc.id != null ? Number(loc.id) : Number(loc.locationId);
		if (!Number.isFinite(id)) continue;
		map[id] = loc.logDisplayColumns ?? null;
	}
	return map;
});

const getLocationId = (location: VehicleAccessLocation & { zoneName?: string }): string => {
	const zone =
		vehicleAccessZones.value.find(z =>
			(z.locations || []).some(l => l === location || (l.id && location.id && l.id === location.id))
		) ?? null;
	const zoneName = location.zoneName ?? zone?.name ?? null;
	if (!zone || !adapter.getLocationId) {
		return `${zoneName ?? "unknown"}-${location.name}`;
	}
	const idx = (zone.locations || []).findIndex(
		l => l === location || (l.id && location.id && l.id === location.id)
	);
	if (idx < 0) return `${zoneName ?? "unknown"}-${location.name}`;
	return adapter.getLocationId({ zone, location, locationIndex: idx });
};

const findLocationForSummary = (
	summary: VehicleAccessLocationSummary
): VehicleAccessLocation | null => {
	const id = String(summary.id ?? summary.locationId ?? "");
	for (const zone of vehicleAccessZones.value) {
		for (const loc of zone.locations || []) {
			const locId = getLocationId(loc as VehicleAccessLocation & { zoneName?: string });
			if (locId === id || String(loc.id ?? "") === id) return loc;
		}
	}
	return null;
};

const getSummaryCanonicalId = (summary: VehicleAccessLocationSummary): string => {
	const loc = findLocationForSummary(summary);
	if (loc) return getLocationId(loc as VehicleAccessLocation & { zoneName?: string });
	return String(summary.id ?? summary.locationId ?? "");
};

const isCurrentSummary = (summary: VehicleAccessLocationSummary): boolean => {
	const selectedId = filters.value.locationId;
	return !!selectedId && getSummaryCanonicalId(summary) === selectedId;
};

const scrollActiveOverviewIntoView = () => {
	const id = filters.value.locationId;
	if (!id || isOverviewCollapsed.value) return;
	const root = overviewListRef.value;
	if (!root) return;
	root.querySelector(`[data-overview-location-id="${CSS.escape(id)}"]`)?.scrollIntoView({
		block: "nearest",
		behavior: "smooth"
	});
};

const fetchTodaySimulationRange = async () => {
	const range = await request<OperationalDayRangeResponse>(`/entry-exit/time-range?preset=today`);
	return toSimulationTimeRange(range, "today");
};

const loadSimulationLogs = async () => {
	const { startDate, endDate, preset } = simulationTimeRange.value;
	try {
		simulationLogs.value = await loadFullReportLogs({
			startTime: startDate,
			endTime: endDate,
			preset
		});
	} catch {
		simulationLogs.value = [];
	}
};

const handleSimulationTimeRangeUpdate = (v: {
	startDate: string;
	endDate: string;
	preset: string;
}) => {
	simulationTimeRange.value = v;
	void loadSimulationLogs();
};

const handleOpenSimulation = async () => {
	if (!canFullReport.value) return;
	simulationTimeRange.value = await fetchTodaySimulationRange();
	showSimulationFrame.value = true;
	await loadSimulationLogs();
};

const handleOrganizationGroupSelect = (groupKey: string) => {
	setSelectedOrganizationKey(groupKey);
	isGroupDialogOpen.value = true;
};

const handleOrganizationDialogClose = () => {
	setSelectedOrganizationKey(null);
};

const handleOverviewClick = (summary: VehicleAccessLocationSummary) => {
	const nextId = getSummaryCanonicalId(summary) || null;
	if (filters.value.locationId === nextId) return;
	filters.value = { ...filters.value, locationId: nextId };
};

const handleResetParkingStats = async () => {
	if (!isParkingMode.value) return;
	const confirmed = window.confirm(
		"確定要重製此停車場的進場、出場與在場統計？過車紀錄不會刪除，完整報表仍可查詢歷史。"
	);
	if (!confirmed) return;
	try {
		await resetParkingStatsForSelectedSite();
		showToast("success", TOAST.PARKING_STATS_RESET);
	} catch (error) {
		showToast("error", error instanceof Error ? error.message : TOAST.STATS_RESET_FAILED);
	}
};

const handleOpenLocationDialog = async () => {
	if (!canManageLocation.value) return;
	if (vehicleAccessZones.value.length === 0) await loadZones();
	showLocationManagementDialog.value = true;
};

const handleSaveZone = async (zone: VehicleAccessZone) => {
	await baseHandleSaveZone(
		zone,
		vehicleAccessZones,
		async (z: VehicleAccessZone) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id);
			const result = isValidId
				? await vehicleAccessLocationApi.updateZone(z.id, {
						name: z.name,
						sortOrder: (z as unknown as { sortOrder?: number }).sortOrder,
						locations: z.locations
					})
				: await vehicleAccessLocationApi.createZone({
						name: z.name,
						sortOrder: (z as unknown as { sortOrder?: number }).sortOrder,
						locations: z.locations
					});
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as VehicleAccessZone & {
				id: string;
			};
			return { merged: result.merged, message: result.message, zone: zoneWithId };
		},
		{
			...ZONE_DIALOG_BATCH_SAVE_OPTIONS
		}
	);
};

const handleZonesSaved = async () => {
	await loadZones();
	await loadOverviewSummaries();
};

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, vehicleAccessZones, vehicleAccessLocationApi.deleteZone, {
		selectedLocationRef: selectedLocationIdRef,
		getLocationId: (loc: VehicleAccessLocation) => getLocationId(loc),
		systemType: "vehicle_access",
		onAfterDelete: async () => {
			await loadZones();
			await loadOverviewSummaries();
		}
	});
};

let cleanupWebSocket: (() => void) | null = null;

watch(
	() => filters.value.locationId,
	locationId => {
		if (!locationId) return;
		void loadLocationDetail();
		nextTick(() => scrollActiveOverviewIntoView());
	},
	{ immediate: true }
);

watch(isOverviewCollapsed, collapsed => {
	if (!collapsed) nextTick(() => scrollActiveOverviewIntoView());
});

onMounted(async () => {
	cleanupWebSocket = setupEventListeners();

	try {
		await loadZones();
		await loadOverviewSummaries();
		if (!filters.value.locationId && locations.value.length > 0) {
			const first = locations.value[0];
			if (first) {
				filters.value = {
					...filters.value,
					locationId: getLocationId(first as VehicleAccessLocation & { zoneName?: string })
				};
			}
		}
	} catch {
		// 錯誤已在 composable 處理
	}

	await nextTick();
	scrollActiveOverviewIntoView();
});

onBeforeUnmount(() => {
	if (cleanupWebSocket) {
		cleanupWebSocket();
		cleanupWebSocket = null;
	}
});
</script>
