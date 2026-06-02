<template>
	<div>
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
						class="absolute left-1/2 top-0 flex h-[36px] translate-x-[-50%] items-center justify-center bg-white text-lg text-[#595959] 2xl:h-[48px] 2xl:text-xl"
						style="clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, calc(0% + 24px) 100%)"
					>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="currentLocationData" class="ps-[12px] text-[24px] 2xl:text-[36px]">{{
								getLocationZone(currentLocationData)
							}}</span>
						</div>
						<div class="h-[24px] w-px bg-[#595959]"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="currentLocationData" class="pe-[12px] text-[24px] 2xl:text-[36px]">{{
								currentLocationData.name
							}}</span>
						</div>
					</div>

					<button
						v-if="isAdmin"
						type="button"
						class="absolute left-8 top-2 rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:text-base"
						aria-label="地點管理"
						@click="showLocationManagementDialog = true"
					>
						地點管理
					</button>
					<button
						type="button"
						class="absolute right-8 top-2 rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:text-base"
						aria-label="開啟完整報表"
						@click="handleOpenSimulation"
					>
						完整報表
					</button>

					<Transition name="fade" mode="out-in">
						<div v-if="currentLocationData" :key="detailPanelKey" class="mt-16" :aria-busy="isHydrating">
							<div class="grid grid-cols-3 gap-4 border-b border-white/80 pb-2 2xl:gap-6">
								<!-- 噪音值儀表 -->
								<EnvironmentGauge
									type="noise"
									:value="noiseValue"
									:location-id="currentLocationData?.id ?? null"
									:refresh-key="trendReloadKey"
									class="border-r border-white/30"
								/>

								<!-- AQI 儀表（中間，較大） -->
								<EnvironmentGauge
									type="aqi"
									:value="aqiScore"
									size="large"
									:location-id="currentLocationData?.id ?? null"
									:refresh-key="trendReloadKey"
								/>

								<!-- 溫度儀表 -->
								<EnvironmentGauge
									type="temperature"
									:value="currentTemperature"
									:location-id="currentLocationData?.id ?? null"
									:refresh-key="trendReloadKey"
									class="border-l border-white/30"
								/>
							</div>

							<!-- 環境參數網格 -->
							<div
								v-if="currentLocationData && currentLocationData.parameters.length > 0"
								class="mt-8 grid grid-cols-3 gap-2 2xl:grid-cols-4"
							>
								<EnvironmentParamCard
									v-for="param in enabledParameters"
									:key="param.type"
									:type="param.type"
									:value="getParameterValue(param.type)"
									:icon-src="getParameterIcon(param.type)"
									:label="getParameterDisplayName(param.type)"
									:unit="getParameterUnit(param.type)"
									:fraction-digits="getParameterFractionDigits(param.type)"
									:device-error="showSensorOffline"
									:get-status-text="getStatusText"
									:get-status-text-class="getStatusTextClass"
									:to-fixed-number="formatParamDisplay"
								/>
							</div>
							<div
								v-else
								class="flex min-h-[248px] flex-col items-center justify-center py-8 text-center text-white/60"
							>
								<p class="text-base 2xl:text-lg">尚未配置感測器參數</p>
								<p class="mt-2 text-sm 2xl:text-base">請在「地點管理」中新增參數</p>
							</div>
						</div>

						<div
							v-else-if="sortedLocations.length > 0"
							key="pick-location"
							class="mt-12 flex min-h-[600px] w-full items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
						>
							<p class="text-xl font-medium text-white/90 2xl:text-3xl">請選擇地點</p>
							<p class="mt-2 text-sm text-white/70">請從右側總覽點選地點以查看詳細資訊</p>
						</div>
					</Transition>
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
								<template v-if="sortedLocations.length > 0">
									<OverviewLocationCard
										v-for="location in sortedLocations"
										:key="getLocationId(location)"
										:data-overview-location-id="getLocationId(location)"
										:name="location.name"
										:zone="getLocationZone(location) || ''"
										v-bind="getOverviewLocationCardBindings(location)"
										:disabled="!getLocationDeviceIds(location).length"
										:get-status-text="getStatusText"
										class="cursor-pointer transition-all hover:ring-2 hover:ring-cyan-300/50"
										:class="{ 'ring-2 ring-cyan-400': isCurrentLocation(location) }"
										@click="selectLocation(location)"
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
		v-if="isAdmin"
		v-model="showLocationManagementDialog"
		:zones="environmentZones"
		system-type="environment"
		:require-image-url="false"
		device-hint="請先在「設備管理」中建立感測器設備"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
	<SimulationFrame v-model="showSimulationFrame" title="環境監控 - 完整報表">
		<EnvironmentSimulation
			:summary-readings="simulationReadingsSummary"
			:detail-readings="simulationReadingsDetail"
			:preset="simulationTimeRange.preset"
			:zone-name="simulationZoneName"
			:location-name="simulationLocationName"
			:time-range="simulationTimeRange"
			:get-cell-class="getReportCellClass"
			@update:time-range="handleSimulationTimeRangeUpdate"
		/>
	</SimulationFrame>
