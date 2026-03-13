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
					<EntryExitLog :logs="filteredLocationLogs" />
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
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { useApiBase } from "~/composables/core/useApiBase";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useToast } from "~/composables/core/useToast";
import { usePolling } from "~/composables/monitoring/usePolling";
import { useZoneManagement } from "~/composables/systems/useZoneManagement";
import type { EnvironmentLocation, SensorParameterType } from "~/types/environment";
import type { UnifiedZone, UnifiedLocation, EnvironmentSystemConfig } from "~/types/location";
import type {
	Device,
	SensorDeviceConfig,
	SensorDeviceModelConfig,
	SensorParameterDefinition
} from "~/types/device";
import type { ModbusDeviceConfig, ModbusDataResponse } from "~/types/modbus";
import { isDeviceConnectionError } from "~/utils/errorUtils";
import { getLocationDeviceIds } from "~/utils/sensorUtils";
import { usePeopleCountingState } from "~/composables/systems/peopleCounting/usePeopleCountingState";
import { usePeopleCountingWebSocket } from "~/composables/systems/peopleCounting/usePeopleCountingWebSocket";
import { usePeopleCountingApi } from "~/composables/systems/usePeopleCountingApi";
import { useLicense } from "~/composables/core/useLicense";
import type { PeopleCountingLog } from "~/types/peopleCounting";

definePageMeta({
	layout: "default"
});

const locationApi = useLocationApi();
const deviceApi = useDeviceApi();
const { request } = useApiBase();
const { canLoadFeature, isLoaded: licenseLoaded } = useLicense();
const hasEnvironment = computed(() => canLoadFeature("environment"));
const hasPeopleCounting = computed(() => canLoadFeature("people_counting"));
// 僅在客戶端 mount 後才依授權切換內容，避免 SSR 與 hydration 時 state 不同步導致節點不匹配
const isMounted = ref(false);
const showLicensePlaceholder = computed(
	() => !isMounted.value || !licenseLoaded.value
);
const { handleError } = useErrorHandler();
const toast = useToast();
const { sortZones } = useZoneManagement<UnifiedZone>();

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

const sensorDeviceConfig = computed<ModbusDeviceConfig | null>(() => {
	if (!sensorDevice.value || sensorDevice.value.type_code !== "sensor") return null;

	const config = sensorDevice.value.config as SensorDeviceConfig;
	if (config.protocol !== "modbus" || !config.host || !config.port) return null;

	return {
		host: config.host,
		port: config.port,
		unitId: config.unitId || 1
	};
});

// 當前選中的統一地點
const selectedUnifiedLocation = computed<UnifiedLocation | null>(() => {
	if (!selectedLocationId.value) return null;

	for (const zone of unifiedZones.value) {
		const location = zone.locations.find(loc => loc.id === selectedLocationId.value);
		if (location) return location;
	}
	return null;
});

// 當前選中的環境監測地點（從統一地點中提取）
const selectedLocation = computed<EnvironmentLocation | null>(() => {
	if (!selectedUnifiedLocation.value) return null;
	return extractEnvironmentLocation(selectedUnifiedLocation.value);
});

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

// 從指定型號配置取得參數的 Modbus 配置（多設備合併讀取時每台設備各用其型號）
const getParameterModbusConfigFromModel = (
	paramType: SensorParameterType,
	modelConfig: SensorDeviceModelConfig | null
): SensorParameterDefinition["modbusConfig"] | null => {
	if (!modelConfig?.sensorParameters) return null;
	const paramDef = modelConfig.sensorParameters.find(p => p.type === paramType);
	return paramDef?.modbusConfig ?? null;
};

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

// 預設選擇的地點（區域名稱 - 地點名稱）
const DEFAULT_LOCATION = { zoneName: "遠岫", locationName: "大門口" };

