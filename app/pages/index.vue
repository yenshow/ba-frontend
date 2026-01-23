<template>
	<div class="min-h-screen relative">
		<!-- 頂部橫幅（紅色警告區域） -->
		<div class="absolute top-0 left-0 -translate-x-[48px] -translate-y-[48px] overflow-hidden" style="width: calc(100% + 96px);">
			<SafetyBanner />
		</div>

		<!-- 頂部區域（品牌與時間） -->
		<div class="py-4">
			<HomeHeader />
		</div>

		<!-- 主要內容區域 -->
		<div
			class="grid gap-4 2xl:grid-cols-10"
		>
			<!-- 左側欄 - 環境監測數據 -->
			<div class="col-span-1 2xl:col-span-3">
				<EnvironmentDashboard
					v-if="selectedLocation"
					:location="selectedLocation"
					:sensor-data="sensorData"
					:device-model-config="deviceModelConfig"
				/>
				<div v-else-if="selectedUnifiedLocation" class="rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center">
					<p class="text-white/60">該地點未配置環境監測系統</p>
				</div>
				<div v-else class="rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center">
					<p class="text-white/60">請選擇地點以顯示環境監測數據</p>
				</div>
			</div>

			<!-- 中間區域 - 人員統計 -->
			<div class="col-span-1 2xl:col-span-4">
				<!-- 區域地點選擇器 -->
				<div class="w-full mb-5">
					<FilterDropdown
						v-model="selectedLocationId"
						:options="locationOptions"
						placeholder="請選擇區域地點"
					/>
				</div>
				<PersonnelStats :locations="filteredPeopleCountingLocations" />
			</div>

			<!-- 右側欄 - 人員進出記錄 -->
			<div class="col-span-1 2xl:col-span-3">
				<EntryExitLog :logs="filteredLocationLogs" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import SafetyBanner from "~/components/home/SafetyBanner.vue";
import HomeHeader from "~/components/home/HomeHeader.vue";
import EnvironmentDashboard from "~/components/home/EnvironmentDashboard.vue";
import PersonnelStats from "~/components/home/PersonnelStats.vue";
import EntryExitLog from "~/components/home/EntryExitLog.vue";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { useApiBase } from "~/composables/core/useApiBase";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useToast } from "~/composables/core/useToast";
import { usePolling } from "~/composables/monitoring/usePolling";
import { useZoneManagement } from "~/composables/systems/useZoneManagement";
import type {
	EnvironmentLocation,
	SensorParameterType
} from "~/types/environment";
import type { UnifiedZone, UnifiedLocation, EnvironmentSystemConfig } from "~/types/location";
import type {
	Device,
	SensorDeviceConfig,
	SensorDeviceModelConfig,
	SensorParameterDefinition
} from "~/types/device";
import type { ModbusDeviceConfig, ModbusDataResponse } from "~/types/modbus";
import { isDeviceConnectionError } from "~/utils/errorUtils";
import { cleanZone } from "~/utils/sensorUtils";
import { usePeopleCountingState } from "~/composables/systems/peopleCounting/usePeopleCountingState";
import { usePeopleCountingWebSocket } from "~/composables/systems/peopleCounting/usePeopleCountingWebSocket";
import { usePeopleCountingApi } from "~/composables/systems/usePeopleCountingApi";
import type { PeopleCountingLog } from "~/types/peopleCounting";

definePageMeta({
	layout: "default"
});

const locationApi = useLocationApi();
const deviceApi = useDeviceApi();
const { request } = useApiBase();
const { handleError } = useErrorHandler();
const toast = useToast();
const { sortZones } = useZoneManagement<UnifiedZone>();

// 人流統計相關
const {
	locations: peopleCountingLocations,
	loadLocations: loadPeopleCountingLocations
} = usePeopleCountingState();

const peopleCountingApi = usePeopleCountingApi();

// 進出記錄相關常數
const LOGS_PER_LOCATION = 10;
const MAX_DISPLAY_LOGS = 8;

// 聚合所有地點的進出記錄
const allLocationLogs = ref<PeopleCountingLog[]>([]);

