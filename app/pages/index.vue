<template>
	<!-- Main Content -->
	<div class="grid grid-cols-1 xl:grid-cols-3 gap-4 2xl:gap-8">
		<!-- Left Column -->
		<div class="col-span-2 space-y-4 2xl:space-y-8">
			<!-- Data Cards Section -->
			<div class="bg-white/30 rounded-2xl overflow-hidden border-2 border-white/80">
				<div class="grid grid-cols-1 xl:grid-cols-12 h-full">
					<!-- AQI Card -->
					<AQICard class="col-span-1 xl:col-span-7" :aqi="aqiData" />

					<!-- Environmental Card -->
					<EnvironmentCard class="col-span-1 xl:col-span-5" :data="environmentData" />
				</div>
			</div>

			<!-- System Modules Section -->
			<div class="bg-white/30 rounded-2xl overflow-hidden border-2 border-white/80 px-8 xl:px-12 2xl:px-24">
				<SystemModule />
			</div>
		</div>

		<!-- Right Column -->
		<div class="col-span-1 grid grid-rows-12">
			<div class="bg-white/30 rounded-2xl overflow-hidden border-2 border-white/80 row-span-12">
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
import { useModbusApi } from "~/composables/useModbus";
import type { DeviceConfig } from "~/types/modbus";

definePageMeta({
	layout: "default"
});

const modbusApi = useModbusApi();

// 感測器設備配置：與系統感測頁共用同一 Modbus 讀取邏輯
const sensorDeviceConfig: DeviceConfig = {
	host: "192.168.2.204",
	port: 5020,
	unitId: 1
};

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
const AUTO_REFRESH_INTERVAL = 2000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const transformSensorData = (raw: number[]) => {
	if (raw.length < 7) {
		return;
	}

	sensorData.pm25 = raw[SENSOR_ADDRESSES.PM25] - 1;
	sensorData.pm10 = raw[SENSOR_ADDRESSES.PM10] - 1;
	sensorData.tvoc = Number((raw[SENSOR_ADDRESSES.TVOC] / 1000).toFixed(3));
	sensorData.hcho = raw[SENSOR_ADDRESSES.HCHO];
	sensorData.humidity = Number((raw[SENSOR_ADDRESSES.HUMIDITY] / 10).toFixed(1));
	sensorData.temperature = Number((raw[SENSOR_ADDRESSES.TEMPERATURE] / 10).toFixed(1));
	sensorData.co2 = raw[SENSOR_ADDRESSES.CO2];
};

const loadSensorData = async () => {
	if (isFetching.value) {
		return;
	}

	isFetching.value = true;

	try {
		const response = await modbusApi.getHoldingRegisters(0, 7, sensorDeviceConfig);
		transformSensorData(response.data);
	} catch (error) {
		console.error("[index] 讀取感測器資料失敗", error);
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

onMounted(() => {
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
	const normalizedValues: number[] = [];

	if (sensorData.pm25 !== null) {
		normalizedValues.push(Math.min(sensorData.pm25 / 35, 1));
	}
	if (sensorData.pm10 !== null) {
		normalizedValues.push(Math.min(sensorData.pm10 / 50, 1));
	}
	if (sensorData.co2 !== null) {
		normalizedValues.push(Math.min(sensorData.co2 / 1000, 1));
	}

	if (!normalizedValues.length) {
		return 0;
	}

	const average = normalizedValues.reduce((sum, value) => sum + value, 0) / normalizedValues.length;
	return Math.round(average * 100);
});

const aqiData = computed(() => ({
	value: aqiScore.value,
	location: "1F 管理中心",
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
	location: "1F 閱覽室",
	metrics: [
		{ label: "溫度", value: toFixedNumber(sensorData.temperature, 1), unit: "°C", icon: "temperature" },
		{ label: "濕度", value: toFixedNumber(sensorData.humidity, 1), unit: "%", icon: "humidity" },
		{ label: "CO₂", value: toFixedNumber(sensorData.co2), unit: "ppm", icon: "CO₂" }
	]
}));
</script>
