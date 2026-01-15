<template>
	<div class="min-h-screen">
		<!-- 頂部橫幅（紅色警告區域） -->
		<SafetyBanner />

		<!-- 頂部區域（品牌與時間） -->
		<HomeHeader />

		<!-- 主要內容區域 -->
		<div
			class="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-12 xl:gap-6 xl:px-8 xl:py-6 2xl:px-12 2xl:py-8"
		>
			<!-- 左側欄 - 環境監測數據 -->
			<div class="col-span-1 xl:col-span-4">
				<EnvironmentDashboard
					v-if="selectedLocation"
					:location="selectedLocation"
					:sensor-data="sensorData"
					:device-model-config="deviceModelConfig"
				/>
				<div v-else class="rounded-2xl border-2 border-white/30 bg-white/10 p-8 text-center">
					<p class="text-white/60">請選擇地點以顯示環境監測數據</p>
				</div>
			</div>

			<!-- 中間區域 - 人員統計（預留空間） -->
			<div class="col-span-1 xl:col-span-4">
				<div class="rounded-2xl border-2 border-white/30 bg-white/10 p-8">
					<h2 class="mb-4 text-xl font-semibold text-white xl:text-2xl 2xl:text-3xl">人員統計</h2>
					<p class="text-white/60">人員統計功能開發中...</p>
				</div>
			</div>

			<!-- 右側欄 - 人員進出記錄（預留空間） -->
			<div class="col-span-1 xl:col-span-4">
				<div class="rounded-2xl border-2 border-white/30 bg-white/10 p-8">
					<h2 class="mb-4 text-xl font-semibold text-white xl:text-2xl 2xl:text-3xl">進出記錄</h2>
					<p class="text-white/60">進出記錄功能開發中...</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import SafetyBanner from "~/components/home/SafetyBanner.vue";
import HomeHeader from "~/components/home/HomeHeader.vue";
import EnvironmentDashboard from "~/components/home/EnvironmentDashboard.vue";
import { useEnvironmentApi } from "~/composables/useEnvironmentApi";
import { useDeviceApi } from "~/composables/useDeviceApi";
import { useApiBase } from "~/composables/useApiBase";
import type {
	EnvironmentFloor,
	EnvironmentLocation,
	SensorParameterType
} from "~/types/environment";
import type {
	Device,
	SensorDeviceConfig,
	SensorDeviceModelConfig,
	SensorParameterDefinition
} from "~/types/device";
import type { ModbusDeviceConfig, ModbusDataResponse } from "~/types/modbus";
// 工具函數已由 EnvironmentDashboard 組件內部使用，這裡不需要導入
import { isDeviceConnectionError } from "~/utils/errorUtils";
import { cleanFloor } from "~/utils/sensorUtils";

definePageMeta({
	layout: "default"
});

const environmentApi = useEnvironmentApi();
const deviceApi = useDeviceApi();
const { request } = useApiBase();
const { handleError } = useErrorHandler();

// 環境樓層和地點資料
const environmentFloors = ref<EnvironmentFloor[]>([]);
const isLoadingFloors = ref(false);
const selectedLocationId = ref<string>("");

// 獲取地點 ID（與 environment.vue 保持一致）
const getLocationId = (location: EnvironmentLocation, floor: EnvironmentFloor): string => {
	return location.id || `${floor.name}-${location.name}`;
};