// 載入所有地點的進出記錄
const loadAllLocationLogs = async () => {
	try {
		const allLogs: PeopleCountingLog[] = [];

		// 並行載入所有地點的記錄
		const logPromises = peopleCountingLocations.value.map(location => {
			if (!location.locationId) return Promise.resolve([]);
			return peopleCountingApi.getLocationLogs(location.locationId, { limit: LOGS_PER_LOCATION });
		});

		const results = await Promise.allSettled(logPromises);
		
		results.forEach(result => {
			if (result.status === "fulfilled") {
				allLogs.push(...result.value);
			}
		});

		// 按時間排序（最新的在前）
		allLogs.sort((a, b) => {
			const timeA = new Date(a.timestamp).getTime();
			const timeB = new Date(b.timestamp).getTime();
			return timeB - timeA;
		});

		// 只保留最新的記錄
		allLocationLogs.value = allLogs.slice(0, MAX_DISPLAY_LOGS);
	} catch (error) {
		console.error("[index] 載入進出記錄失敗:", error);
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
const extractEnvironmentLocation = (unifiedLocation: UnifiedLocation): EnvironmentLocation | null => {
	const envSystem = unifiedLocation.systems?.find(s => s.systemType === "environment");
	if (!envSystem) {
		return null;
	}

	// 類型守衛：檢查是否為環境監測系統配置
	const config = envSystem.config;
	if (!config || typeof config !== "object" || !("parameters" in config) || !Array.isArray(config.parameters)) {
		return null;
	}

	const envConfig = config as EnvironmentSystemConfig;

	return {
		id: unifiedLocation.id,
		systemId: envSystem.id,
		name: unifiedLocation.name,
		deviceId: envConfig.deviceId,
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
	if (!sensorDevice.value || sensorDevice.value.type_code !== "sensor") {
		return null;
	}

	const config = sensorDevice.value.config as SensorDeviceConfig;
	if (config.protocol !== "modbus" || !config.host || !config.port) {
		return null;
	}

	const unitId = config.unitId || 1;

	return {
		host: config.host,
		port: config.port,
		unitId
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

// 地點選項列表（用於下拉選單）- 顯示所有地點
const locationOptions = computed(() => {
	const options: Array<{ value: string; label: string }> = [];
	
	unifiedZones.value.forEach(zone => {
		zone.locations.forEach(location => {
			const locationId = getLocationId(location);
			const label = `${zone.name} - ${location.name}`;
			options.push({ value: locationId, label });
		});
	});
	
	return options;
});

// 根據選中的統一地點找到對應的人流統計地點
// 優先通過 ID 匹配，如果沒有則通過名稱匹配
const findMatchingPeopleCountingLocation = (unifiedLocation: UnifiedLocation | null) => {
	if (!unifiedLocation) return null;
	
	// 先嘗試通過 ID 匹配
	if (unifiedLocation.id) {
		const matchedById = peopleCountingLocations.value.find(
			pcLocation => pcLocation.id === unifiedLocation.id || String(pcLocation.locationId) === unifiedLocation.id
		);
		if (matchedById) return matchedById;
	}
	
	// 如果 ID 匹配失敗，嘗試通過名稱匹配
	const matchedByName = peopleCountingLocations.value.find(
		pcLocation => pcLocation.name === unifiedLocation.name
	);
	if (matchedByName) return matchedByName;
	
	return null;
};

// 過濾後的人流統計地點（根據選中的統一地點）
const filteredPeopleCountingLocations = computed(() => {
	if (!selectedUnifiedLocation.value) {
		// 如果沒有選中地點，返回所有人流統計地點
		return peopleCountingLocations.value;
	}
	
	const matchedLocation = findMatchingPeopleCountingLocation(selectedUnifiedLocation.value);
	if (matchedLocation) {
		return [matchedLocation];
	}
	
	// 如果找不到匹配的地點，返回空陣列
	return [];
});

// 過濾後的進出記錄（根據選中的地點）
const filteredLocationLogs = computed(() => {
	if (!selectedUnifiedLocation.value) {
		// 如果沒有選中地點，返回所有記錄
		return allLocationLogs.value;
	}
	
	const matchedLocation = findMatchingPeopleCountingLocation(selectedUnifiedLocation.value);
	if (!matchedLocation || !matchedLocation.locationId) {
		// 如果找不到匹配的地點，返回空陣列
		return [];
	}
	
	// 過濾出該地點的記錄
	return allLocationLogs.value.filter(log => log.locationId === matchedLocation.locationId);
});

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

// 從設備型號配置中取得參數的 Modbus 配置
const getParameterModbusConfig = (
	paramType: SensorParameterType
): SensorParameterDefinition["modbusConfig"] | null => {
	if (!deviceModelConfig.value?.sensorParameters) return null;

	const paramDef = deviceModelConfig.value.sensorParameters.find(p => p.type === paramType);
	return paramDef?.modbusConfig || null;
};

// 預設選擇的地點（區域名稱 - 地點名稱）
const DEFAULT_LOCATION = { zoneName: "遠岫", locationName: "大門口" };

// 載入所有區域和地點（包含所有系統）
const loadZones = async () => {
	if (isLoadingZones.value) return;
	isLoadingZones.value = true;
	try {
		// 從統一地點管理系統載入所有區域（包含所有系統）
		const unifiedResult = await locationApi.getZones();
		const allZones: UnifiedZone[] = unifiedResult.zones || [];

		// 使用統一的排序函數
		unifiedZones.value = sortZones(allZones);

		// 優先選擇預設地點「遠岫 - 大門口」
		if (unifiedZones.value.length > 0) {
			// 先嘗試找預設地點
			for (const zone of unifiedZones.value) {
				if (zone.name === DEFAULT_LOCATION.zoneName) {
					const defaultLocation = zone.locations.find(
						loc => loc.name === DEFAULT_LOCATION.locationName
					);
					if (defaultLocation) {
						selectedLocationId.value = getLocationId(defaultLocation);
						return;
					}
				}
			}

			// 如果沒找到預設地點，選擇第一個可用地點
			const firstLocation = unifiedZones.value
				.flatMap(zone => zone.locations || [])
				.find(() => true);
			if (firstLocation) {
				selectedLocationId.value = getLocationId(firstLocation);
			}
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗");
	} finally {
		isLoadingZones.value = false;
	}
};

// 載入地點的感測器設備配置
const loadLocationSensorDevice = async (location: EnvironmentLocation) => {
	if (!location.deviceId) {
		sensorDevice.value = null;
		deviceModelConfig.value = null;
		return;
	}

	try {
		const result = await deviceApi.getDevice(location.deviceId);
		const device = result.device;

		if (!device || device.type_code !== "sensor") {
			sensorDevice.value = null;
			deviceModelConfig.value = null;
			return;
		}

		sensorDevice.value = device;

		// 嘗試從設備 API 返回的 model 中取得配置
		const deviceWithModel = device as any;
		if (deviceWithModel.model?.config?.sensorParameters) {
			deviceModelConfig.value = deviceWithModel.model.config as SensorDeviceModelConfig;
			return;
		}

		// 如果設備 API 沒有返回 model.config，則單獨取得型號資訊
		if (device.model_id) {
			try {
				const modelResult = await deviceApi.getDeviceModel(device.model_id);
				deviceModelConfig.value = modelResult.device_model.config as SensorDeviceModelConfig | undefined || null;
			} catch (error) {
				console.warn("[index] 載入設備型號配置失敗:", error);
				deviceModelConfig.value = null;
			}
		} else {
			deviceModelConfig.value = null;
		}
	} catch (error) {
		console.error("[index] 載入設備失敗:", error);
		sensorDevice.value = null;
		deviceModelConfig.value = null;
	}
};

// 讀取 Modbus 寄存器
const readModbusRegister = async (
	modbusConfig: ModbusDeviceConfig,
	address: number,
	length: number = 1
): Promise<ModbusDataResponse<number>> => {
	const queryParams = new URLSearchParams({
		host: modbusConfig.host,
		port: String(modbusConfig.port),
		unitId: String(modbusConfig.unitId),
		address: String(address),
		length: String(length)
	});

	return await request<ModbusDataResponse<number>>(
		`/modbus/holding-registers?${queryParams.toString()}`
	);
};

// 應用轉換公式（參考 environment.vue 的實現）
// 統一使用簡化格式：直接填入運算符和數值，例如 "-1", "/ 10", "* 2", "+ 5"
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

// 感測器狀態相關常數
const OFFLINE_ALERT_INTERVAL = 30000; // 每 30 秒最多顯示一次離線警報

// 載入狀態
const isFetching = ref(false);
const isSensorOffline = ref(false);
const lastOfflineAlertTime = ref<number | null>(null);

// 載入感測器資料（需要確保設備配置已載入）
const loadSensorData = async () => {
	if (isFetching.value) {
		return;
	}

	if (!selectedLocation.value || !sensorDeviceConfig.value || !deviceModelConfig.value) {
		return;
	}

	isFetching.value = true;

	try {
		const enabledParams = selectedLocation.value.parameters.filter(param => param.enabled);
		if (enabledParams.length === 0) {
			return;
		}

		// 讀取所有啟用的參數
		for (const param of enabledParams) {
			const modbusConfig = getParameterModbusConfig(param.type);
			if (!modbusConfig || modbusConfig.address === undefined) {
				continue;
			}

			try {
				const response = await readModbusRegister(sensorDeviceConfig.value, modbusConfig.address, 1);
				const rawValue = response.data[0];
				const transformedValue = applyTransform(rawValue, modbusConfig.transform);
				(sensorData as any)[param.type] = transformedValue;
			} catch (error: any) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				if (isDeviceConnectionError(errorMessage)) {
					// 設備連接錯誤，靜默處理
					(sensorData as any)[param.type] = null;
				}
			}
		}

		// 感測器恢復連線
		if (isSensorOffline.value) {
			isSensorOffline.value = false;
			toast.success("感測器已恢復連線", 5000);
			lastOfflineAlertTime.value = null;
		}
	} catch (error: any) {
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

// 輪詢相關常數
const SENSOR_POLLING_INTERVAL = 5000; // 每 5 秒執行一次

// 使用 usePolling 統一管理輪詢
const { start: startPolling } = usePolling({
	callback: async () => {
		await loadSensorData();
	},
	interval: SENSOR_POLLING_INTERVAL,
	immediate: false,
	onError: err => {
		handleError(err, "載入感測器資料失敗");
	}
});

// 初始化選中地點的資料載入
const initializeLocationData = async () => {
	if (!selectedLocation.value) return;

	// 載入設備配置
	await loadLocationSensorDevice(selectedLocation.value);
	// 等待配置載入完成後再載入數據
	await nextTick();
	await loadSensorData();
};

// 監聽地點變化
watch(
	() => selectedLocationId.value,
	async () => {
		if (selectedLocationId.value) {
			await initializeLocationData();
			// 當地點切換時，重新載入進出記錄（確保顯示最新數據）
			await loadAllLocationLogs();
		}
	}
);

// WebSocket 事件處理
const { setupEventListeners } = usePeopleCountingWebSocket();
let cleanupWebSocket: (() => void) | null = null;

onMounted(async () => {
	// 載入所有區域和地點
	await loadZones();

	// 等待 selectedLocation 更新後初始化資料
	await nextTick();
	await initializeLocationData();

	// 啟動輪詢
	startPolling();

	// 載入人流統計數據
	try {
		await loadPeopleCountingLocations();
		await loadAllLocationLogs();
	} catch (error) {
		console.error("[index] 載入人流統計數據失敗:", error);
	}

// WebSocket 防抖時間
const WEBSOCKET_DEBOUNCE_MS = 500;

	// 設置 WebSocket 事件監聽：收到 YSCP 事件後重新載入資料
	cleanupWebSocket = setupEventListeners(async () => {
		// 使用防抖優化，避免短時間內多次觸發
		await Promise.allSettled([
			loadPeopleCountingLocations(),
			loadAllLocationLogs()
		]);
	}, WEBSOCKET_DEBOUNCE_MS);
});

// 監聽人流統計地點變化，重新載入進出記錄
watch(
	() => peopleCountingLocations.value,
	async () => {
		await loadAllLocationLogs();
	},
	{ deep: true }
);

// 清理 WebSocket 監聽器
onBeforeUnmount(() => {
	if (cleanupWebSocket) {
		cleanupWebSocket();
		cleanupWebSocket = null;
	}
});
</script>
