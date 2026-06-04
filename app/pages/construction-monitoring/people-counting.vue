<template>
	<div>
		<!-- 人流統計系統頁面內容 -->
		<div
			class="flex min-w-0 items-stretch justify-center"
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
						<svg
							class="h-5 w-5 shrink-0 2xl:h-6 2xl:w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
				</Transition>
				<div
					class="relative flex min-h-[664px] flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 2xl:min-h-[848px] 2xl:p-6"
				>
					<!-- 位置標題與地點選擇 -->
					<div
						class="absolute left-1/2 top-0 flex h-[36px] translate-x-[-50%] items-center justify-center bg-white text-[#595959] 2xl:h-[48px]"
						style="clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, calc(0% + 24px) 100%)"
					>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="ps-[12px] text-[24px] 2xl:text-[36px]">{{
								getLocationZone(selectedLocation)
							}}</span>
						</div>
						<div class="h-[24px] w-px bg-[#595959]"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="pe-[12px] text-[24px] 2xl:text-[36px]">{{
								selectedLocation.name
							}}</span>
						</div>
					</div>

					<PermissionActionButton
						:allowed="canManageLocation"
						aria-label="地點管理"
						:class="['absolute left-8 top-2', MONITORING_ACTION_BTN_CLASS]"
						:enabled-hover-class="MONITORING_ACTION_BTN_HOVER_CLASS"
						@click="handleOpenLocationDialog"
					>
						地點管理
					</PermissionActionButton>
					<PermissionActionButton
						:allowed="canFullReport"
						aria-label="開啟完整報表"
						:class="['absolute right-8 top-2', MONITORING_ACTION_BTN_CLASS]"
						:enabled-hover-class="MONITORING_ACTION_BTN_HOVER_CLASS"
						@click="handleOpenSimulation"
					>
						完整報表
					</PermissionActionButton>

					<MonitoringDetailShell
						:empty="detailEmpty"
						:enlarged="isOverviewCollapsed"
						content-class="flex flex-col gap-12"
					>
						<template v-if="selectedLocation">
							<LocationStatsPanel
								:entry-count="selectedLocation.entryCount || 0"
								:exit-count="selectedLocation.exitCount || 0"
								:current-count="currentCount"
							/>
							<div
								class="grid min-w-0 grid-cols-2 items-stretch gap-4"
								:class="{ 'monitoring-detail-enlarged': isOverviewCollapsed }"
							>
								<div class="flex min-w-0 flex-col">
									<EntryExitLogTable
										:logs="logs"
										:data-source="selectedLocation?.dataSource"
										:display-columns="selectedLocation?.logDisplayColumns"
									/>
								</div>
								<div class="space-y-4">
									<h3
										class="people-unit-title bg-white/20 py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
									>
										人員群組
									</h3>
									<div
										v-if="!selectedLocation?.units || selectedLocation.units.length === 0"
										class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
									>
										<p class="people-unit-empty text-sm text-white/60 xl:text-base">尚無單位資料</p>
									</div>
									<div v-else class="grid grid-cols-3 gap-4 2xl:grid-cols-4">
										<div
											v-for="unit in selectedLocation.units"
											:key="unit.id"
											class="flex flex-col items-center justify-center border-2 border-white/0 py-2 transition-all"
											:class="[
												{
													'bg-white/20': (unit.currentCount || 0) > 0,
													'bg-black/20': (unit.currentCount || 0) === 0
												},
												isIsapiCamera ? '' : 'cursor-pointer'
											]"
											:tabindex="isIsapiCamera ? undefined : 0"
											:role="isIsapiCamera ? undefined : 'button'"
											:aria-label="isIsapiCamera ? `${unit.name}，進出統計` : `查看 ${unit.name} 人員名單`"
											@click="handleUnitCardActivate(unit)"
											@keydown.enter="handleUnitCardActivate(unit)"
											@keydown.space.prevent="handleUnitCardActivate(unit)"
										>
											<div
												class="people-unit-name text-base font-semibold tracking-wide text-white 2xl:text-lg"
											>
												{{ unit.name }}
											</div>
											<template v-if="isIsapiCamera">
												<div class="people-unit-count space-x-0.5 text-sm text-white 2xl:text-base">
													<span class="text-green-400">進 {{ unit.entryCount ?? 0 }}</span>
													<span>/</span>
													<span class="text-blue-300">出 {{ unit.exitCount ?? 0 }}</span>
												</div>
											</template>
											<template v-else>
												<div class="people-unit-count space-x-0.5 text-base text-white 2xl:text-lg">
													<span class="text-green-400">{{ unit.currentCount || 0 }}</span>
													<span>/</span>
													<span>{{ unit.capacity || 0 }}</span>
												</div>
											</template>
										</div>
									</div>
								</div>
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
								<template v-if="locationsForOverview.length > 0">
									<LocationOverviewCard
										v-for="location in locationsForOverview"
										:key="getLocationId(location)"
										:data-overview-location-id="getLocationId(location)"
										:location="location"
										class="cursor-pointer transition-all hover:ring-2 hover:ring-cyan-300/50"
										:class="{ 'ring-2 ring-cyan-400': isCurrentLocation(location) }"
										@click="handleLocationSelect"
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
		:zones="peopleCountingZones"
		system-type="people_counting"
		:require-image-url="false"
		:can-create-zone="canCreateLocation"
		:can-update-zone="canUpdateLocation"
		:can-delete-zone="canDeleteLocation"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
	<SimulationFrame v-model="showSimulationFrame" title="人流統計 - 完整報表">
		<PeopleCountingSimulation
			:logs="simulationLogs"
			:location-options="simulationLocationOptions"
			:location-summaries="simulationLocationSummaries"
			:location-display-columns="simulationLocationDisplayColumns"
			:time-range="simulationTimeRange"
			@update:time-range="handleSimulationTimeRangeUpdate"
		/>
	</SimulationFrame>
	<UnitPersonnelDialog
		v-model="isUnitDialogOpen"
		:unit-name="selectedUnitName"
		:personnel="unitPersonnel"
		:is-loading="isLoadingUnitPersonnel"
		@close="handleUnitDialogClose"
	/>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, nextTick, computed, ref } from "vue";