const loadZones = async () => {
	if (isLoadingZones.value) return;
	isLoadingZones.value = true;
	try {
		const { zones = [] } = await locationApi.getZones();
		unifiedZones.value = sortZones(zones);

		if (unifiedZones.value.length === 0) return;

		const defaultZone = unifiedZones.value.find(z => z.name === DEFAULT_LOCATION.zoneName);
		const defaultLocation = defaultZone?.locations.find(
			loc => loc.name === DEFAULT_LOCATION.locationName
		);
		const targetLocation =
			defaultLocation ?? unifiedZones.value.flatMap(z => z.locations || []).find(() => true);
		if (targetLocation) selectedLocationId.value = getLocationId(targetLocation);
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

const readModbusRegister = async (
	modbusConfig: ModbusDeviceConfig,
	address: number
): Promise<ModbusDataResponse<number>> => {
	const queryParams = new URLSearchParams({
		host: modbusConfig.host,
		port: String(modbusConfig.port),
		unitId: String(modbusConfig.unitId),
		address: String(address)
	});

	return await request<ModbusDataResponse<number>>(
		`/modbus/holding-registers?${queryParams.toString()}`
	);
};

const readModbusRegisterBatch = async (
	modbusConfig: ModbusDeviceConfig,
	startAddress: number,
	length: number
): Promise<ModbusDataResponse<number>> => {
	const queryParams = new URLSearchParams({
		host: modbusConfig.host,
		port: String(modbusConfig.port),
		unitId: String(modbusConfig.unitId),
		address: String(startAddress),
		length: String(length)
	});

	return await request<ModbusDataResponse<number>>(
		`/modbus/holding-registers?${queryParams.toString()}`
	);
};

type AddressGroup = { start: number; length: number; addresses: number[] };

const groupConsecutiveAddresses = (addresses: number[]): AddressGroup[] => {
	if (addresses.length === 0) return [];
	const sorted = [...addresses].sort((a, b) => a - b);
	const groups: AddressGroup[] = [];
	let current: number[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === current[current.length - 1] + 1) {
			current.push(sorted[i]);
		} else {
			groups.push({ start: current[0], length: current.length, addresses: [...current] });
			current = [sorted[i]];
		}
	}
	groups.push({ start: current[0], length: current.length, addresses: current });
	return groups;
};

type ParameterWithModbusConfig = {
	type: SensorParameterType;
	modbusConfig: { address: number; transform?: string };
};

type BatchResult = { type: SensorParameterType; value: number | null; success: boolean };

const mapParamListToResults = (
	paramDataList: ParameterWithModbusConfig[],
	rawValue: number,
	success: boolean
): BatchResult[] =>
	paramDataList.map(paramData => ({
		type: paramData.type,
		value: success ? applyTransform(rawValue, paramData.modbusConfig.transform) : null,
		success
	}));

const readParametersBatch = async (
	modbusConfig: ModbusDeviceConfig,
	paramAddressMap: Map<number, ParameterWithModbusConfig[]>
): Promise<BatchResult[]> => {
	const addresses = Array.from(paramAddressMap.keys()).sort((a, b) => a - b);
	if (addresses.length === 0) return [];

	const addressGroups = groupConsecutiveAddresses(addresses);
	const readPromises: Promise<BatchResult[]>[] = [];

	for (const group of addressGroups) {
		if (group.length > 1) {
			readPromises.push(
				readModbusRegisterBatch(modbusConfig, group.start, group.length)
					.then(response =>
						group.addresses.flatMap((addr, idx) => {
							const list = paramAddressMap.get(addr);
							return list?.length ? mapParamListToResults(list, response.data[idx], true) : [];
						})
					)
					.catch(async () => {
						const fallback = await Promise.all(
							group.addresses.map(async addr => {
								const list = paramAddressMap.get(addr);
								if (!list?.length) return [];
								try {
									const res = await readModbusRegister(modbusConfig, addr);
									return mapParamListToResults(list, res.data[0], true);
								} catch {
									return mapParamListToResults(list, 0, false);
								}
							})
						);
						return fallback.flat();
					})
			);
			continue;
		}

		const addr = group.addresses[0];
		const list = paramAddressMap.get(addr);
		if (!list?.length) continue;

		readPromises.push(
			readModbusRegister(modbusConfig, addr)
				.then(res => mapParamListToResults(list, res.data[0], true))
				.catch(() => mapParamListToResults(list, 0, false))
		);
	}

	return (await Promise.all(readPromises)).flat();
};

const applyTransform = (value: number, transform?: string): number => {
	if (!transform || !transform.trim()) return value;

	try {
		const trimmed = transform.trim();
		let formula = "";

		// 檢查是否以運算符開頭（+、-、*、/）
		if (/^[\+\-\*\/]/.test(trimmed)) {
			// 確保運算符和數值之間有空格（對於減號需要特別處理）
			if (trimmed.startsWith("-")) {
				// "-1" → "value - 1", "- 1" → "value - 1"
				const numPart = trimmed.substring(1).trim();
				formula = `${value} - ${numPart}`;
			} else {
				// "/ 10" → "value / 10", "* 2" → "value * 2", "+ 5" → "value + 5"
				formula = `${value} ${trimmed}`;
			}
		} else {
			// 如果不是以運算符開頭，可能是純數值（假設是減法）
			if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
				// 純數字：假設為減法操作，例如 "1" → "value - 1"
				formula = `${value} - ${trimmed}`;
			} else {
				// 其他情況，可能是複雜表達式，將 value 替換為實際數值
				formula = trimmed.replace(/value/gi, String(value));
			}
		}

		// 使用 Function 構造函數安全地執行公式（僅允許數學運算）
		// 注意：生產環境可能需要更嚴格的驗證
		const result = Function(`"use strict"; return (${formula})`)();
		return typeof result === "number" && !isNaN(result) ? result : value;
	} catch (error) {
		console.warn("[index] 轉換公式執行失敗:", transform, error);
		return value;
	}
};

