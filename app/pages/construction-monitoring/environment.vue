<template>
	<div>
		<div class="flex justify-center gap-4 xl:gap-6 2xl:gap-8">
			<!-- 左側：詳細視圖 -->
			<section class="relative flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="relative flex flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 2xl:p-6"
				>
					<!-- 位置標題與地點選擇 -->
					<div
						class="absolute left-1/2 top-0 flex h-[36px] translate-x-[-50%] items-center justify-center bg-white text-lg text-[#595959] 2xl:text-xl"
						style="clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, calc(0% + 24px) 100%)"
					>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="currentLocationData" class="ps-[12px]">{{
								getLocationFloor(currentLocationData)
							}}</span>
						</div>
						<div class="h-[24px] w-px bg-[#595959]"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="currentLocationData" class="pe-[12px]">{{ currentLocationData.name }}</span>
						</div>
					</div>

					<button
						type="button"
						class="absolute left-8 top-2 rounded-lg border-2 border-white/30 bg-transparent px-4 py-2 text-sm text-white transition-all hover:bg-white/10 2xl:text-base"
						@click="showLocationManagementDialog = true"
					>
						地點管理
					</button>

					<!-- 三個大儀表（包含趨勢圖） -->
					<div class="mt-12 grid grid-cols-3 gap-4 border-b border-white/80 pb-2 2xl:gap-6">
						<!-- 噪音值儀表 -->
						<EnvironmentGauge
							type="noise"
							:value="noiseValue"
							:location-id="currentLocationData?.id || null"
							class="border-r border-white/30"
						/>

						<!-- AQI 儀表（中間，較大） -->
						<EnvironmentGauge
							type="aqi"
							:value="aqiScore"
							size="large"
							:location-id="currentLocationData?.id || null"
						/>

						<!-- 溫度儀表 -->
						<EnvironmentGauge
							type="temperature"
							:value="currentTemperature"
							:location-id="currentLocationData?.id || null"
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
							:device-error="isSensorOffline"
							:get-status-class="getStatusClass"
							:get-status-dot-class="getStatusDotClass"
							:get-status-text="getStatusText"
							:get-status-text-class="getStatusTextClass"
							:to-fixed-number="toFixedNumber"
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
			</section>

			<!-- 右側：總覽面板 -->
			<aside
				:class="[
					'flex flex-col transition-all duration-500 ease-in-out',
					isOverviewCollapsed ? 'flex-[0.05]' : 'flex-[0.8] 2xl:flex-[0.7]'
				]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<div
					class="relative h-full min-w-[72px] overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-white/80 bg-white/30 py-8 transition-all duration-500 ease-in-out 2xl:min-w-[84px]"
				>
					<!-- 標題與收縮按鈕 -->
					<Transition name="fade">
						<h2
							v-if="!isOverviewCollapsed"
							key="title"
							class="mb-4 text-center text-xl font-semibold tracking-[12px] text-white xl:text-2xl 2xl:text-3xl"
							style="padding-left: 12px"
						>
							總覽
						</h2>
					</Transition>
					<button
						type="button"
						class="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 text-white hover:bg-white/20 2xl:h-12 2xl:w-12"
						@click="isOverviewCollapsed = !isOverviewCollapsed"
						:title="isOverviewCollapsed ? '展開總覽' : '收縮總覽'"
					>
						<svg
							class="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7"
							:class="{ 'rotate-180': isOverviewCollapsed }"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>

					<!-- 總覽內容 -->
					<Transition name="fade">
						<div
							v-if="!isOverviewCollapsed"
							key="content"
							class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
						>
							<div class="space-y-4">
								<template v-if="sortedLocations.length > 0">
									<OverviewLocationCard
										v-for="location in sortedLocations"
										:key="getLocationId(location)"
										:name="location.name"
										:floor="getLocationFloor(location) || ''"
										:aqi="getLocationDisplayData(location).aqi"
										:noise="getLocationDisplayData(location).noise"
										:params="getLocationDisplayData(location).params"
										:disabled="!location.deviceId"
										:get-status-text="getStatusText"
										@click="selectLocation(location)"
										:class="{
											'ring-2 ring-cyan-400': isCurrentLocation(location),
											'cursor-pointer transition-all hover:ring-2 hover:ring-cyan-300/50': true
										}"
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
	<LocationManagementDialog
		v-model="showLocationManagementDialog"
		:floors="environmentFloors"
		@save="handleSaveFloor"
		@delete="handleDeleteFloor"
	/>
</template>

<script setup lang="ts">
import EnvironmentGauge from "~/components/environment/EnvironmentGauge.vue";
import EnvironmentParamCard from "~/components/environment/EnvironmentParamCard.vue";
import OverviewLocationCard from "~/components/environment/OverviewLocationCard.vue";
import LocationManagementDialog from "~/components/environment/LocationManagementDialog.vue";
import { useDeviceApi } from "~/composables/useDeviceApi";
import { useApiBase } from "~/composables/useApiBase";
import { useEnvironmentApi } from "~/composables/useEnvironmentApi";
import { useWebSocket } from "~/composables/useWebSocket";
import type { EnvironmentReadingNewEvent } from "~/composables/useWebSocket";
import {
	getParameterDisplayName,
	getParameterUnit,
	getParameterIcon,
	getParameterFractionDigits,
	cleanFloor
} from "~/utils/sensorUtils";
import type { ModbusDeviceConfig, ModbusDataResponse } from "~/types/modbus";
import type {
	Device,
	SensorDeviceConfig,
	SensorDeviceModelConfig,
	SensorParameterDefinition
} from "~/types/device";
import type {
	EnvironmentFloor,
	EnvironmentLocation,
	SensorParameter,
	SensorParameterType
} from "~/types/environment";

definePageMeta({
	layout: "default"
});

const deviceApi = useDeviceApi();
const environmentApi = useEnvironmentApi();
const { request } = useApiBase();
const toast = useToast();
const { isConnected, on, off } = useWebSocket();

// 環境樓層和地點資料
const environmentFloors = ref<EnvironmentFloor[]>([]);
const isLoadingFloors = ref(false);
const showLocationManagementDialog = ref(false);
const selectedLocationId = ref<string>("");

