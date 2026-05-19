<template>
	<div class="relative">
		<div class="grid grid-cols-10 gap-4 2xl:gap-8">
			<!-- 左側欄 - 環境監測（未授權時不顯示數據） -->
			<div class="col-span-3">
				<div
					v-if="showLicensePlaceholder"
					class="rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center"
				>
					<p class="text-white/60">載入中...</p>
				</div>
				<div v-else-if="hasEnvironment" class="min-w-0">
					<EnvironmentDashboard
						v-if="selectedLocation"
						:location="selectedLocation"
						:sensor-data="sensorData"
						:device-model-config="deviceModelConfig"
						:sensor-offline="isSensorOffline"
					/>
					<div
						v-else-if="selectedUnifiedLocation"
						class="rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center"
					>
						<p class="text-white/60">該地點未配置環境監測系統</p>
					</div>
					<div v-else class="rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center">
						<p class="text-white/60">載入地點中...</p>
					</div>
				</div>
				<div
					v-else
					class="rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center"
				>
					<p class="text-white/60">尚無資料</p>
				</div>
			</div>

			<!-- 中間區域 - 人員統計 -->
			<div class="col-span-4">
				<div class="mb-4 w-full 2xl:mb-6">
					<FilterDropdown
						v-model="selectedLocationId"
						:options="locationOptions"
						placeholder="請選擇區域地點"
						textSize="text-4xl"
					/>
				</div>
				<div
					v-if="showLicensePlaceholder"
					class="mb-4 rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center 2xl:mb-6"
				>
					<p class="text-white/60">載入中...</p>
				</div>
				<div v-else-if="hasPeopleCounting" class="mb-4 min-w-0 2xl:mb-6">
					<PersonnelStats :locations="filteredPeopleCountingLocations" />
				</div>
				<div
					v-else
					class="mb-4 rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center 2xl:mb-6"
				>
					<p class="text-white/60">尚無資料</p>
				</div>
				<HomeVideoPlayer />
			</div>

			<!-- 右側欄 - 人員進出記錄 -->
			<div class="col-span-3">
				<div
					v-if="showLicensePlaceholder"
					class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
				>
					<p class="text-sm text-white/60 xl:text-base">載入中...</p>
				</div>
				<div v-else-if="hasPeopleCounting" class="min-w-0">
					<EntryExitLog
						:logs="filteredLocationLogs"
						:display-columns="homeLogDisplayColumns"
					/>
				</div>
				<div
					v-else
					class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
				>
					<p class="text-sm text-white/60 xl:text-base">尚無資料</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import EnvironmentDashboard from "~/components/home/EnvironmentDashboard.vue";
import PersonnelStats from "~/components/home/PersonnelStats.vue";
import HomeVideoPlayer from "~/components/home/HomeVideoPlayer.vue";
import EntryExitLog from "~/components/home/EntryExitLog.vue";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { usePolling } from "~/composables/monitoring/usePolling";
import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi";
import { useDeviceConnectivity } from "~/composables/systems/devices/useDeviceConnectivity";
import { isEnvironmentLocationLive } from "~/utils/environmentLiveReadings";
import { useZoneManagement } from "~/composables/location/management/useZoneManagement";
import type { EnvironmentLocation, SensorParameterType } from "~/types/environment";
import type { UnifiedZone, UnifiedLocation, EnvironmentSystemConfig } from "~/types/location";
import type {
	Device,
	SensorDeviceConfig,
	SensorDeviceModelConfig,
} from "~/types/device";
import { firstLocationInSortedZones } from "~/utils/sortOrder";
import { getLocationDeviceIds } from "~/utils/sensorUtils";
import { usePeopleCountingState } from "~/composables/systems/peopleCounting/usePeopleCountingState";
import { usePeopleCountingWebSocket } from "~/composables/systems/peopleCounting/usePeopleCountingWebSocket";
import { usePeopleCountingApi } from "~/composables/systems/peopleCounting/usePeopleCountingApi";
import { useLicense } from "~/composables/core/useLicense";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import type { PeopleCountingLog } from "~/types/peopleCounting";
import { normalizeLogDisplayColumns } from "~/utils/peopleCountingLogColumns";