const OFFLINE_ALERT_INTERVAL = 30000;

const isFetching = ref(false);
const isSensorOffline = ref(false);
const lastOfflineAlertTime = ref<number | null>(null);

const loadSensorData = async () => {
	if (isFetching.value) return;
	if (!hasEnvironment.value || !selectedLocation.value) return;

	const deviceIds = getLocationDeviceIds(selectedLocation.value);
	if (deviceIds.length === 0) return;

	const enabledParams = selectedLocation.value.parameters.filter(param => param.enabled);
	if (enabledParams.length === 0) return;

	isFetching.value = true;

	// 每輪清空後僅合併成功讀取值
	Object.keys(sensorData).forEach(key => {
		(sensorData as Record<string, number | null>)[key] = null;
	});

	try {
		for (const deviceId of deviceIds) {
			const result = await loadDeviceAndModelConfig(deviceId);
			if (!result) continue;

			const { device, modelConfig } = result;
			const config = device.config as SensorDeviceConfig;
			if (config?.protocol !== "modbus" || !config?.host || !config?.port) continue;

			const modbusConfig: ModbusDeviceConfig = {
				host: config.host,
				port: config.port,
				unitId: config.unitId ?? 1
			};

			const paramAddressMap = new Map<number, ParameterWithModbusConfig[]>();
			for (const param of enabledParams) {
				const modbusCfg = getParameterModbusConfigFromModel(param.type, modelConfig);
				if (!modbusCfg || modbusCfg.address === undefined) continue;

				const existing = paramAddressMap.get(modbusCfg.address) ?? [];
				existing.push({
					type: param.type,
					modbusConfig: { address: modbusCfg.address, transform: modbusCfg.transform }
				});
				paramAddressMap.set(modbusCfg.address, existing);
			}

			if (paramAddressMap.size === 0) continue;

			const results = await readParametersBatch(modbusConfig, paramAddressMap);
			for (const r of results) {
				if (r.success) (sensorData as Record<string, number | null>)[r.type] = r.value;
			}
		}

		if (isSensorOffline.value) {
			isSensorOffline.value = false;
			toast.success("感測器已恢復連線", 5000);
			lastOfflineAlertTime.value = null;
		}
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		// 檢查是否為設備連接相關的錯誤
		if (isDeviceConnectionError(errorMessage)) {
			// 設備連接錯誤 - 使用防抖機制避免重複提示
			const now = Date.now();
			const shouldShowAlert =
				!isSensorOffline.value ||
				lastOfflineAlertTime.value === null ||
				now - lastOfflineAlertTime.value >= OFFLINE_ALERT_INTERVAL;

			if (shouldShowAlert) {
				isSensorOffline.value = true;
				lastOfflineAlertTime.value = now;
				toast.warning("感測器離線，無法讀取資料", 8000);
			}
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
	callback: () => loadSensorData(),
	interval: SENSOR_POLLING_INTERVAL,
	immediate: true,
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
		if (!selectedLocationId.value) return;
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
	cleanupWebSocket = setupEventListeners(async () => {
		if (hasPeopleCounting.value) {
			await loadPeopleCountingLocations();
			await refreshCurrentLocationLogs();
		}
	}, 500);

	const [zonesResult, peopleCountingResult] = await Promise.allSettled([
		loadZones(),
		hasPeopleCounting.value ? loadPeopleCountingLocations() : Promise.resolve()
	]);
	await nextTick();

	const parallelTasks: Promise<void>[] = [];
	if (zonesResult.status === "fulfilled" && hasEnvironment.value) {
		parallelTasks.push(initializeLocationData().catch(console.error));
	}
	if (peopleCountingResult.status === "fulfilled" && hasPeopleCounting.value) {
		parallelTasks.push(refreshCurrentLocationLogs().catch(console.error));
	}
	await Promise.allSettled(parallelTasks);
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