// 感測器設備（從設備 API 讀取）
const sensorDevice = ref<Device | null>(null);
// 設備型號配置快取
const deviceModelConfig = ref<SensorDeviceModelConfig | null>(null);

const sensorDeviceConfig = computed<ModbusDeviceConfig | null>(() => {
	if (!sensorDevice.value || sensorDevice.value.type_code !== "sensor") {
		return null;
	}

	const config = sensorDevice.value.config as SensorDeviceConfig;
	if (config.protocol !== "modbus" || !config.host || !config.port) {
		return null;
	}

	// 從 config 中讀取 unitId（如果存在），否則使用預設值 1
	const unitId = config.unitId || 1;

	return {
		host: config.host,
		port: config.port,
		unitId
	};
});

// 從設備型號配置中取得參數的 Modbus 配置
const getParameterModbusConfig = (
	paramType: SensorParameterType
): SensorParameterDefinition["modbusConfig"] | null => {
	if (!deviceModelConfig.value?.sensorParameters) return null;

	const paramDef = deviceModelConfig.value.sensorParameters.find(p => p.type === paramType);
	return paramDef?.modbusConfig || null;
};

// 感測器資料（根據參數類型動態儲存）
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

// 建立空的感測器資料物件
const createEmptySensorReadings = (): SensorReadings => ({
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

// 當前選中地點的感測器資料（用於詳細視圖）
const sensorData = reactive<SensorReadings>(createEmptySensorReadings());

// 所有地點的感測器資料（用於總覽面板）
const allLocationsSensorData = ref<Map<string, SensorReadings>>(new Map());

// 噪音值和風速（使用 computed 從 sensorData 中取得，避免重複）
const noiseValue = computed(() => sensorData.noise);
const windSpeed = computed(() => sensorData.wind);

// 當前選中的地點
const currentLocationData = computed<EnvironmentLocation | null>(() => {
	if (!selectedLocationId.value) return null;

	for (const floor of environmentFloors.value) {
		const location = floor.locations.find(loc => getLocationId(loc) === selectedLocationId.value);
		if (location) return location;
	}
	return null;
});

// 總覽面板收縮狀態
const isOverviewCollapsed = ref(false);

// 左側區域的 ref 和高度
const leftSectionRef = ref<HTMLElement | null>(null);
const leftSectionHeight = ref<number | null>(null);

// ResizeObserver 用於動態監聽左側區域高度變化
let leftSectionResizeObserver: ResizeObserver | null = null;

// 更新左側高度
const updateLeftSectionHeight = () => {
	if (leftSectionRef.value) {
		leftSectionHeight.value = leftSectionRef.value.offsetHeight;
	}
};

// 初始化 ResizeObserver
const initLeftSectionObserver = () => {
	if (typeof ResizeObserver === "undefined") return;
	if (!leftSectionRef.value) return;

	leftSectionResizeObserver = new ResizeObserver(entries => {
		if (entries.length) {
			leftSectionHeight.value = entries[0].contentRect.height;
		}
	});
	leftSectionResizeObserver.observe(leftSectionRef.value);
};

// 監聽左側區域高度變化由 ResizeObserver 處理，僅需在樓層/地點變化時更新一次
watch([currentLocationData, environmentFloors], () => {
	nextTick(() => {
		updateLeftSectionHeight();
	});
});

// 所有地點（用於總覽面板）
const allLocations = computed(() => {
	return environmentFloors.value.flatMap(floor => floor.locations);
});

// 排序後的地點列表（按樓層排序：1F, 2F, 3F... 或按建立時間）
const sortedLocations = computed(() => {
	if (allLocations.value.length === 0) return [];

	// 建立地點與樓層的映射
	const locationFloorMap = new Map<EnvironmentLocation, string>();
	for (const floor of environmentFloors.value) {
		for (const location of floor.locations) {
			locationFloorMap.set(location, floor.name);
		}
	}

	// 按樓層排序（提取數字部分進行比較）
	return [...allLocations.value].sort((a, b) => {
		const floorA = locationFloorMap.get(a) || "";
		const floorB = locationFloorMap.get(b) || "";

		// 提取樓層名稱中的數字（例如 "1F" -> 1, "B1F" -> -1, "2F" -> 2）
		const extractFloorNumber = (floorName: string): number => {
			// 處理負樓層（B1F, B2F 等）
			if (floorName.toUpperCase().startsWith("B")) {
				const num = parseInt(floorName.match(/\d+/)?.[0] || "0") || 0;
				return -num; // 負數表示地下樓層
			}
			// 處理正樓層（1F, 2F 等）
			const num = parseInt(floorName.match(/\d+/)?.[0] || "999") || 999;
			return num;
		};

		const numA = extractFloorNumber(floorA);
		const numB = extractFloorNumber(floorB);

		// 先按數字排序
		if (numA !== numB) {
			return numA - numB;
		}

		// 如果數字相同，按字串排序（處理特殊情況）
		return floorA.localeCompare(floorB, "zh-TW");
	});
});

// 啟用的參數（用於顯示）
const enabledParameters = computed(() => {
	if (!currentLocationData.value) return [];
	return currentLocationData.value.parameters.filter(param => param.enabled);
});

// 獲取地點所屬的樓層名稱
const getLocationFloor = (location: EnvironmentLocation): string | null => {
	for (const floor of environmentFloors.value) {
		if (floor.locations.some(loc => loc.id === location.id || loc.name === location.name)) {
			return floor.name;
		}
	}
	return null;
};

// 獲取地點 ID
const getLocationId = (location: EnvironmentLocation): string => {
	const floorName = getLocationFloor(location);
	return location.id || `${floorName || "unknown"}-${location.name}`;
};

// 處理環境讀數新事件
const handleEnvironmentReadingNew = (event: EnvironmentReadingNewEvent) => {
	const { locationId, reading } = event;
	const locationIdStr = String(locationId);

	// 更新當前選中地點的資料
	if (currentLocationData.value?.id === locationIdStr) {
		Object.keys(reading).forEach(key => {
			if (key in sensorData) {
				(sensorData as any)[key] = reading[key];
			}
		});
	}

	// 更新總覽面板的資料
	const existingData =
		allLocationsSensorData.value.get(locationIdStr) || createEmptySensorReadings();
	Object.keys(reading).forEach(key => {
		if (key in existingData) {
			(existingData as any)[key] = reading[key];
		}
	});
	allLocationsSensorData.value.set(locationIdStr, existingData);

	if (process.dev) {
		console.log("[Environment] 收到新讀數:", locationId, reading);
	}
};

// 選擇地點
const selectLocation = (location: EnvironmentLocation) => {
	selectedLocationId.value = getLocationId(location);

	// 載入該地點的感測器資料
	void loadLocationSensorData(location);
};

const isFetching = ref(false);
const isSensorOffline = ref(false);
const AUTO_REFRESH_INTERVAL = 5000;
// 驗證提示間隔（用於配置驗證提示，非警報通知）
const VALIDATION_ALERT_INTERVAL = 30000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let lastValidationAlertTime: number | null = null;

// ========== 錯誤追蹤共用函數 ==========

/**
 * 判斷是否為離線錯誤
 */
const isOfflineError = (errorMessage: string): boolean => {
	return (
		errorMessage.includes("503") ||
		errorMessage.includes("服務不可用") ||
		errorMessage.includes("設備離線")
	);
};

/**
 * 報告環境位置錯誤（靜默處理，不影響主要流程）
 */
const reportLocationError = async (
	locationId: string | number | undefined,
	errorMessage: string
) => {
	if (!locationId) return;
	try {
		await environmentApi.reportError(locationId, errorMessage);
	} catch (error) {
		console.warn("[environment] 報告錯誤失敗:", error);
	}
};

/**
 * 清除環境位置錯誤狀態（靜默處理，不影響主要流程）
 */
const clearLocationError = async (locationId: string | number | undefined) => {
	if (!locationId) return;
	try {
		await environmentApi.clearError(locationId);
	} catch (error) {
		console.warn("[environment] 清除錯誤失敗:", error);
	}
};

type AQIBreakpoint = {
	concentrationRange: [number, number];
	indexRange: [number, number];
};

const PM25_BREAKPOINTS: AQIBreakpoint[] = [
	{ concentrationRange: [0, 12], indexRange: [0, 50] },
	{ concentrationRange: [12.1, 35.4], indexRange: [51, 100] },
	{ concentrationRange: [35.5, 55.4], indexRange: [101, 150] },
	{ concentrationRange: [55.5, 150.4], indexRange: [151, 200] },
	{ concentrationRange: [150.5, 250.4], indexRange: [201, 300] },
	{ concentrationRange: [250.5, 350.4], indexRange: [301, 400] },
	{ concentrationRange: [350.5, 500.4], indexRange: [401, 500] }
];

const PM10_BREAKPOINTS: AQIBreakpoint[] = [
	{ concentrationRange: [0, 54], indexRange: [0, 50] },
	{ concentrationRange: [55, 154], indexRange: [51, 100] },
	{ concentrationRange: [155, 254], indexRange: [101, 150] },
	{ concentrationRange: [255, 354], indexRange: [151, 200] },
	{ concentrationRange: [355, 424], indexRange: [201, 300] },
	{ concentrationRange: [425, 504], indexRange: [301, 400] },
	{ concentrationRange: [505, 604], indexRange: [401, 500] }
];

const calculatePollutantAQI = (
	value: number | null,
	breakpoints: AQIBreakpoint[]
): number | null => {
	if (value === null) {
		return null;
	}

	const targetBreakpoint =
		breakpoints.find(breakpoint => {
			const [cLow, cHigh] = breakpoint.concentrationRange;
			return value >= cLow && value <= cHigh;
		}) ?? breakpoints[breakpoints.length - 1];

	const [cLow, cHigh] = targetBreakpoint.concentrationRange;
	const [iLow, iHigh] = targetBreakpoint.indexRange;

	const clampedValue = Math.min(Math.max(value, cLow), cHigh);
	const index = ((iHigh - iLow) / (cHigh - cLow)) * (clampedValue - cLow) + iLow;

	return Math.round(index);
};

// 應用轉換公式
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
		console.warn("[environment] 轉換公式解析失敗:", transform, error);
		return value;
	}
};

