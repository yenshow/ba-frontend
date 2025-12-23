<template>
	<!-- Main Content -->
	<div class="grid grid-cols-1 gap-4 xl:grid-cols-3 2xl:gap-8">
		<!-- Left Column -->
		<div class="col-span-2 space-y-4 2xl:space-y-8">
			<!-- Data Cards Section -->
			<div class="overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30">
				<div class="grid h-full grid-cols-1 xl:grid-cols-12">
					<!-- AQI Card -->
					<AQICard class="col-span-1 xl:col-span-7" :aqi="aqiData" />

					<!-- Environmental Card -->
					<EnvironmentCard class="col-span-1 xl:col-span-5" :data="environmentData" />
				</div>
			</div>

			<!-- System Modules Section -->
			<div
				class="overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 px-8 xl:px-12 2xl:px-24"
			>
				<SystemModule />
			</div>
		</div>

		<!-- Right Column -->
		<div class="col-span-1 grid grid-rows-12">
			<div class="row-span-12 overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30">
				<!-- Building Image Card -->
				<BuildingCard />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import AQICard from "~/components/common/AQICard.vue";
import EnvironmentCard from "~/components/common/EnvironmentCard.vue";
import BuildingCard from "~/components/common/BuildingCard.vue";
import SystemModule from "~/components/common/SystemModule.vue";
import { useDeviceApi } from "~/composables/useDeviceApi";
import { useApiBase } from "~/composables/useApiBase";
import type { ModbusDeviceConfig, ModbusDataResponse } from "~/types/modbus";
import type { Device, SensorDeviceConfig } from "~/types/device";

definePageMeta({
	layout: "default"
});

const deviceApi = useDeviceApi();
const { request } = useApiBase();
const toast = useToast();

// 感測器設備（從設備 API 讀取）
const sensorDevice = ref<Device | null>(null);
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

const SENSOR_ADDRESSES = {
	PM25: 0,
	PM10: 1,
	TVOC: 2,
	HCHO: 3,
	HUMIDITY: 4,
	TEMPERATURE: 5,
	CO2: 6
} as const;

type SensorReadings = {
	pm25: number | null;
	pm10: number | null;
	tvoc: number | null;
	hcho: number | null;
	humidity: number | null;
	temperature: number | null;
	co2: number | null;
};

const sensorData = reactive<SensorReadings>({
	pm25: null,
	pm10: null,
	tvoc: null,
	hcho: null,
	humidity: null,
	temperature: null,
	co2: null
});

const isFetching = ref(false);
const isSensorOffline = ref(false); // 追蹤感測器離線狀態
const lastOfflineAlertTime = ref<number | null>(null); // 記錄上次警報時間
const AUTO_REFRESH_INTERVAL = 5000; // 調整為 5 秒，減少後端負擔
const OFFLINE_ALERT_INTERVAL = 30000; // 每 30 秒最多顯示一次離線警報
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// 噪音值和風速（從感測器讀取）
const noiseValue = ref<number | null>(null);
const windSpeed = ref<number | null>(null);

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

const transformSensorData = (raw: number[]) => {
	if (raw.length < 7) return;

	sensorData.pm25 = raw[SENSOR_ADDRESSES.PM25] - 1;
	sensorData.pm10 = raw[SENSOR_ADDRESSES.PM10] - 1;
	sensorData.tvoc = Number((raw[SENSOR_ADDRESSES.TVOC] / 1000).toFixed(3));
	sensorData.hcho = raw[SENSOR_ADDRESSES.HCHO];
	sensorData.humidity = Number((raw[SENSOR_ADDRESSES.HUMIDITY] / 10).toFixed(1));
	sensorData.temperature = Number((raw[SENSOR_ADDRESSES.TEMPERATURE] / 10).toFixed(1));
	sensorData.co2 = raw[SENSOR_ADDRESSES.CO2];
};

// 載入感測器設備配置
const loadSensorDevice = async () => {
	try {
		// 從設備 API 讀取第一個啟用的感測器設備
		const result = await deviceApi.getDevices({
			type_code: "sensor",
			status: "active",
			limit: 1
		});

		if (result.devices.length > 0) {
			sensorDevice.value = result.devices[0];
		} else {
			console.warn("[index] 未找到啟用的感測器設備");
			toast.warning("未找到啟用的感測器設備", 5000);
		}
	} catch (error) {
		console.error("[index] 載入感測器設備失敗", error);
		const errorMsg = error instanceof Error ? error.message : "載入感測器設備失敗";
		toast.error(errorMsg, 5000);
	}
};