import type {
	PeopleCountingZone,
	PeopleCountingLocation,
	PeopleCountingLog
} from "~/types/peopleCounting";
import MonitoringDetailShell from "~/components/common/MonitoringDetailShell.vue";
import LocationStatsPanel from "~/components/people-counting/LocationStatsPanel.vue";
import LocationOverviewCard from "~/components/people-counting/LocationOverviewCard.vue";
import EntryExitLogTable from "~/components/people-counting/EntryExitLogTable.vue";
import UnitPersonnelDialog from "~/components/people-counting/UnitPersonnelDialog.vue";
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue";
import SimulationFrame from "~/components/common/SimulationFrame.vue";
import PeopleCountingSimulation from "~/components/people-counting/PeopleCountingSimulation.vue";
import { usePeopleCountingState } from "~/composables/systems/peopleCounting/usePeopleCountingState";
import { usePeopleCountingLocationApi } from "~/composables/location/api/usePeopleCountingLocationApi";
import { useZoneManagement } from "~/composables/location/management/useZoneManagement";
import { useZoneSystemAdapter } from "~/composables/location/adapters/useZoneSystemAdapter";
import {
	usePeopleCountingApi,
	PEOPLE_COUNTING_FULL_REPORT_LIMIT
} from "~/composables/systems/peopleCounting/usePeopleCountingApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useLocationModuleRbac } from "~/composables/core/useAccessGate";
import type { PeopleCountingUnit, PeopleCountingPersonnel } from "~/types/peopleCounting";
import { useApiBase } from "~/composables/core/useApiBase";
import {
	buildLogsTimeQuery,
	toSimulationTimeRange,
	type OperationalDayRangeResponse
} from "~/utils/entryExitTimeRange";
import {
	firstFlatSiteMatchingSortedZoneLocations,
	sortFlatSitesBySortedZoneLocations
} from "~/utils/sortOrder";
import { computeCumulativePresence } from "~/utils/entryExitStats";
import { PERM } from "~/config/permissionCodes";
import PermissionActionButton from "~/components/common/PermissionActionButton.vue";
import {
	MONITORING_ACTION_BTN_CLASS,
	MONITORING_ACTION_BTN_HOVER_CLASS
} from "~/composables/core/usePermissionUi";
const {
	canManageLocation,
	canCreateLocation,
	canUpdateLocation,
	canDeleteLocation,
	canFullReport
} = useLocationModuleRbac(PERM.peopleCounting);