// 更新感測器資料（統一函數，支援當前地點和總覽地點）
const updateSensorData = (
	type: SensorParameter["type"],
	value: number | null,
	locationId?: string
) => {
	// 更新當前選中地點的資料
	sensorData[type] = value;

	// 如果指定了 locationId，同時更新總覽資料
	if (locationId) {
		if (!allLocationsSensorData.value.has(locationId)) {
			allLocationsSensorData.value.set(locationId, createEmptySensorReadings());
		}
		const locationData = allLocationsSensorData.value.get(locationId)!;
		locationData[type] = value;
	}
};

// 取得特定地點的感測器資料
const getLocationSensorData = (locationId: string): SensorReadings | null => {
	return allLocationsSensorData.value.get(locationId) || null;
};

// cleanLocation 和 cleanFloor 已從 composable 導入

// 載入樓層和地點資料
const loadFloorsFromAPI = async () => {
	if (isLoadingFloors.value) return;
	isLoadingFloors.value = true;
	try {
		const result = await environmentApi.getFloors();
		// 清理並標準化參數格式並依樓層排序（B1F < 1F < 2F ...）
		const sortedFloors = (result.floors || []).map(cleanFloor).sort((a, b) => {
			const parseNum = (name: string) => {
				if (name.toUpperCase().startsWith("B")) {
					return -parseInt(name.match(/\d+/)?.[0] || "0", 10);
				}
				return parseInt(name.match(/\d+/)?.[0] || "999", 10);
			};
			return parseNum(a.name) - parseNum(b.name);
		});
		environmentFloors.value = sortedFloors;

		// 如果沒有選中的地點且有地點資料，預設選擇 1F 或排序後最前面的地點
		if (!selectedLocationId.value && environmentFloors.value.length > 0) {
			for (const floor of environmentFloors.value) {
				if (floor.locations && floor.locations.length > 0) {
					selectLocation(floor.locations[0]);
					break;
				}
			}
		}
	} catch (error) {
		console.error("載入樓層列表失敗:", error);
		toast.error("載入樓層列表失敗，請稍後再試");
	} finally {
		isLoadingFloors.value = false;
	}
};