</template>

<script setup lang="ts">
import EnvironmentGauge from "~/components/environment/EnvironmentGauge.vue";
import EnvironmentParamCard from "~/components/environment/EnvironmentParamCard.vue";
import OverviewLocationCard from "~/components/environment/OverviewLocationCard.vue";
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue";
import SimulationFrame from "~/components/common/SimulationFrame.vue";
import EnvironmentSimulation from "~/components/environment/EnvironmentSimulation.vue";
import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useZoneManagement } from "~/composables/location/management/useZoneManagement";
import { useAlertRules } from "~/composables/monitoring/useAlertRules";
import { useAuth } from "~/composables/core/useAuth";
import { useEnvironmentReadingSubscription } from "~/composables/systems/environment/useEnvironmentLive";
import { useEnvironmentDataCoordinator } from "~/composables/systems/environment/useEnvironmentDataCoordinator";
import type { SensorReadings } from "~/composables/systems/environment/useEnvironmentLive";
import type { AlertRule } from "~/types/alert";
import {
	getParameterDisplayName,
	getParameterUnit,
	getParameterIcon,
	getParameterFractionDigits,
	getLocationDeviceIds,
	cleanZone
} from "~/utils/sensorUtils";
import type {
	EnvironmentZone,
	EnvironmentLocation,
	SensorParameter,
	SensorParameterType,
	SensorReading
} from "~/types/environment";
import type { UnifiedZone } from "~/types/location";
import { unifiedToEnvironmentZone } from "~/utils/locationAdapter";
import { getTimeRangeUTC } from "~/utils/dateUtils";
import { compareZonesLoose } from "~/utils/sortOrder";
import { findLocationIndexInZone, getLocationUiKey } from "~/utils/locationUiId";
import { calculateAqiScore } from "~/utils/environmentAqi";
import { formatSensorDisplayValue } from "~/utils/environmentLive";
import {
	normalizeMonitoringStatusText,
	monitoringStatusTextToUiStatus,
	type MonitoringUiStatus
} from "~/utils/monitoringStatus";

definePageMeta({
	layout: "default"
});

const { isAdmin } = useAuth();

const environmentApi = useEnvironmentApi();
const locationApi = useLocationApi();
const { handleError } = useErrorHandler();
const { getRules, getStatusText: getStatusTextFromRules } = useAlertRules();

// 警報規則緩存
const alertRules = ref<AlertRule[]>([]);
const rulesLoaded = ref(false);

// 環境區域和地點資料
const environmentZones = ref<EnvironmentZone[]>([]);
const isLoadingZones = ref(false);
const showLocationManagementDialog = ref(false);
const showSimulationFrame = ref(false);
const simulationReadingsSummary = ref<SensorReading[]>([]);
const simulationReadingsDetail = ref<SensorReading[]>([]);
const selectedLocationId = ref<string>("");

const { start: todayStart, end: todayEnd } = getTimeRangeUTC("today");
const simulationTimeRange = ref({
	startDate: todayStart.toISOString(),
	endDate: todayEnd.toISOString(),
	preset: "today"
});

// 模擬框用：區域名、地點名、設備配置字串
const simulationZoneName = computed(() =>
	currentLocationData.value ? (getLocationZone(currentLocationData.value) ?? "") : ""
);
const simulationLocationName = computed(() => currentLocationData.value?.name ?? "");