definePageMeta({
	layout: "default"
});

const locationApi = useLocationApi();
const deviceApi = useDeviceApi();
const environmentApi = useEnvironmentApi();
const deviceConnectivity = useDeviceConnectivity();
const { canLoadFeature, isLoaded: licenseLoaded } = useLicense();
const { ensureLoaded: ensureModuleRegistryLoaded } = useModuleRegistry();
const hasEnvironment = computed(() => canLoadFeature("environment"));
const hasPeopleCounting = computed(() => canLoadFeature("people_counting"));
// 僅在客戶端 mount 後才依授權切換內容，避免 SSR 與 hydration 時 state 不同步導致節點不匹配
const isMounted = ref(false);
const showLicensePlaceholder = computed(
	() => !isMounted.value || !licenseLoaded.value
);
const { handleError } = useErrorHandler();
const { sortZones } = useZoneManagement<UnifiedLocation, UnifiedZone>();

// 人流統計相關
const { locations: peopleCountingLocations, loadLocations: loadPeopleCountingLocations } =
	usePeopleCountingState();

const peopleCountingApi = usePeopleCountingApi();

// 進出記錄：僅依所選地點抓取，最多 8 筆
const MAX_DISPLAY_LOGS = 8;
const locationLogs = ref<PeopleCountingLog[]>([]);

const loadLocationLogs = async (locationId: string) => {
	if (!hasPeopleCounting.value) {
		locationLogs.value = [];
		return;
	}
	try {
		const list = await peopleCountingApi.getLocationLogs(Number(locationId), {
			limit: MAX_DISPLAY_LOGS
		});
		const sorted = [...list].sort((a, b) => {
			const timeA = new Date(a.timestamp).getTime();
			const timeB = new Date(b.timestamp).getTime();
			return timeB - timeA;
		});
		locationLogs.value = sorted.slice(0, MAX_DISPLAY_LOGS);
	} catch (error) {
		console.error("[index] 載入進出記錄失敗:", error);
		locationLogs.value = [];
	}
};

// 統一區域和地點資料（包含所有系統）
const unifiedZones = ref<UnifiedZone[]>([]);
const isLoadingZones = ref(false);
const selectedLocationId = ref<string>("");

/** 首頁選取之統一地點（localStorage 固定下次進入） */
const LS_HOME_UNIFIED_LOCATION_ID = "ba-construction-home-unified-location-id";
const isHydratingHomeLocation = ref(false);

const persistHomeUnifiedLocationId = () => {
	if (!import.meta.client) return;
	const v = selectedLocationId.value;
	if (v) localStorage.setItem(LS_HOME_UNIFIED_LOCATION_ID, v);
	else localStorage.removeItem(LS_HOME_UNIFIED_LOCATION_ID);
};

const restoreHomeUnifiedLocationIdFromStorage = () => {
	if (!import.meta.client) return;
	const s = localStorage.getItem(LS_HOME_UNIFIED_LOCATION_ID);
	if (s) selectedLocationId.value = s;
};

const reconcileHomeLocationWithZones = () => {
	if (unifiedZones.value.length === 0) {
		selectedLocationId.value = "";
		return;
	}
	const validIds = new Set(
		unifiedZones.value.flatMap(zone => zone.locations.map(loc => getLocationId(loc)))
	);
	if (!selectedLocationId.value || !validIds.has(selectedLocationId.value)) {
		const first = firstLocationInSortedZones(unifiedZones.value);
		selectedLocationId.value = first ? getLocationId(first) : "";
	}
};

// 獲取地點 ID
const getLocationId = (location: UnifiedLocation): string => {
	return location.id || `unknown-${location.name}`;
};