// 載入設備和型號配置（共用函數）
const loadDeviceAndModelConfig = async (
	deviceId: number
): Promise<{ device: Device; modelConfig: SensorDeviceModelConfig | null } | null> => {
	try {
		const result = await deviceApi.getDevice(deviceId);
		const device = result.device;

		if (!device || device.type_code !== "sensor") {
			return null;
		}

		// 方法1: 先嘗試從設備 API 返回的 model 中取得配置（後端應該已經包含）
		const deviceWithModel = device as any;
		if (deviceWithModel.model?.config) {
			const modelConfig = deviceWithModel.model.config as SensorDeviceModelConfig | undefined;
			if (modelConfig?.sensorParameters) {
				return { device, modelConfig: modelConfig || null };
			}
		}

		// 方法2: 如果設備 API 沒有返回 model.config，則單獨取得型號資訊
		if (device.model_id) {
			try {
				const modelResult = await deviceApi.getDeviceModel(device.model_id);
				const modelConfig = modelResult.device_model.config as SensorDeviceModelConfig | undefined;
				return { device, modelConfig: modelConfig || null };
			} catch (error) {
				console.warn("[environment] 載入設備型號配置失敗:", error);
				return { device, modelConfig: null };
			}
		}

		return { device, modelConfig: null };
	} catch (error) {
		console.error("[environment] 載入設備失敗:", error);
		return null;
	}
};

// 載入地點的感測器設備（用於當前選中地點）
const loadLocationSensorDevice = async (location: EnvironmentLocation) => {
	if (!location.deviceId) {
		console.log("[environment] 地點沒有關聯設備:", location.name);
		sensorDevice.value = null;
		deviceModelConfig.value = null;
		return;
	}

	const result = await loadDeviceAndModelConfig(location.deviceId);
	if (result) {
		sensorDevice.value = result.device;
		deviceModelConfig.value = result.modelConfig;
	} else {
		sensorDevice.value = null;
		deviceModelConfig.value = null;
	}
};

// 清空感測器資料
const clearSensorData = () => {
	Object.assign(sensorData, createEmptySensorReadings());
};

// 當地點變更時清空資料
watch(
	() => selectedLocationId.value,
	() => {
		clearSensorData();
	}
);

// 載入地點的感測器資料
const loadLocationSensorData = async (location: EnvironmentLocation) => {
	// 先載入設備
	await loadLocationSensorDevice(location);

	if (!sensorDevice.value || !sensorDeviceConfig.value) {
		clearSensorData();
		return;
	}

	// 載入感測器資料
	await loadSensorData();
};

// 讀取單個 Modbus 寄存器（length 預設為 1，不需要傳遞）
const readModbusRegister = async (
	config: ModbusDeviceConfig,
	address: number
): Promise<ModbusDataResponse<number>> => {
	const queryParams = new URLSearchParams({
		host: config.host,
		port: String(config.port),
		unitId: String(config.unitId),
		address: String(address)
		// length 參數不傳遞，後端會使用預設值 1
	});

	return request<ModbusDataResponse<number>>(`/modbus/holding-registers?${queryParams.toString()}`);
};

// 批量讀取連續的 Modbus 寄存器（性能優化）
const readModbusRegisterBatch = async (
	config: ModbusDeviceConfig,
	startAddress: number,
	length: number
): Promise<ModbusDataResponse<number>> => {
	const queryParams = new URLSearchParams({
		host: config.host,
		port: String(config.port),
		unitId: String(config.unitId),
		address: String(startAddress),
		length: String(length)
	});

	return request<ModbusDataResponse<number>>(`/modbus/holding-registers?${queryParams.toString()}`);
};

// 驗證配置完整性（完全依賴資料庫配置）
const validateConfiguration = (): { valid: boolean; message: string } => {
	if (!currentLocationData.value) {
		return {
			valid: false,
			message: "請先選擇地點"
		};
	}

	if (!currentLocationData.value.deviceId) {
		return {
			valid: false,
			message: `地點「${currentLocationData.value.name}」尚未關聯感測器設備，請在「地點管理」中選擇設備`
		};
	}

	const enabledParams = currentLocationData.value.parameters.filter(param => param.enabled);
	if (enabledParams.length === 0) {
		return {
			valid: false,
			message: `地點「${currentLocationData.value.name}」沒有啟用的感測器參數，請在「地點管理」中啟用參數`
		};
	}

	if (!deviceModelConfig.value) {
		return {
			valid: false,
			message: `無法載入設備型號配置，請確認設備已正確關聯設備型號`
		};
	}

	if (
		!deviceModelConfig.value.sensorParameters ||
		deviceModelConfig.value.sensorParameters.length === 0
	) {
		return {
			valid: false,
			message: `設備型號尚未配置感測器參數，請在「設備型號管理」中設定參數配置`
		};
	}

	// 檢查每個啟用的參數是否都有對應的 Modbus 配置
	const missingConfigs: string[] = [];
	for (const param of enabledParams) {
		const modbusConfig = getParameterModbusConfig(param.type);
		if (!modbusConfig || modbusConfig.address === undefined) {
			missingConfigs.push(getParameterDisplayName(param.type));
		}
	}

	if (missingConfigs.length > 0) {
		return {
			valid: false,
			message: `以下參數缺少 Modbus 配置：${missingConfigs.join("、")}，請在「設備型號管理」中設定`
		};
	}

	return { valid: true, message: "" };
};