const loadSimulationReadings = async () => {
	const loc = currentLocationData.value;
	const preset = simulationTimeRange.value.preset;
	const startDate = simulationTimeRange.value.startDate;
	const endDate = simulationTimeRange.value.endDate;
	if (!loc?.id || !startDate || !endDate) {
		simulationReadingsSummary.value = [];
		simulationReadingsDetail.value = [];
		return;
	}
	try {
		const isDayRange = preset === "today" || preset === "yesterday";
		if (isDayRange) {
			const [summaryRes, detailRes] = await Promise.all([
				environmentApi.getReadingsAggregated(loc.id, {
					bucket: "hour",
					startTime: startDate,
					endTime: endDate
				}),
				environmentApi.getReadings(loc.id, {
					startTime: startDate,
					endTime: endDate,
					limit: 500
				})
			]);
			simulationReadingsSummary.value = summaryRes.readings ?? [];
			simulationReadingsDetail.value = detailRes.readings ?? [];
		} else {
			// 週／月（與其他較長區間）一律用「每日平均」避免 raw 的單次 limit 截斷
			const result = await environmentApi.getReadingsAggregated(loc.id, {
				bucket: "day",
				startTime: startDate,
				endTime: endDate
			});
			simulationReadingsSummary.value = [];
			simulationReadingsDetail.value = result.readings ?? [];
		}
	} catch (error) {
		handleError(error, "載入環境讀數失敗");
		simulationReadingsSummary.value = [];
		simulationReadingsDetail.value = [];
	}
};

const handleSimulationTimeRangeUpdate = (v: {
	startDate: string;
	endDate: string;
	preset: string;
}) => {
	simulationTimeRange.value = v;
	void loadSimulationReadings();
};

const handleOpenSimulation = async () => {
	const { start, end } = getTimeRangeUTC("today");
	simulationTimeRange.value = {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset: "today"
	};
	showSimulationFrame.value = true;
	await loadSimulationReadings();
};

// 獲取地點所屬的區域名稱
const getLocationZone = (location: EnvironmentLocation): string | null => {
	for (const zone of environmentZones.value) {
		if (zone.locations.some(loc => loc.id === location.id || loc.name === location.name)) {
			return zone.name;
		}
	}
	return null;
};

// 獲取地點 ID（一律字串，供總覽 Map key 與 API 對應）
const getLocationId = (location: EnvironmentLocation): string => {
	// UI 穩定 key：優先 DB id，否則 `location-${zoneKey}-${index}`（避免 rename 造成 key 變動）
	const zone =
		environmentZones.value.find(z =>
			(z.locations || []).some(
				l => l === location || (l.id && location.id && String(l.id) === String(location.id))
			)
		) ?? null;
	if (!zone) {
		const zoneName = getLocationZone(location);
		return `${zoneName || "unknown"}-${location.name}`;
	}
	const idx = findLocationIndexInZone(zone, location);
	if (idx < 0) {
		const zoneName = getLocationZone(location);
		return `${zoneName || "unknown"}-${location.name}`;
	}
	return getLocationUiKey({ zone, location, locationIndex: idx });
};

// 當前選中的地點
const currentLocationData = computed<EnvironmentLocation | null>(() => {
	if (!selectedLocationId.value) return null;

	for (const zone of environmentZones.value) {
		const location = zone.locations.find(loc => getLocationId(loc) === selectedLocationId.value);
		if (location) return location;
	}
	return null;
});

const {
	sensorData,
	getLocationSensorData,
	isSensorOffline,
	isLocationOffline,
	isHydrating,
	handleReadingEvent,
	trendReloadKey,
	hydrateAllLocations,
	startReconcilePolling,
	stopReconcilePolling
} = useEnvironmentDataCoordinator({
	environmentZones,
	selectedLocationId,
	currentLocationData,
	getLocationId
});

/** hydrate 期間不顯示離線，避免先離線後有值 */
const showSensorOffline = computed(() => !isHydrating.value && isSensorOffline.value);

const noiseValue = computed(() => (showSensorOffline.value ? null : sensorData.noise));

const formatParamDisplay = (value: number | null, fractionDigits = 0) =>
	formatSensorDisplayValue(value, {
		fractionDigits,
		offline: showSensorOffline.value
	});