// 從統一地點中提取環境監測系統配置
const extractEnvironmentLocation = (
	unifiedLocation: UnifiedLocation
): EnvironmentLocation | null => {
	const envSystem = unifiedLocation.systems?.find(s => s.systemType === "environment");
	if (!envSystem) {
		return null;
	}

	// 類型守衛：檢查是否為環境監測系統配置
	const config = envSystem.config;
	if (
		!config ||
		typeof config !== "object" ||
		!("parameters" in config) ||
		!Array.isArray(config.parameters)
	) {
		return null;
	}

	const envConfig = config as EnvironmentSystemConfig;
	const deviceIds = Array.isArray(envConfig.deviceIds)
		? envConfig.deviceIds
		: envConfig.deviceId != null
			? [envConfig.deviceId]
			: [];

	return {
		id: unifiedLocation.id,
		systemId: envSystem.id,
		name: unifiedLocation.name,
		deviceId: envConfig.deviceId ?? deviceIds[0],
		deviceIds: deviceIds.length ? deviceIds : undefined,
		parameters: (envConfig.parameters || []).map(param => ({
			type: param.type as SensorParameterType,
			enabled: param.enabled
		}))
	};
};

// 感測器設備和配置
const sensorDevice = ref<Device | null>(null);
const deviceModelConfig = ref<SensorDeviceModelConfig | null>(null);

// 當前選中的統一地點
const selectedUnifiedLocation = computed<UnifiedLocation | null>(() => {
	if (!selectedLocationId.value) return null;

	for (const zone of unifiedZones.value) {
		const location = zone.locations.find(loc => getLocationId(loc) === selectedLocationId.value);
		if (location) return location;
	}
	return null;
});

// 當前選中的環境監測地點（從統一地點中提取）
const selectedLocation = computed<EnvironmentLocation | null>(() => {
	if (!selectedUnifiedLocation.value) return null;
	return extractEnvironmentLocation(selectedUnifiedLocation.value);
});

const collectEnvironmentDeviceIds = (): number[] => {
	const ids = new Set<number>();
	for (const zone of unifiedZones.value) {
		for (const location of zone.locations) {
			const envLoc = extractEnvironmentLocation(location);
			getLocationDeviceIds(envLoc).forEach((id) => ids.add(id));
		}
	}
	return [...ids].sort((a, b) => a - b);
};

watch(
	() => collectEnvironmentDeviceIds().join(","),
	() => {
		void deviceConnectivity.refresh(collectEnvironmentDeviceIds());
	},
	{ immediate: true }
);

const locationOptions = computed(() =>
	unifiedZones.value.flatMap(zone =>
		zone.locations.map(location => ({
			value: getLocationId(location),
			label: `${zone.name} - ${location.name}`
		}))
	)
);

const findMatchingPeopleCountingLocation = (unifiedLocation: UnifiedLocation | null) => {
	if (!unifiedLocation) return null;
	if (unifiedLocation.id) {
		const byId = peopleCountingLocations.value.find(
			pc => pc.id === unifiedLocation.id || String(pc.locationId) === unifiedLocation.id
		);
		if (byId) return byId;
	}
	return peopleCountingLocations.value.find(pc => pc.name === unifiedLocation.name) ?? null;
};

const matchedPeopleCountingLocation = computed(() =>
	findMatchingPeopleCountingLocation(selectedUnifiedLocation.value)
);

const filteredPeopleCountingLocations = computed(() => {
	if (!hasPeopleCounting.value) return [];
	const matched = matchedPeopleCountingLocation.value;
	return matched ? [matched] : [];
});

const filteredLocationLogs = computed(() => locationLogs.value);

const homeLogDisplayColumns = computed(() =>
	normalizeLogDisplayColumns(matchedPeopleCountingLocation.value?.logDisplayColumns)
);

// 感測器資料
type SensorReadings = {
	pm25: number | null;
	pm10: number | null;
	tvoc: number | null;
	hcho: number | null;
	humidity: number | null;
	temperature: number | null;
	co2: number | null;
	noise: number | null;
	wind: number | null;
};

const sensorData = reactive<SensorReadings>({
	pm25: null,
	pm10: null,
	tvoc: null,
	hcho: null,
	humidity: null,
	temperature: null,
	co2: null,
	noise: null,
	wind: null
});