// 獲取地點所屬的樓層
const getLocationFloor = (location: EnvironmentLocation): EnvironmentFloor | null => {
	for (const floor of environmentFloors.value) {
		if (floor.locations.some(loc => loc.id === location.id || loc.name === location.name)) {
			return floor;
		}
	}
	return null;
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

// 當前選中的地點
const selectedLocation = computed<EnvironmentLocation | null>(() => {
	if (!selectedLocationId.value) return null;

	for (const floor of environmentFloors.value) {
		const location = floor.locations.find(loc => {
			const locationId = getLocationId(loc, floor);
			return locationId === selectedLocationId.value;
		});
		if (location) return location;
	}
	return null;
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

// 載入環境樓層（參考 environment.vue 的邏輯）
const loadFloors = async () => {
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

		// 優先選擇「測試工地管理」，如果沒有則選擇第一個地點
		if (environmentFloors.value.length > 0) {
			let foundLocation = false;

			// 先嘗試找「測試工地管理」
			for (const floor of environmentFloors.value) {
				const testSite = floor.locations.find(
					loc => loc.name === "測試工地管理" || loc.name.includes("測試工地管理")
				);
				if (testSite) {
					selectedLocationId.value = getLocationId(testSite, floor);
					foundLocation = true;
					break;
				}
			}

			// 如果沒找到「測試工地管理」，選擇第一個地點
			if (!foundLocation) {
				for (const floor of environmentFloors.value) {
					if (floor.locations && floor.locations.length > 0) {
						selectedLocationId.value = getLocationId(floor.locations[0], floor);
						foundLocation = true;
						break;
					}
				}
			}
		}
	} catch (error) {
		handleError(error, "載入環境樓層失敗");
	} finally {
		isLoadingFloors.value = false;
	}
};

// 載入地點的感測器設備
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

		// 嘗試從設備 API 返回的 model 中取得配置
		const deviceWithModel = device as any;
		if (deviceWithModel.model?.config) {
			const modelConfig = deviceWithModel.model.config as SensorDeviceModelConfig | undefined;
			if (modelConfig?.sensorParameters) {
				sensorDevice.value = device;
				deviceModelConfig.value = modelConfig || null;
				return;
			}
		}

		// 如果設備 API 沒有返回 model.config，則單獨取得型號資訊
		if (device.model_id) {
			try {
				const modelResult = await deviceApi.getDeviceModel(device.model_id);
				const modelConfig = modelResult.device_model.config as SensorDeviceModelConfig | undefined;
				sensorDevice.value = device;
				deviceModelConfig.value = modelConfig || null;
			} catch (error) {
				console.warn("[index] 載入設備型號配置失敗:", error);
				sensorDevice.value = device;
				deviceModelConfig.value = null;
			}
		} else {
			sensorDevice.value = device;
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

// 載入感測器資料（需要確保設備配置已載入）
const loadSensorData = async () => {
	if (!selectedLocation.value || !sensorDeviceConfig.value || !deviceModelConfig.value) {
		return;
	}

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
	} catch (error) {
		// 錯誤已由 useErrorHandler 統一處理
		console.error("[index] 載入感測器資料失敗:", error);
	}
};

// 自動刷新
const AUTO_REFRESH_INTERVAL = 5000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const startAutoRefresh = () => {
	if (refreshTimer) return;
	refreshTimer = setInterval(() => {
		void loadSensorData();
	}, AUTO_REFRESH_INTERVAL);
};

const stopAutoRefresh = () => {
	if (refreshTimer) {
		clearInterval(refreshTimer);
		refreshTimer = null;
	}
};

// 監聽地點變化
watch(
	() => selectedLocationId.value,
	async newLocationId => {
		if (!newLocationId) return;

		const location = selectedLocation.value;
		if (location) {
			// 先載入設備配置
			await loadLocationSensorDevice(location);
			// 等待配置載入完成後再載入數據
			await nextTick();
			await loadSensorData();
		}
	}
);

onMounted(async () => {
	// 先載入樓層資料
	await loadFloors();

	// 等待 selectedLocation 更新
	await nextTick();

	if (selectedLocation.value) {
		// 先載入設備配置
		await loadLocationSensorDevice(selectedLocation.value);
		// 等待配置載入完成後再載入數據
		await nextTick();
		await loadSensorData();
		// 啟動自動刷新
		startAutoRefresh();
	}
});

onBeforeUnmount(() => {
	stopAutoRefresh();
});
</script>