const isOverviewCollapsed = ref(false);
const overviewListRef = ref<HTMLElement | null>(null);
const detailPanelKey = computed(() => selectedLocationId.value || "__none__");

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

// 與 environmentZones 順序一致（區域已依 sort_order／名稱慣例排序，地點依後端陣列序）
const sortedLocations = computed(() => environmentZones.value.flatMap(zone => zone.locations));

// 啟用的參數（用於顯示）
const enabledParameters = computed(() => {
	if (!currentLocationData.value) return [];
	return currentLocationData.value.parameters.filter(param => param.enabled);
});

// getLocationZone / getLocationId 已於上方宣告，供 composable 與 currentLocationData 共用

useEnvironmentReadingSubscription(handleReadingEvent);

const selectLocation = (location: EnvironmentLocation) => {
	selectedLocationId.value = getLocationId(location);
};

// 載入區域和地點資料
const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return;
	isLoadingZones.value = true;
	try {
		const result = await environmentApi.getZones();
		// 與首頁／全區一致：sort_order → 名稱數字 → id
		const sortedZones = [...(result.zones || []).map(cleanZone)].sort((a, b) =>
			compareZonesLoose(a, b)
		);
		environmentZones.value = sortedZones;
	} catch (error) {
		handleError(error, "載入區域列表失敗");
	} finally {
		isLoadingZones.value = false;
	}
};

// 使用區域管理 composable
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<EnvironmentLocation, EnvironmentZone>();

// 處理儲存區域
const handleSaveZone = async (zone: EnvironmentZone) => {
	await baseHandleSaveZone(
		zone,
		environmentZones,
		async (z: EnvironmentZone) => {
			// 檢查是否為臨時 ID（以 temp- 開頭）或有效的數字 ID
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id);
			const result = isValidId
				? await environmentApi.updateZone(z.id, {
						name: z.name,
						sortOrder: (z as unknown as { sortOrder?: number }).sortOrder,
						locations: z.locations
					})
				: await environmentApi.createZone({
						name: z.name,
						sortOrder: (z as unknown as { sortOrder?: number }).sortOrder,
						locations: z.locations
					});
			// 確保返回的 zone 有 id
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as EnvironmentZone & {
				id: string;
			};
			return {
				merged: result.merged,
				message: result.message,
				zone: zoneWithId
			};
		},
		{
			cleanZone: cleanZone
		}
	);
};

// 處理刪除區域
const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, environmentZones, environmentApi.deleteZone, {
		selectedLocationRef: selectedLocationId,
		getLocationId,
		systemType: "environment",
		onAfterDelete: async () => {
			await loadZonesFromAPI();
		}
	});
};

// 獲取參數值
const getParameterValue = (type: SensorParameter["type"]): number | null => {
	let value: number | null = null;
	switch (type) {
		case "pm25":
			value = sensorData.pm25;
			break;
		case "pm10":
			value = sensorData.pm10;
			break;
		case "tvoc":
			value = sensorData.tvoc;
			break;
		case "hcho":
			value = sensorData.hcho;
			break;
		case "humidity":
			value = sensorData.humidity;
			break;
		case "temperature":
			value = sensorData.temperature;
			break;
		case "co2":
			value = sensorData.co2;
			break;
		case "noise":
			value = sensorData.noise;
			break;
		case "wind":
			value = sensorData.wind;
			break;
		default:
			return null;
	}

	return value;
};

// getParameterIcon 和 getParameterFractionDigits 已從 composable 導入

// 檢查是否為當前選中的地點
const isCurrentLocation = (location: EnvironmentLocation): boolean => {
	return getLocationId(location) === selectedLocationId.value;
};