// 根據參數配置讀取感測器資料（完全依賴資料庫配置）
const loadSensorData = async () => {
	if (isFetching.value) {
		return;
	}

	if (!sensorDevice.value || !sensorDeviceConfig.value) {
		console.log("[environment] 缺少必要資料:", {
			hasDevice: !!sensorDevice.value,
			hasConfig: !!sensorDeviceConfig.value
		});
		clearSensorData();
		return;
	}

	isFetching.value = true;

	try {
		const config = sensorDeviceConfig.value;

		// 驗證配置完整性
		const validation = validateConfiguration();
		if (!validation.valid) {
			console.warn("[environment] 配置不完整:", validation.message);
			clearSensorData();

			// 只在第一次或間隔一定時間後顯示提示，避免重複提示
			const now = Date.now();
			const shouldShowAlert =
				!lastValidationAlertTime || now - lastValidationAlertTime >= VALIDATION_ALERT_INTERVAL;

			if (shouldShowAlert) {
				lastValidationAlertTime = now;
				toast.warning(validation.message, 8000);
			}
			return;
		}

		const enabledParams = currentLocationData.value!.parameters.filter(param => param.enabled);

		// 只在開發模式輸出載入日誌
		if (process.dev) {
			console.log("[environment] 載入感測器資料:", {
				location: currentLocationData.value!.name,
				enabledParamsCount: enabledParams.length
			});
		}

		// 建立參數到地址的映射（用於批量讀取優化）
		const paramAddressMap = new Map<
			number,
			(typeof enabledParams)[0] & {
				modbusConfig: NonNullable<ReturnType<typeof getParameterModbusConfig>>;
			}
		>();
		const paramsWithoutConfig: typeof enabledParams = [];

		for (const param of enabledParams) {
			const modbusConfig = getParameterModbusConfig(param.type);
			if (!modbusConfig || modbusConfig.address === undefined) {
				console.warn(
					`[environment] 參數 ${getParameterDisplayName(param.type)} 沒有 Modbus 配置，跳過讀取`
				);
				paramsWithoutConfig.push(param);
				continue;
			}
			paramAddressMap.set(modbusConfig.address, { ...param, modbusConfig });
		}

		const addresses = Array.from(paramAddressMap.keys()).sort((a, b) => a - b);

		// 檢查地址是否連續（用於批量讀取優化）
		const isConsecutive =
			addresses.length > 1 &&
			addresses.every((addr, idx) => idx === 0 || addr === addresses[idx - 1] + 1);

		let results: Array<{ param: (typeof enabledParams)[0]; value: number | null; success: boolean }>;

		if (isConsecutive && addresses.length > 1) {
			// 優化路徑：批量讀取連續地址
			const startAddress = addresses[0];
			const length = addresses.length;

			// 只在開發模式輸出優化日誌
			if (process.dev) {
				console.log(
					`[environment] 使用批量讀取優化: 地址 ${startAddress} 到 ${startAddress + length - 1} (共 ${length} 個)`
				);
			}

			try {
				const response = await readModbusRegisterBatch(config, startAddress, length);

				results = addresses.map((addr, idx) => {
					const paramData = paramAddressMap.get(addr);
					if (!paramData) {
						return {
							param: enabledParams[0], // fallback
							value: null,
							success: false
						};
					}

					const rawValue = response.data[idx];
					const transformedValue = applyTransform(rawValue, paramData.modbusConfig.transform);

					// 只在開發模式輸出成功日誌
					if (process.dev) {
						console.log(`[environment] 批量讀取參數 ${getParameterDisplayName(paramData.type)} 成功:`, {
							address: addr,
							rawValue,
							transformedValue
						});
					}

					return {
						param: paramData,
						value: transformedValue,
						success: true
					};
				});

				// 添加沒有配置的參數（標記為失敗）
				paramsWithoutConfig.forEach(param => {
					results.push({
						param,
						value: null,
						success: false
					});
				});
			} catch (error) {
				// 標記所有參數為失敗
				results = Array.from(paramAddressMap.values()).map(paramData => ({
					param: paramData,
					value: null,
					success: false
				}));

				// 添加沒有配置的參數
				paramsWithoutConfig.forEach(param => {
					results.push({
						param,
						value: null,
						success: false
					});
				});
			}
		} else {
			// 標準路徑：非連續地址或單個地址，使用並行讀取
			const readPromises = Array.from(paramAddressMap.values()).map(async paramData => {
				const value = await readParameterValue(
					config,
					paramData.modbusConfig.address,
					paramData.modbusConfig.transform
				);

				// 只在開發模式輸出成功日誌
				if (value !== null && process.dev) {
					console.log(`[environment] 讀取參數 ${getParameterDisplayName(paramData.type)} 成功:`, {
						address: paramData.modbusConfig.address,
						value
					});
				}

				return {
					param: paramData,
					value,
					success: value !== null
				};
			});

			results = await Promise.all(readPromises);

			// 添加沒有配置的參數
			paramsWithoutConfig.forEach(param => {
				results.push({
					param,
					value: null,
					success: false
				});
			});
		}

		// 更新感測器資料
		const locationId = getLocationId(currentLocationData.value!);
		let successCount = 0;
		let failCount = 0;
		results.forEach(result => {
			if (result.success) {
				updateSensorData(result.param.type, result.value, locationId);
				successCount++;
			} else {
				updateSensorData(result.param.type, null, locationId);
				failCount++;
			}
		});

		// 只在開發模式或失敗時輸出日誌
		if (process.dev || failCount > 0) {
			console.log("[environment] 感測器資料更新完成:", {
				successCount,
				failCount,
				total: enabledParams.length
			});
		}

		// 如果有成功讀取的資料，自動儲存到後端
		// 注意：必須使用實際的資料庫 ID（location.id），而不是 getLocationId 的結果
		if (successCount > 0 && currentLocationData.value?.id) {
			try {
				await environmentApi.saveReading({
					locationId: currentLocationData.value.id,
					timestamp: new Date().toISOString(),
					data: {
						pm25: sensorData.pm25 ?? null,
						pm10: sensorData.pm10 ?? null,
						tvoc: sensorData.tvoc ?? null,
						hcho: sensorData.hcho ?? null,
						humidity: sensorData.humidity ?? null,
						temperature: sensorData.temperature ?? null,
						co2: sensorData.co2 ?? null,
						noise: sensorData.noise ?? null,
						wind: sensorData.wind ?? null
					}
				});
				console.log("[environment] 感測器讀數已儲存到後端");
			} catch (saveError) {
				// 儲存失敗不影響主要流程，只記錄錯誤
				console.warn("[environment] 儲存感測器讀數失敗:", saveError);
			}
		}

		// 如果所有參數讀取都失敗，記錄錯誤（不顯示 Toast，統一由警報監聽器處理）
		if (successCount === 0 && failCount > 0) {
			await reportLocationError(
				currentLocationData.value?.id,
				"無法讀取感測器資料，請檢查設備連線狀態"
			);
		}

		// 如果感測器恢復連線，清除錯誤狀態
		if (isSensorOffline.value && successCount > 0) {
			isSensorOffline.value = false;
			toast.success("感測器已恢復連線", 5000);
			await clearLocationError(currentLocationData.value?.id);
		}
	} catch (error: any) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isOffline = isOfflineError(errorMessage);

		// 更新離線狀態
		if (isOffline && !isSensorOffline.value) {
			isSensorOffline.value = true;
		}

		// 記錄錯誤（統一由 useErrorHandler 處理通知）
		// 離線錯誤總是記錄，非離線錯誤只在感測器在線時記錄（避免重複）
		if (isOffline || !isSensorOffline.value) {
			// 錯誤已由 useErrorHandler 統一處理，這裡只記錄到後端（開發模式才輸出 console）
			if (process.dev && !isOffline) {
				console.warn("[environment] 讀取感測器資料失敗");
			}
			await reportLocationError(
				currentLocationData.value?.id,
				errorMessage || (isOffline ? "感測器離線，無法讀取資料" : "讀取感測器資料失敗")
			);
		}
	} finally {
		isFetching.value = false;
	}
};