// 使用統一的狀態管理
const {
	locations,
	selectedLocation,
	logs,
	peopleCountingZones,
	loadLocations,
	loadLocationDetail,
	loadZones,
	getLocationZone,
	setupEventListeners,
	isLoadingLocations,
	isLoadingZones
} = usePeopleCountingState();

const detailEmpty = computed(
	() => locations.value.length === 0 && !isLoadingLocations.value && !isLoadingZones.value
);

// 單位人員對話框相關
const peopleCountingApi = usePeopleCountingApi();
const { request } = useApiBase();
const fetchTodaySimulationRange = async () => {
	const range = await request<OperationalDayRangeResponse>(`/entry-exit/time-range?preset=today`);
	return toSimulationTimeRange(range, "today");
};
const { handleError } = useErrorHandler();
const isUnitDialogOpen = ref(false);
const selectedUnitName = ref("");
const unitPersonnel = ref<PeopleCountingPersonnel[]>([]);
const isLoadingUnitPersonnel = ref(false);

// 右側總覽：顯示 zone 名稱（不影響詳情載入）
const locationsForOverview = computed(() => {
	const locationsWithId = locations.value.filter(
		(l): l is PeopleCountingLocation & { locationId: number } => l.locationId != null
	);
	const ordered = sortFlatSitesBySortedZoneLocations(peopleCountingZones.value, locationsWithId);
	return ordered.map(location => ({
		...location,
		overviewZoneName: getLocationZone(location)
	}));
});

// 判斷是否為攝影機資料來源
const isIsapiCamera = computed(() => selectedLocation.value?.dataSource === "isapi_camera");

const handleUnitCardActivate = (unit: PeopleCountingUnit) => {
	if (isIsapiCamera.value) return;
	void handleUnitClick(unit);
};

const currentCount = computed(() => {
	if (!selectedLocation.value) return 0;
	if (isIsapiCamera.value) {
		return computeCumulativePresence(
			selectedLocation.value.entryCount ?? 0,
			selectedLocation.value.exitCount ?? 0
		);
	}
	if (!selectedLocation.value.units) return 0;
	return selectedLocation.value.units.reduce((sum, unit) => sum + (unit.currentCount || 0), 0);
});

const isOverviewCollapsed = ref(false);
const overviewListRef = ref<HTMLElement | null>(null);

// 地點管理與模擬框狀態
const showLocationManagementDialog = ref(false);
const showSimulationFrame = ref(false);

const simulationTimeRange = ref({
	startDate: "",
	endDate: "",
	preset: "today"
});

const simulationLogs = ref<PeopleCountingLog[]>([]);

type SimulationLocationOption = {
	locationId: number;
	label: string;
	zoneName: string;
	locationName: string;
	dataSource?: PeopleCountingLocation["dataSource"];
};

const simulationLocationOptions = computed((): SimulationLocationOption[] => {
	const opts: SimulationLocationOption[] = [];
	for (const zone of peopleCountingZones.value) {
		for (const loc of zone.locations ?? []) {
			const locationId = loc.id != null ? Number(loc.id) : NaN;
			if (!Number.isFinite(locationId)) continue;
			const zoneName = zone.name || "";
			const locationName = loc.name || "";
			opts.push({
				locationId,
				label: [zoneName, locationName].filter(Boolean).join("-") || String(locationId),
				zoneName,
				locationName,
				dataSource: loc.dataSource
			});
		}
	}
	return opts;
});

const simulationLocationSummaries = computed(() => {
	const map: Record<
		number,
		{
			entryCount: number;
			exitCount: number;
			units: PeopleCountingLocation["units"];
			dataSource?: PeopleCountingLocation["dataSource"];
		}
	> = {};
	for (const loc of locations.value) {
		if (loc.locationId == null) continue;
		map[loc.locationId] = {
			entryCount: loc.entryCount ?? 0,
			exitCount: loc.exitCount ?? 0,
			units: loc.units ?? [],
			dataSource: loc.dataSource
		};
	}
	return map;
});