// 獲取地點的顯示資料（支援所有地點，不僅限於當前選中）
const getLocationDisplayData = (location: EnvironmentLocation) => {
	const locationParams = location.parameters.filter(param => param.enabled);

	if (!isHydrating.value && isLocationOffline(location)) {
		return {
			params: locationParams.map(param => ({
				label: getParameterDisplayName(param.type),
				value: "--",
				unit: getParameterUnit(param.type),
				alertClass: getStatusTextClass(param.type, null),
				type: param.type,
				rawValue: null as number | null
			})),
			aqi: null,
			noise: null
		};
	}

	// 優先使用資料庫 ID（與 WebSocket 一致），key 統一字串
	const locationId = location.id != null ? String(location.id) : getLocationId(location);
	const locationSensorData = getLocationSensorData(locationId);

	const dataSource = isCurrentLocation(location) ? sensorData : locationSensorData;
	if (!dataSource) {
		return {
			params: undefined,
			aqi: null,
			noise: null
		};
	}

	return {
		params: locationParams.map(param => {
			const value = dataSource[param.type];
			return {
				label: getParameterDisplayName(param.type),
				value:
					value !== null
						? formatSensorDisplayValue(value, {
								fractionDigits: getParameterFractionDigits(param.type)
							})
						: "--",
				unit: getParameterUnit(param.type),
				alertClass: getStatusTextClass(param.type, value),
				type: param.type,
				rawValue: value
			};
		}),
		aqi: calculateAQI(dataSource),
		noise: dataSource.noise
	};
};

const getOverviewLocationCardBindings = (location: EnvironmentLocation) => {
	const displayData = getLocationDisplayData(location);
	return {
		aqi: displayData.aqi,
		noise: displayData.noise,
		params: displayData.params,
		getStatusText: getStatusTextForLocation(location)
	};
};

// 載入警報規則（`useAlertRules`：單次 GET 全量後依 threshold 過濾，失敗回空陣列）
const loadAlertRules = async () => {
	const rules = await getRules("environment", "threshold");
	alertRules.value = rules;
	rulesLoaded.value = true;
};

onMounted(async () => {
	await loadAlertRules();
	await loadZonesFromAPI();
	await hydrateAllLocations(true);
	if (!selectedLocationId.value) {
		const first = environmentZones.value.find(z => z.locations?.length)?.locations?.[0];
		if (first) selectedLocationId.value = getLocationId(first);
	}
	startReconcilePolling();
	await nextTick();
	scrollActiveOverviewIntoView();
});

onBeforeUnmount(() => {
	stopReconcilePolling();
});

// 計算 AQI（共用函數）
const calculateAQI = (data: SensorReadings): number | null => {
	return calculateAqiScore({ pm25: data.pm25, pm10: data.pm10 });
};

// 當沒有設備時，AQI 和溫度應該為 null
const aqiScore = computed(() => {
	if (!getLocationDeviceIds(currentLocationData.value).length) return null;
	if (showSensorOffline.value) return null;
	return calculateAQI(sensorData);
});

const currentTemperature = computed(() => {
	if (!getLocationDeviceIds(currentLocationData.value).length) return null;
	if (showSensorOffline.value) return null;
	return sensorData.temperature;
});

// 取得當前地點的顯示字串（共用函數）
const getStatusTextForLocation =
	(location: EnvironmentLocation) =>
	(type: string, value: number | null): string => {
		if (isHydrating.value) return "載入中";
		if (isLocationOffline(location)) return "離線";
		return getStatusText(type, value);
	};

const getStatusText = (type: string, value: number | null): string => {
	if (isHydrating.value) return "載入中";
	if (showSensorOffline.value) return "離線";
	if (value === null) return "離線";

	// 如果規則已載入，使用規則判斷
	if (rulesLoaded.value) {
		try {
			const status = getStatusTextFromRules(type, value, alertRules.value);
			return status;
		} catch (error) {
			console.warn("[environment] 使用規則判斷狀態失敗，視為正常:", error);
		}
	}

	// 規則尚未載入時，不推測門檻，避免與「警報設定」不一致
	return "正常";
};

const getStatusTextClass = (type: string, value: number | null): string => {
	const status = normalizeMonitoringStatusText(getStatusText(type, value));
	const ui = monitoringStatusTextToUiStatus(status);

	if (ui === "normal") return "text-green-300";
	if (ui === "warning") return "text-yellow-300";
	if (ui === "alarm") return "text-red-300";
	if (ui === "offline") return "text-white/60";
	return "text-white/70";
};

/** 完整報表儲存格背景：超過閾值標黃/紅 */
const getReportCellClass = (type: string, value: number | null): string => {
	const status = normalizeMonitoringStatusText(getStatusText(type, value));
	const ui: MonitoringUiStatus = monitoringStatusTextToUiStatus(status);

	if (ui === "warning") return "bg-yellow-500/30";
	if (ui === "alarm") return "bg-red-500/30";
	return "";
};
</script>