const loadSensorData = async () => {
	if (isFetching.value) {
		return;
	}

	// 如果沒有感測器設備配置，先載入
	if (!sensorDevice.value) {
		await loadSensorDevice();
	}

	// 如果仍然沒有配置，無法讀取資料
	if (!sensorDeviceConfig.value) {
		return;
	}

	isFetching.value = true;

	try {
		const config = sensorDeviceConfig.value;
		const queryParams = new URLSearchParams({
			host: config.host,
			port: String(config.port),
			unitId: String(config.unitId),
			address: "0",
			length: "7"
		});

		const response = await request<ModbusDataResponse<number>>(
			`/modbus/holding-registers?${queryParams.toString()}`
		);
		transformSensorData(response.data);

		// 感測器恢復連線
		if (isSensorOffline.value) {
			isSensorOffline.value = false;
			toast.success("感測器已恢復連線", 5000);
			lastOfflineAlertTime.value = null;
		}
	} catch (error: any) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isOfflineError =
			errorMessage.includes("503") ||
			errorMessage.includes("服務不可用") ||
			errorMessage.includes("設備離線");

		if (isOfflineError) {
			// 設備離線 - 使用防抖機制避免重複提示
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
			// 其他錯誤（CORS、網路等）- 只在感測器在線時顯示，避免重複提示
			if (!isSensorOffline.value) {
				console.error("[index] 讀取感測器資料失敗", error);
				toast.error(errorMessage, 5000);
			}
		}
	} finally {
		isFetching.value = false;
	}
};

const startAutoRefresh = () => {
	if (refreshTimer) {
		return;
	}

	refreshTimer = setInterval(() => {
		void loadSensorData();
	}, AUTO_REFRESH_INTERVAL);
};

const stopAutoRefresh = () => {
	if (!refreshTimer) {
		return;
	}

	clearInterval(refreshTimer);
	refreshTimer = null;
};

onMounted(async () => {
	// 先載入感測器設備配置
	await loadSensorDevice();
	// 然後載入感測器資料
	void loadSensorData();
	startAutoRefresh();
});

onBeforeUnmount(() => {
	stopAutoRefresh();
});

const toFixedNumber = (value: number | null, fractionDigits = 0) => {
	if (value === null || Number.isNaN(value)) {
		return 0;
	}
	return Number(value.toFixed(fractionDigits));
};

const aqiScore = computed(() => {
	const pollutantAQIs = [
		calculatePollutantAQI(sensorData.pm25, PM25_BREAKPOINTS),
		calculatePollutantAQI(sensorData.pm10, PM10_BREAKPOINTS)
	].filter((value): value is number => value !== null);

	if (!pollutantAQIs.length) {
		return 0;
	}

	return Math.max(...pollutantAQIs);
});

const aqiData = computed(() => ({
	value: aqiScore.value,
	location: "1F 室外",
	metrics: [
		{
			label: "PM2.5",
			value: toFixedNumber(sensorData.pm25),
			unit: "µg/m³",
			icon: "PM2.5"
		},
		{
			label: "PM10",
			value: toFixedNumber(sensorData.pm10),
			unit: "µg/m³",
			icon: "PM10"
		},
		{
			label: "溫度",
			value: toFixedNumber(sensorData.temperature, 1),
			unit: "°C",
			icon: "temperature"
		},
		{
			label: "濕度",
			value: toFixedNumber(sensorData.humidity, 1),
			unit: "%",
			icon: "humidity"
		},
		{
			label: "風速",
			value: toFixedNumber(windSpeed.value, 1),
			unit: "m/s",
			icon: "wind"
		},
		{
			label: "噪音",
			value: toFixedNumber(noiseValue.value),
			unit: "dB",
			icon: "noise"
		}
	]
}));

const environmentData = computed(() => ({
	temperature: toFixedNumber(sensorData.temperature, 1),
	location: "1F 室內",
	metrics: [
		{
			label: "濕度",
			value: toFixedNumber(sensorData.humidity, 1),
			unit: "%",
			icon: "humidity"
		},
		{
			label: "CO₂",
			value: toFixedNumber(sensorData.co2),
			unit: "ppm",
			icon: "CO2"
		},
		{
			label: "PM2.5",
			value: toFixedNumber(sensorData.pm25),
			unit: "µg/m³",
			icon: "PM2.5"
		}
	]
}));
</script>