const startAutoRefresh = () => {
	if (refreshTimer) {
		return;
	}

	// 如果 WebSocket 已連接，延長輪詢間隔（作為後備）
	const interval = isConnected.value ? AUTO_REFRESH_INTERVAL * 6 : AUTO_REFRESH_INTERVAL; // WebSocket 連接時 30 秒，否則 5 秒

	refreshTimer = setInterval(() => {
		// 只有當有選中地點且有感測器設備時才讀取資料
		if (selectedLocationId.value && sensorDevice.value && sensorDeviceConfig.value) {
			void loadSensorData();
		}

		// 為所有有設備的地點讀取資料（用於總覽面板）
		forEachLocation((location, floor) => {
			if (location.deviceId) {
				const locationId = getLocationId(location);
				// 如果不是當前選中地點，也讀取資料
				if (locationId !== selectedLocationId.value) {
					void loadLocationSensorDataForOverview(location);
				}
			}
		});
	}, interval);
};

// 讀取單個參數的資料（共用函數）
const readParameterValue = async (
	modbusConfig: ModbusDeviceConfig,
	address: number,
	transform?: string
): Promise<number | null> => {
	try {
		const response = await readModbusRegister(modbusConfig, address);
		const rawValue = response.data[0];
		return applyTransform(rawValue, transform);
	} catch (error) {
		// 錯誤已由 useErrorHandler 統一處理，這裡只記錄（開發模式）
		if (process.dev) {
			console.warn(`[environment] 讀取地址 ${address} 失敗`);
		}
		return null;
	}
};

// 讀取地點的感測器參數資料（共用函數，用於總覽面板）
const readLocationSensorParameters = async (
	location: EnvironmentLocation,
	modelConfig: SensorDeviceModelConfig,
	modbusConfig: ModbusDeviceConfig,
	locationId: string
) => {
	const enabledParams = location.parameters.filter(param => param.enabled);

	// 使用並行讀取提升性能
	const readPromises = enabledParams.map(async param => {
		const paramDef = modelConfig.sensorParameters?.find(p => p.type === param.type);
		if (!paramDef?.modbusConfig?.address) {
			return { type: param.type, value: null };
		}

		const value = await readParameterValue(
			modbusConfig,
			paramDef.modbusConfig.address,
			paramDef.modbusConfig.transform
		);
		return { type: param.type, value };
	});

	const results = await Promise.all(readPromises);
	results.forEach(({ type, value }) => {
		updateSensorData(type, value, locationId);
	});
};

// 為總覽面板載入地點的感測器資料（不切換當前選中地點）
const loadLocationSensorDataForOverview = async (location: EnvironmentLocation) => {
	if (!location.deviceId) return;

	try {
		const result = await loadDeviceAndModelConfig(location.deviceId);
		if (!result) return;

		const { device, modelConfig } = result;
		if (!modelConfig?.sensorParameters) return;

		const config = device.config as SensorDeviceConfig;
		if (config.protocol !== "modbus" || !config.host || !config.port) return;

		const modbusConfig: ModbusDeviceConfig = {
			host: config.host,
			port: config.port,
			unitId: config.unitId || 1
		};

		const locationId = getLocationId(location);
		const enabledParams = location.parameters.filter(param => param.enabled);

		// 讀取參數資料
		const readPromises = enabledParams.map(async param => {
			const paramDef = modelConfig.sensorParameters?.find(p => p.type === param.type);
			if (!paramDef?.modbusConfig?.address) {
				return { type: param.type, value: null, success: false };
			}

			try {
				const value = await readParameterValue(
					modbusConfig,
					paramDef.modbusConfig.address,
					paramDef.modbusConfig.transform
				);
				return { type: param.type, value, success: value !== null };
			} catch (error) {
				return { type: param.type, value: null, success: false };
			}
		});

		const results = await Promise.all(readPromises);
		let successCount = 0;
		let failCount = 0;

		results.forEach(({ type, value, success }) => {
			updateSensorData(type, value, locationId);
			if (success) {
				successCount++;
			} else {
				failCount++;
			}
		});

		// 如果所有參數讀取都失敗，記錄錯誤
		if (successCount === 0 && failCount > 0) {
			await reportLocationError(location.id, "無法讀取感測器資料，請檢查設備連線狀態");
		} else if (successCount > 0) {
			// 如果成功讀取，清除錯誤狀態
			await clearLocationError(location.id);
		}
	} catch (error: any) {
		// 總覽面板的錯誤處理（靜默處理，避免影響主要流程）
		const errorMessage = error instanceof Error ? error.message : String(error);

		// 只記錄離線錯誤，其他錯誤靜默處理
		if (isOfflineError(errorMessage)) {
			await reportLocationError(location.id, errorMessage || "感測器離線，無法讀取資料");
		}
	}
};

// 遍歷所有地點並執行回調（共用函數）
const forEachLocation = (
	callback: (location: EnvironmentLocation, floor: EnvironmentFloor) => void | Promise<void>
) => {
	for (const floor of environmentFloors.value) {
		for (const location of floor.locations) {
			void callback(location, floor);
		}
	}
};

const stopAutoRefresh = () => {
	if (!refreshTimer) {
		return;
	}

	clearInterval(refreshTimer);
	refreshTimer = null;
};