const loadDeviceAndModelConfig = async (
	deviceId: number
): Promise<{ device: Device; modelConfig: SensorDeviceModelConfig | null } | null> => {
	try {
		const { device } = await deviceApi.getDevice(deviceId);
		if (!device || device.type_code !== "sensor") return null;

		const deviceWithModel = device as { model?: { config?: SensorDeviceModelConfig } };
		let modelConfig: SensorDeviceModelConfig | null = deviceWithModel.model?.config?.sensorParameters
			? (deviceWithModel.model.config as SensorDeviceModelConfig)
			: null;

		if (!modelConfig && device.model_id) {
			try {
				const { device_model } = await deviceApi.getDeviceModel(device.model_id);
				modelConfig = (device_model?.config as SensorDeviceModelConfig | undefined) ?? null;
			} catch {
				// 忽略型號載入失敗
			}
		}
		return { device, modelConfig };
	} catch {
		return null;
	}
};

const loadZones = async () => {
	if (isLoadingZones.value) return;
	isLoadingZones.value = true;
	try {
		const { zones = [] } = await locationApi.getZones();
		unifiedZones.value = sortZones(zones);
	} catch (error) {
		handleError(error, "載入區域列表失敗");
	} finally {
		isLoadingZones.value = false;
	}
};

const loadLocationSensorDevice = async (location: EnvironmentLocation) => {
	const primaryId = getLocationDeviceIds(location)[0];
	if (!primaryId) {
		sensorDevice.value = null;
		deviceModelConfig.value = null;
		return;
	}

	try {
		const { device } = await deviceApi.getDevice(primaryId);
		if (!device || device.type_code !== "sensor") {
			sensorDevice.value = null;
			deviceModelConfig.value = null;
			return;
		}

		sensorDevice.value = device;

		const deviceWithModel = device as { model?: { config?: SensorDeviceModelConfig } };
		let modelConfig: SensorDeviceModelConfig | null = deviceWithModel.model?.config?.sensorParameters
			? (deviceWithModel.model.config as SensorDeviceModelConfig)
			: null;

		if (!modelConfig && device.model_id) {
			try {
				const { device_model } = await deviceApi.getDeviceModel(device.model_id);
				modelConfig = (device_model?.config as SensorDeviceModelConfig | undefined) ?? null;
			} catch (error) {
				console.warn("[index] 載入設備型號配置失敗:", error);
			}
		}
		deviceModelConfig.value = modelConfig;
	} catch (error) {
		console.error("[index] 載入設備失敗:", error);
		sensorDevice.value = null;
		deviceModelConfig.value = null;
	}
};

const isFetching = ref(false);
const isSensorOffline = ref(false);

const loadSensorData = async () => {
	if (isFetching.value) return;
	if (!hasEnvironment.value || !selectedLocation.value) return;
	if (!selectedLocation.value.id) return;

	isFetching.value = true;

	const enabledParams = selectedLocation.value.parameters.filter(param => param.enabled);
	Object.keys(sensorData).forEach(key => {
		(sensorData as Record<string, number | null>)[key] = null;
	});

	try {
		const deviceIds = getLocationDeviceIds(selectedLocation.value);
		const { readings } = await environmentApi.getReadings(String(selectedLocation.value.id), {
			limit: 1,
			order: "desc"
		});
		const latest = readings?.[0];
		const isLive = isEnvironmentLocationLive({
			deviceIds,
			readingTimestamp: latest?.timestamp,
			getDeviceStatus: deviceConnectivity.getStatus
		});

		if (!isLive) {
			isSensorOffline.value = true;
			return;
		}

		const data = (latest?.data || {}) as Record<string, unknown>;
		for (const param of enabledParams) {
			const raw = data[param.type];
			(sensorData as Record<string, number | null>)[param.type] =
				typeof raw === "number" && Number.isFinite(raw) ? raw : null;
		}

		isSensorOffline.value = false;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (
			errorMessage.includes("503") ||
			errorMessage.includes("設備離線") ||
			errorMessage.includes("服務不可用")
		) {
			isSensorOffline.value = true;
		} else {
			// 其他錯誤（真正的後端連接錯誤、CORS 等）- 只在感測器在線時顯示，避免重複提示
			// 使用統一錯誤處理（會自動去重和優先級判斷）
			if (!isSensorOffline.value) {
				handleError(error, "讀取感測器資料失敗");
			}
		}
	} finally {
		isFetching.value = false;
	}
};