const simulationLocationDisplayColumns = computed(() => {
	const map: Record<number, string[] | null | undefined> = {};
	for (const loc of locations.value) {
		if (loc.locationId == null) continue;
		map[loc.locationId] = loc.logDisplayColumns ?? null;
	}
	return map;
});

/** 完整報表：跨地點載入時間區間內紀錄 */
const loadSimulationLogs = async () => {
	const { startDate, endDate, preset } = simulationTimeRange.value;
	const timeQuery = buildLogsTimeQuery(preset, startDate, endDate);
	try {
		simulationLogs.value = await peopleCountingApi.getAllLocationLogs({
			limit: PEOPLE_COUNTING_FULL_REPORT_LIMIT,
			...timeQuery
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

// 選中地點 ID（用於刪除邏輯，與環境品質保持一致）
const selectedLocationId = ref<string>("");

// 取得適配器（用於獲取統一的 getLocationId 方法）
const adapter = useZoneSystemAdapter<PeopleCountingZone, PeopleCountingLocation>("people_counting");

// 從地點對象獲取 ID（用於刪除邏輯，與環境品質保持一致）
// 使用適配器提供的統一方法
const getLocationId = (location: PeopleCountingLocation): string => {
	const zoneName = getLocationZone(location);
	const zone =
		peopleCountingZones.value.find(z =>
			(z.locations || []).some(l => l === location || (l.id && location.id && l.id === location.id))
		) ?? null;
	if (!zone || !adapter.getLocationId) return `${zoneName || "unknown"}-${location.name}`;
	const idx = (zone.locations || []).findIndex(
		l => l === location || (l.id && location.id && l.id === location.id)
	);
	if (idx < 0) return `${zoneName || "unknown"}-${location.name}`;
	return adapter.getLocationId({ zone, location, locationIndex: idx });
};

// 監聽 selectedLocation 變化，同步更新 selectedLocationId（用於刪除邏輯）
watch(
	() => selectedLocation.value,
	newLocation => {
		selectedLocationId.value = newLocation ? getLocationId(newLocation) : "";
	},
	{ immediate: true }
);

const scrollActiveOverviewIntoView = () => {
	const id = selectedLocationId.value;
	if (!id || isOverviewCollapsed.value) return;
	const root = overviewListRef.value;
	if (!root) return;
	root.querySelector(`[data-overview-location-id="${CSS.escape(id)}"]`)?.scrollIntoView({
		block: "nearest",
		behavior: "smooth"
	});
};

watch(selectedLocationId, () => {
	nextTick(() => scrollActiveOverviewIntoView());
});

watch(isOverviewCollapsed, collapsed => {
	if (!collapsed) nextTick(() => scrollActiveOverviewIntoView());
});

// 檢查是否為當前選中的地點（與 environment 一致：使用單一 canonical id，僅一卡高亮）
const isCurrentLocation = (location: PeopleCountingLocation): boolean => {
	return getLocationId(location) === selectedLocationId.value;
};

const handleLocationSelect = async (locationId: number) => {
	if (selectedLocation.value?.locationId === locationId) return;
	const loc = locationsForOverview.value.find(l => l.locationId === locationId);
	if (loc) selectedLocationId.value = getLocationId(loc);
	await loadLocationDetail(locationId);
};

// 設置 WebSocket 事件監聽器
let cleanupWebSocket: (() => void) | null = null;

// 使用區域管理 composable
const peopleCountingLocationApi = usePeopleCountingLocationApi();
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<PeopleCountingLocation, PeopleCountingZone>();

// 處理儲存區域
const handleSaveZone = async (zone: PeopleCountingZone) => {
	await baseHandleSaveZone(
		zone,
		peopleCountingZones,
		async (z: PeopleCountingZone) => {
			// 檢查是否為臨時 ID（以 temp- 開頭）或有效的數字 ID
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id);
			const result = isValidId
				? await peopleCountingLocationApi.updateZone(z.id, {
						name: z.name,
						sortOrder: z.sortOrder,
						locations: z.locations
					})
				: await peopleCountingLocationApi.createZone({
						name: z.name,
						sortOrder: z.sortOrder,
						locations: z.locations
					});
			// 確保返回的 zone 有 id
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as PeopleCountingZone & {
				id: string;
			};
			return {
				merged: result.merged,
				message: result.message,
				zone: zoneWithId
			};
		},
		{
			// 保存後重新載入地點列表（因為地點變更可能影響地點列表）
			onAfterSave: async () => {
				await loadZones();
				await loadLocations();
			}
		}
	);
};

// 處理刪除區域
const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, peopleCountingZones, peopleCountingLocationApi.deleteZone, {
		// 選中狀態管理（與環境品質保持一致）
		selectedLocationRef: selectedLocationId,
		getLocationId,
		// 系統特定的刪除選項
		systemType: "people_counting",
		// 刪除後重新載入區域與地點列表（確保 UI 立即反映刪除結果）
		onAfterDelete: async () => {
			await loadZones();
			await loadLocations();
		}
	});
};

// 處理打開地點管理對話框
const handleOpenLocationDialog = async () => {
	if (!canManageLocation.value) return;
	// 如果還沒有載入區域數據，先載入
	if (peopleCountingZones.value.length === 0) {
		await loadZones();
	}
	// 打開對話框
	showLocationManagementDialog.value = true;
};

// 處理單位點擊事件（打開人員對話框；攝影機人流無人員名單，不提供點選）
const handleUnitClick = async (unit: PeopleCountingUnit) => {
	if (!unit || !unit.name) return;
	if (selectedLocation.value?.dataSource === "isapi_camera") return;

	selectedUnitName.value = unit.name;
	isUnitDialogOpen.value = true;
	isLoadingUnitPersonnel.value = true;
	unitPersonnel.value = [];

	try {
		const locationId = selectedLocation.value?.locationId;
		const unitPersonnelList = await peopleCountingApi.getUnitPersonnel(unit.id, locationId);
		unitPersonnel.value = unitPersonnelList;
	} catch (error) {
		handleError(error, `載入 ${unit.name} 人員列表失敗`);
		unitPersonnel.value = [];
	} finally {
		isLoadingUnitPersonnel.value = false;
	}
};

// 處理單位對話框關閉
const handleUnitDialogClose = () => {
	selectedUnitName.value = "";
	unitPersonnel.value = [];
};

// 監聽對話框打開狀態，載入區域數據
watch(
	() => showLocationManagementDialog.value,
	newValue => {
		if (newValue && peopleCountingZones.value.length === 0) {
			loadZones();
		}
	}
);

// 初始化
onMounted(async () => {
	// 設置 WebSocket 事件監聽：收到 YSCP 事件後重新載入資料
	// 使用防抖優化（500ms），避免短時間內多次觸發
	cleanupWebSocket = setupEventListeners(async () => {
		const locationId = selectedLocation.value?.locationId;

		// 並行載入地點列表和詳情（如果有的話）
		// 使用 Promise.allSettled 確保即使一個失敗也不影響另一個
		// 錯誤已在 composable 中統一處理
		await Promise.allSettled([
			loadLocations(), // 載入列表（更新統計和總覽卡片）
			locationId ? loadLocationDetail(locationId) : Promise.resolve()
		]);

		// 確保所有計算屬性和元件在資料載入後重新計算
		// 使用 nextTick 確保 Vue 響應式系統完成所有更新
		await nextTick();
	}, 500); // 防抖延遲 500ms

	try {
		// 優化：先載入地點列表（內部會並行請求 zones），然後使用返回的 zones 數據
		// 這樣可以避免重複請求 zones
		await loadLocations();

		// 如果 loadLocations 沒有返回 zones（例如已有緩存），則單獨載入
		if (peopleCountingZones.value.length === 0) {
			await loadZones();
		}

		if (!selectedLocation.value && locations.value.length > 0) {
			const locationsWithId = locations.value.filter(
				(l): l is typeof l & { locationId: number } => l.locationId != null
			);
			const hit = firstFlatSiteMatchingSortedZoneLocations(peopleCountingZones.value, locationsWithId);
			if (hit?.locationId != null) {
				await handleLocationSelect(hit.locationId);
			}
		}
	} catch {
		// 錯誤已在 composable 中處理
	}

	await nextTick();
	scrollActiveOverviewIntoView();
});

onBeforeUnmount(() => {
	// 清理 WebSocket 事件監聽器
	if (cleanupWebSocket) {
		cleanupWebSocket();
		cleanupWebSocket = null;
	}
});
</script>