// 處理儲存樓層
const handleSaveFloor = async (floor: EnvironmentFloor) => {
	try {
		// 清理參數格式後再儲存
		const cleanedFloor = cleanFloor(floor);

		if (cleanedFloor.id) {
			const result = await environmentApi.updateFloor(cleanedFloor.id, {
				name: cleanedFloor.name,
				locations: cleanedFloor.locations
			});
			// 清理返回的資料
			const index = environmentFloors.value.findIndex(f => f.id === cleanedFloor.id);
			if (index > -1) {
				environmentFloors.value[index] = cleanFloor(result.floor);
			}
		} else {
			const result = await environmentApi.createFloor({
				name: cleanedFloor.name,
				locations: cleanedFloor.locations
			});
			// 清理返回的資料
			environmentFloors.value.push(cleanFloor(result.floor));
		}
		toast.success("樓層儲存成功");
	} catch (error) {
		console.error("儲存樓層失敗:", error);
		toast.error("儲存樓層失敗，請稍後再試");
	}
};

// 處理刪除樓層
const handleDeleteFloor = async (floorId: string) => {
	try {
		await environmentApi.deleteFloor(floorId);
		const index = environmentFloors.value.findIndex(f => (f.id || f.name) === floorId);
		if (index > -1) {
			environmentFloors.value.splice(index, 1);
		}
		toast.success("樓層刪除成功");
	} catch (error) {
		console.error("刪除樓層失敗:", error);
		toast.error("刪除樓層失敗，請稍後再試");
	}
};

// 獲取參數值
const getParameterValue = (type: SensorParameter["type"]): number | null => {
	switch (type) {
		case "pm25":
			return sensorData.pm25;
		case "pm10":
			return sensorData.pm10;
		case "tvoc":
			return sensorData.tvoc;
		case "hcho":
			return sensorData.hcho;
		case "humidity":
			return sensorData.humidity;
		case "temperature":
			return sensorData.temperature;
		case "co2":
			return sensorData.co2;
		case "noise":
			return sensorData.noise;
		case "wind":
			return sensorData.wind;
		default:
			return null;
	}
};

// getParameterIcon 和 getParameterFractionDigits 已從 composable 導入

// 檢查是否為當前選中的地點
const isCurrentLocation = (location: EnvironmentLocation): boolean => {
	return getLocationId(location) === selectedLocationId.value;
};

// 獲取地點的顯示資料（支援所有地點，不僅限於當前選中）
const getLocationDisplayData = (location: EnvironmentLocation) => {
	const locationId = getLocationId(location);
	const locationSensorData = getLocationSensorData(locationId);

	// 如果是當前選中地點，使用 sensorData（即時更新）
	// 否則使用 allLocationsSensorData 中儲存的資料
	const dataSource = isCurrentLocation(location) ? sensorData : locationSensorData;

	if (!dataSource) {
		return {
			params: undefined,
			aqi: null,
			noise: null
		};
	}

	// 取得該地點的啟用參數
	const locationParams = location.parameters.filter(param => param.enabled);

	return {
		params: locationParams.map(param => {
			const value = dataSource[param.type];
			return {
				label: getParameterDisplayName(param.type),
				value: value !== null ? toFixedNumber(value, getParameterFractionDigits(param.type)) : "—",
				unit: getParameterUnit(param.type),
				alertClass: getStatusTextClass(param.type, value),
				type: param.type, // 傳遞參數類型用於狀態判斷
				rawValue: value // 傳遞原始數值用於狀態判斷
			};
		}),
		aqi: calculateAQI(dataSource),
		noise: dataSource.noise
	};
};

// 監聽 WebSocket 連接狀態
watch(
	isConnected,
	connected => {
		if (connected) {
			// 設置事件監聽器
			on("environment:reading:new", handleEnvironmentReadingNew);
		} else {
			// 移除事件監聽器
			off("environment:reading:new", handleEnvironmentReadingNew);
		}

		// 重新啟動自動刷新（根據連接狀態調整間隔）
		stopAutoRefresh();
		startAutoRefresh();
	},
	{ immediate: true }
);

// 注意：環境感測器讀數現在會自動推送給所有客戶端，不需要房間訂閱

onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver();

	// 載入樓層和地點資料（從環境 API）
	await loadFloorsFromAPI();

	// 為所有有設備的地點載入初始資料（用於總覽面板）
	forEachLocation((location, floor) => {
		if (location.deviceId) {
			const locationId = getLocationId(location);
			// 如果不是當前選中地點，也載入資料
			if (locationId !== selectedLocationId.value) {
				void loadLocationSensorDataForOverview(location);
			}
		}
	});

	// 啟動自動刷新（只會在有選中地點時才讀取感測器資料）
	startAutoRefresh();

	// 更新左側高度（初始化）
	nextTick(() => {
		updateLeftSectionHeight();
	});
});

onBeforeUnmount(() => {
	stopAutoRefresh();

	// 移除 WebSocket 監聽器
	off("environment:reading:new", handleEnvironmentReadingNew);

	// 釋放 ResizeObserver
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value);
		leftSectionResizeObserver.disconnect();
		leftSectionResizeObserver = null;
	}
});

const toFixedNumber = (value: number | null, fractionDigits = 0) => {
	if (value === null || Number.isNaN(value)) {
		return 0;
	}
	return Number(value.toFixed(fractionDigits));
};

// 計算 AQI（共用函數）
const calculateAQI = (data: SensorReadings): number | null => {
	const pollutantAQIs = [
		calculatePollutantAQI(data.pm25, PM25_BREAKPOINTS),
		calculatePollutantAQI(data.pm10, PM10_BREAKPOINTS)
	].filter((value): value is number => value !== null);

	if (!pollutantAQIs.length) {
		return null;
	}

	return Math.max(...pollutantAQIs);
};

// 當沒有設備時，AQI 和溫度應該為 null
const aqiScore = computed(() => {
	if (!currentLocationData.value?.deviceId) return null;
	return calculateAQI(sensorData);
});

const currentTemperature = computed(() => {
	if (!currentLocationData.value?.deviceId) return null;
	return sensorData.temperature;
});