const SENSOR_POLLING_INTERVAL = 30000;

const { start: startPolling } = usePolling({
	callback: async () => {
		const ids = collectEnvironmentDeviceIds();
		if (ids.length > 0) await deviceConnectivity.refresh(ids);
		await loadSensorData();
	},
	interval: SENSOR_POLLING_INTERVAL,
	immediate: false,
	onError: err => handleError(err, "載入感測器資料失敗")
});

const initializeLocationData = async () => {
	if (!hasEnvironment.value || !selectedLocation.value) return;
	await loadLocationSensorDevice(selectedLocation.value);
	await nextTick();
	await loadSensorData();
};

watch(
	() => selectedLocationId.value,
	async () => {
		persistHomeUnifiedLocationId();
		if (!selectedLocationId.value) return;
		if (isHydratingHomeLocation.value) return;
		const matched = matchedPeopleCountingLocation.value;
		const locationId = matched?.locationId != null ? String(matched.locationId) : null;
		await Promise.allSettled([
			initializeLocationData(),
			locationId && hasPeopleCounting.value ? loadLocationLogs(locationId) : Promise.resolve()
		]);
		if (!locationId || !hasPeopleCounting.value) locationLogs.value = [];
	}
);

const { setupEventListeners } = usePeopleCountingWebSocket();
let cleanupWebSocket: (() => void) | null = null;

const refreshCurrentLocationLogs = async () => {
	if (!hasPeopleCounting.value) {
		locationLogs.value = [];
		return;
	}
	const matched = matchedPeopleCountingLocation.value;
	if (matched?.locationId != null) {
		await loadLocationLogs(String(matched.locationId));
	} else {
		locationLogs.value = [];
	}
};

onMounted(async () => {
	isMounted.value = true;
	await ensureModuleRegistryLoaded();
	cleanupWebSocket = setupEventListeners(async () => {
		if (hasPeopleCounting.value) {
			await loadPeopleCountingLocations();
			await refreshCurrentLocationLogs();
		}
	}, 500);

	isHydratingHomeLocation.value = true;
	try {
		restoreHomeUnifiedLocationIdFromStorage();
		const [zonesResult, peopleCountingResult] = await Promise.allSettled([
			loadZones(),
			hasPeopleCounting.value ? loadPeopleCountingLocations() : Promise.resolve()
		]);
		reconcileHomeLocationWithZones();
		persistHomeUnifiedLocationId();
		await nextTick();

		const parallelTasks: Promise<void>[] = [];
		if (zonesResult.status === "fulfilled" && hasEnvironment.value) {
			const ids = collectEnvironmentDeviceIds();
			if (ids.length > 0) {
				parallelTasks.push(deviceConnectivity.refresh(ids).then(() => undefined).catch(console.error));
			}
			parallelTasks.push(initializeLocationData().catch(console.error));
		}
		if (peopleCountingResult.status === "fulfilled" && hasPeopleCounting.value) {
			parallelTasks.push(refreshCurrentLocationLogs().catch(console.error));
		}
		await Promise.allSettled(parallelTasks);
	} finally {
		isHydratingHomeLocation.value = false;
	}
	startPolling();
});

watch(
	() => peopleCountingLocations.value,
	() => {
		if (hasPeopleCounting.value) refreshCurrentLocationLogs();
	},
	{ deep: true }
);

onBeforeUnmount(() => {
	if (cleanupWebSocket) {
		cleanupWebSocket();
		cleanupWebSocket = null;
	}
});
</script>