// 取得當前地點的顯示字串（共用函數）
const getCurrentLocationString = (): string => {
	if (!currentLocationData.value) return "請選擇地點";
	const floorName = getLocationFloor(currentLocationData.value);
	return `${floorName || ""} / ${currentLocationData.value.name}`;
};

const aqiData = computed(() => ({
	value: aqiScore.value,
	location: getCurrentLocationString(),
	metrics: [
		{ label: "PM2.5", value: toFixedNumber(sensorData.pm25), unit: "µg/m³" },
		{ label: "PM10", value: toFixedNumber(sensorData.pm10), unit: "µg/m³" },
		{ label: "CO₂", value: toFixedNumber(sensorData.co2), unit: "ppm" },
		{ label: "TVOC", value: toFixedNumber(sensorData.tvoc, 3), unit: "ppm" },
		{ label: "HCHO", value: toFixedNumber(sensorData.hcho), unit: "ppm" },
		{ label: "濕度", value: toFixedNumber(sensorData.humidity, 1), unit: "%" }
	]
}));

const environmentData = computed(() => ({
	temperature: toFixedNumber(sensorData.temperature, 1),
	location: getCurrentLocationString(),
	metrics: [
		{
			label: "溫度",
			value: toFixedNumber(sensorData.temperature, 1),
			unit: "°C",
			icon: "temperature"
		},
		{ label: "濕度", value: toFixedNumber(sensorData.humidity, 1), unit: "%", icon: "humidity" },
		{ label: "CO₂", value: toFixedNumber(sensorData.co2), unit: "ppm", icon: "CO₂" }
	]
}));

// 狀態判斷函數（基於國際標準）
// PM2.5: WHO 2021 標準 (正常≤25, 警告25.1-50, 警報>50 µg/m³)
// PM10: WHO 2021 標準 (正常≤50, 警告50.1-100, 警報>100 µg/m³)
// CO2: ASHRAE 標準 (正常≤1000, 警告1000.1-2000, 警報>2000 ppm)
// 溫度: ASHRAE 55 標準 (正常20-26, 警告18-20或26-28, 警報<18或>28°C)
// 濕度: ASHRAE 標準 (正常30-60, 警告20-30或60-70, 警報<20或>70%)
// 噪音: OSHA/WHO 標準 (正常≤55, 警告55.1-70, 警報>70 dB)
const getStatusClass = (type: string, value: number | null): string => {
	if (value === null) return "";

	switch (type) {
		case "pm25":
			if (value <= 25) return "";
			if (value <= 50) return "border-yellow-400";
			return "border-red-400 bg-red-500/20";
		case "pm10":
			if (value <= 50) return "";
			if (value <= 100) return "border-yellow-400";
			return "border-red-400 bg-red-500/20";
		case "co2":
			if (value <= 1000) return "";
			if (value <= 2000) return "border-yellow-400";
			return "border-red-400 bg-red-500/20";
		case "temperature":
			if (value >= 20 && value <= 26) return "";
			if ((value >= 18 && value < 20) || (value > 26 && value <= 28)) return "border-yellow-400";
			return "border-red-400 bg-red-500/20";
		case "humidity":
			if (value >= 30 && value <= 60) return "";
			if ((value >= 20 && value < 30) || (value > 60 && value <= 70))
				return "border-yellow-400 bg-yellow-500/10";
			return "border-red-400 bg-red-500/20";
		case "noise":
			if (value <= 55) return "";
			if (value <= 70) return "border-yellow-400";
			return "border-red-400 bg-red-500/20";
		default:
			return "";
	}
};

const getStatusDotClass = (type: string, value: number | null): string => {
	if (value === null) return "bg-gray-400";

	switch (type) {
		case "pm25":
			if (value <= 25) return "bg-green-400";
			if (value <= 50) return "bg-yellow-400";
			return "bg-red-400";
		case "pm10":
			if (value <= 50) return "bg-green-400";
			if (value <= 100) return "bg-yellow-400";
			return "bg-red-400";
		case "co2":
			if (value <= 1000) return "bg-green-400";
			if (value <= 2000) return "bg-yellow-400";
			return "bg-red-400";
		case "tvoc":
		case "hcho":
			return "bg-green-400";
		case "temperature":
			if (value >= 20 && value <= 26) return "bg-green-400";
			if ((value >= 18 && value < 20) || (value > 26 && value <= 28)) return "bg-yellow-400";
			return "bg-red-400";
		case "humidity":
			if (value >= 30 && value <= 60) return "bg-green-400";
			if ((value >= 20 && value < 30) || (value > 60 && value <= 70)) return "bg-yellow-400";
			return "bg-red-400";
		case "wind":
			return "bg-green-400";
		case "noise":
			if (value <= 55) return "bg-green-400";
			if (value <= 70) return "bg-yellow-400";
			return "bg-red-400";
		default:
			return "bg-gray-400";
	}
};

const getStatusText = (type: string, value: number | null): string => {
	if (value === null) return "無資料";

	switch (type) {
		case "pm25":
			if (value <= 25) return "正常";
			if (value <= 50) return "注意";
			return "警報";
		case "pm10":
			if (value <= 50) return "正常";
			if (value <= 100) return "注意";
			return "警報";
		case "co2":
			if (value <= 1000) return "正常";
			if (value <= 2000) return "注意";
			return "警報";
		case "tvoc":
		case "hcho":
			return "正常";
		case "temperature":
			if (value >= 20 && value <= 26) return "正常";
			if ((value >= 18 && value < 20) || (value > 26 && value <= 28)) return "注意";
			return "警報";
		case "humidity":
			if (value >= 30 && value <= 60) return "正常";
			if ((value >= 20 && value < 30) || (value > 60 && value <= 70)) return "注意";
			return "警報";
		case "wind":
			return "正常";
		case "noise":
			if (value <= 55) return "正常";
			if (value <= 70) return "注意";
			return "警報";
		default:
			return "正常";
	}
};

const getStatusTextClass = (type: string, value: number | null): string => {
	if (value === null) return "text-white/50";

	const status = getStatusText(type, value);
	if (status === "正常") return "text-green-300";
	if (status === "注意") return "text-yellow-300";
	if (status === "警報" || status === "異常") return "text-red-300";
	return "text-white/70";
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
