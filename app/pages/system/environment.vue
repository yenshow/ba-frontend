<template>
	<div class="space-y-4 2xl:space-y-6">
		<!-- 頁面標題 -->
		<header class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl 2xl:text-4xl font-semibold text-white">環境品質系統</h1>
				<p class="text-base 2xl:text-xl text-white/80">即時監控環境品質數據</p>
			</div>
			<div class="flex items-center gap-3">
				<span v-if="lastUpdated" class="text-sm text-white/70">最後更新：{{ formatDate(lastUpdated) }}</span>
				<button
					type="button"
					class="rounded-xl bg-white/20 px-5 py-2 text-white shadow hover:bg-white/30 disabled:cursor-not-allowed disabled:bg-white/10"
					:disabled="isFetching"
					@click="loadSensorData"
				>
					{{ isFetching ? "讀取中..." : "重新整理" }}
				</button>
			</div>
		</header>

		<!-- 主要內容區域 -->
		<div class="grid grid-cols-1 xl:grid-cols-3 gap-4 2xl:gap-6">
			<!-- 左側：詳細視圖 -->
			<div class="xl:col-span-2 space-y-4 2xl:space-y-6">
				<!-- 位置標題 -->
				<div class="bg-white/30 rounded-2xl border-2 border-white/80 px-6 py-4">
					<h2 class="text-2xl 2xl:text-3xl font-semibold text-white">{{ currentLocation }}</h2>
				</div>

				<!-- 三個大儀表 -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 2xl:gap-6">
					<!-- 噪音值儀表 -->
					<div class="bg-white/30 rounded-2xl border-2 border-white/80 p-6 2xl:p-8">
						<div class="flex flex-col items-center space-y-4">
							<div class="relative w-full aspect-square max-w-[180px] 2xl:max-w-[220px]">
								<!-- 圓形儀表 -->
								<div class="absolute inset-0 w-full h-full rounded-full border-4 border-yellow-400 flex flex-col items-center justify-center">
									<div class="text-4xl 2xl:text-5xl font-light text-white">{{ noiseValue ?? "—" }}</div>
									<div class="text-lg 2xl:text-xl font-light text-white/80 mt-2">dB</div>
								</div>
							</div>
							<div class="text-xl 2xl:text-2xl font-light text-white">噪音值</div>
						</div>
					</div>

					<!-- AQI 儀表 -->
					<div class="bg-white/30 rounded-2xl border-2 border-white/80 p-6 2xl:p-8">
						<AQICard :aqi="aqiData" />
					</div>

					<!-- 溫度儀表 -->
					<div class="bg-white/30 rounded-2xl border-2 border-white/80 p-6 2xl:p-8">
						<EnvironmentCard :data="environmentData" />
					</div>
				</div>

				<!-- 趨勢圖區域（佔位符，未來可整合圖表庫） -->
				<div class="bg-white/30 rounded-2xl border-2 border-white/80 p-6 2xl:p-8">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="space-y-2">
							<h3 class="text-lg font-semibold text-white">噪音值趨勢圖</h3>
							<div class="h-32 bg-white/10 rounded-lg flex items-center justify-center">
								<span class="text-white/50">趨勢圖（待實作）</span>
							</div>
							<div class="flex gap-2 text-xs text-white/70">
								<span>日</span>
								<span>週</span>
								<span>月</span>
								<span>年</span>
							</div>
						</div>
						<div class="space-y-2">
							<h3 class="text-lg font-semibold text-white">AQI指數趨勢圖</h3>
							<div class="h-32 bg-white/10 rounded-lg flex items-center justify-center">
								<span class="text-white/50">趨勢圖（待實作）</span>
							</div>
							<div class="flex gap-2 text-xs text-white/70">
								<span>日</span>
								<span>週</span>
								<span>月</span>
								<span>年</span>
							</div>
						</div>
						<div class="space-y-2">
							<h3 class="text-lg font-semibold text-white">溫度趨勢圖</h3>
							<div class="h-32 bg-white/10 rounded-lg flex items-center justify-center">
								<span class="text-white/50">趨勢圖（待實作）</span>
							</div>
							<div class="flex gap-2 text-xs text-white/70">
								<span>日</span>
								<span>週</span>
								<span>月</span>
								<span>年</span>
							</div>
						</div>
					</div>
				</div>

				<!-- 環境參數網格 -->
				<div class="bg-white/30 rounded-2xl border-2 border-white/80 p-6 2xl:p-8">
					<h3 class="text-xl 2xl:text-2xl font-semibold text-white mb-4 2xl:mb-6">環境參數</h3>
					<div class="grid grid-cols-2 md:grid-cols-3 gap-4 2xl:gap-6">
						<!-- PM2.5 -->
						<div class="environment-param-card" :class="getStatusClass('pm25', sensorData.pm25)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14">
									<NuxtImg src="/layout/pm2.5.png" alt="PM2.5" class="w-full h-full object-contain" width="56" height="56" />
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('pm25', sensorData.pm25)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ sensorData.pm25 !== null ? toFixedNumber(sensorData.pm25) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">µg/m³</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('pm25', sensorData.pm25)">
								{{ getStatusText('pm25', sensorData.pm25) }}
							</div>
						</div>

						<!-- PM10 -->
						<div class="environment-param-card" :class="getStatusClass('pm10', sensorData.pm10)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14">
									<NuxtImg src="/layout/pm10.png" alt="PM10" class="w-full h-full object-contain" width="56" height="56" />
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('pm10', sensorData.pm10)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ sensorData.pm10 !== null ? toFixedNumber(sensorData.pm10) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">µg/m³</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('pm10', sensorData.pm10)">
								{{ getStatusText('pm10', sensorData.pm10) }}
							</div>
						</div>

						<!-- CO2 -->
						<div class="environment-param-card" :class="getStatusClass('co2', sensorData.co2)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14">
									<NuxtImg src="/layout/co.png" alt="CO2" class="w-full h-full object-contain" width="56" height="56" />
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('co2', sensorData.co2)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ sensorData.co2 !== null ? toFixedNumber(sensorData.co2) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">ppm</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('co2', sensorData.co2)">
								{{ getStatusText('co2', sensorData.co2) }}
							</div>
						</div>

						<!-- TVOC -->
						<div class="environment-param-card" :class="getStatusClass('tvoc', sensorData.tvoc)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14">
									<NuxtImg src="/layout/so2.png" alt="TVOC" class="w-full h-full object-contain" width="56" height="56" />
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('tvoc', sensorData.tvoc)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ sensorData.tvoc !== null ? toFixedNumber(sensorData.tvoc, 3) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">ppm</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('tvoc', sensorData.tvoc)">
								{{ getStatusText('tvoc', sensorData.tvoc) }}
							</div>
						</div>

						<!-- HCHO -->
						<div class="environment-param-card" :class="getStatusClass('hcho', sensorData.hcho)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14">
									<NuxtImg src="/layout/no2.png" alt="HCHO" class="w-full h-full object-contain" width="56" height="56" />
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('hcho', sensorData.hcho)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ sensorData.hcho !== null ? toFixedNumber(sensorData.hcho) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">ppm</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('hcho', sensorData.hcho)">
								{{ getStatusText('hcho', sensorData.hcho) }}
							</div>
						</div>

						<!-- 溫度 -->
						<div class="environment-param-card" :class="getStatusClass('temperature', sensorData.temperature)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14">
									<NuxtImg src="/layout/temperature.png" alt="溫度" class="w-full h-full object-contain" width="56" height="56" />
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('temperature', sensorData.temperature)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ sensorData.temperature !== null ? toFixedNumber(sensorData.temperature, 1) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">°C</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('temperature', sensorData.temperature)">
								{{ getStatusText('temperature', sensorData.temperature) }}
							</div>
						</div>

						<!-- 風速 -->
						<div class="environment-param-card" :class="getStatusClass('wind', windSpeed)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14">
									<NuxtImg src="/layout/wind-speed.png" alt="風速" class="w-full h-full object-contain" width="56" height="56" />
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('wind', windSpeed)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ windSpeed !== null ? toFixedNumber(windSpeed, 1) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">m/s</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('wind', windSpeed)">
								{{ getStatusText('wind', windSpeed) }}
							</div>
						</div>

						<!-- 濕度 -->
						<div class="environment-param-card" :class="getStatusClass('humidity', sensorData.humidity)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14">
									<NuxtImg src="/layout/humidity.png" alt="濕度" class="w-full h-full object-contain" width="56" height="56" />
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('humidity', sensorData.humidity)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ sensorData.humidity !== null ? toFixedNumber(sensorData.humidity, 1) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">%</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('humidity', sensorData.humidity)">
								{{ getStatusText('humidity', sensorData.humidity) }}
							</div>
						</div>

						<!-- 噪音值 -->
						<div class="environment-param-card" :class="getStatusClass('noise', noiseValue)">
							<div class="flex items-center justify-between mb-2">
								<div class="w-12 h-12 2xl:w-14 2xl:h-14 flex items-center justify-center">
									<svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
										<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
									</svg>
								</div>
								<div class="w-3 h-3 rounded-full" :class="getStatusDotClass('noise', noiseValue)"></div>
							</div>
							<div class="text-2xl 2xl:text-3xl font-semibold text-white mb-1">
								{{ noiseValue !== null ? toFixedNumber(noiseValue) : "—" }}
							</div>
							<div class="text-sm 2xl:text-base text-white/70 mb-2">dB</div>
							<div class="text-xs 2xl:text-sm font-medium" :class="getStatusTextClass('noise', noiseValue)">
								{{ getStatusText('noise', noiseValue) }}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- 右側：總覽面板 -->
			<div class="xl:col-span-1">
				<div class="bg-white/30 rounded-2xl border-2 border-white/80 p-6 2xl:p-8 sticky top-4">
					<h2 class="text-2xl 2xl:text-3xl font-semibold text-white mb-6">總覽</h2>
					<div class="space-y-6">
						<!-- 管理中心 -->
						<div class="overview-location-card">
							<div class="mb-4">
								<h3 class="text-xl 2xl:text-2xl font-semibold text-white mb-2">管理中心</h3>
								<p class="text-sm 2xl:text-base text-white/70">1F</p>
							</div>
							<div class="grid grid-cols-2 gap-4 mb-4">
								<div>
									<div class="text-sm 2xl:text-base text-white/70 mb-1">AQI</div>
									<div class="text-2xl 2xl:text-3xl font-semibold text-white">{{ aqiScore }}</div>
								</div>
								<div>
									<div class="text-sm 2xl:text-base text-white/70 mb-1">噪音值</div>
									<div class="text-2xl 2xl:text-3xl font-semibold text-white">{{ noiseValue ?? "—" }}</div>
								</div>
							</div>
							<div class="space-y-2 text-xs 2xl:text-sm">
								<div class="flex justify-between text-white/80">
									<span>PM2.5:</span>
									<span :class="sensorData.pm25 !== null && sensorData.pm25 > 35 ? 'text-red-300' : 'text-white/80'">
										{{ sensorData.pm25 !== null ? toFixedNumber(sensorData.pm25) : "—" }} µg/m²
									</span>
								</div>
								<div class="flex justify-between text-white/80">
									<span>TVOC:</span>
									<span>{{ sensorData.tvoc !== null ? toFixedNumber(sensorData.tvoc, 3) : "—" }} ppm</span>
								</div>
								<div class="flex justify-between text-white/80">
									<span>溫度:</span>
									<span :class="sensorData.temperature !== null && sensorData.temperature > 30 ? 'text-red-300' : 'text-white/80'">
										{{ sensorData.temperature !== null ? toFixedNumber(sensorData.temperature, 1) : "—" }} °C
									</span>
								</div>
								<div class="flex justify-between text-white/80">
									<span>PM10:</span>
									<span>{{ sensorData.pm10 !== null ? toFixedNumber(sensorData.pm10) : "—" }} µg/m²</span>
								</div>
								<div class="flex justify-between text-white/80">
									<span>HCHO:</span>
									<span>{{ sensorData.hcho !== null ? toFixedNumber(sensorData.hcho) : "—" }} ppm</span>
								</div>
								<div class="flex justify-between text-white/80">
									<span>濕度:</span>
									<span :class="sensorData.humidity !== null && sensorData.humidity < 20 ? 'text-yellow-300' : 'text-white/80'">
										{{ sensorData.humidity !== null ? toFixedNumber(sensorData.humidity, 1) : "—" }} %
									</span>
								</div>
								<div class="flex justify-between text-white/80">
									<span>CO2:</span>
									<span>{{ sensorData.co2 !== null ? toFixedNumber(sensorData.co2) : "—" }} ppm</span>
								</div>
								<div class="flex justify-between text-white/80">
									<span>噪音值:</span>
									<span :class="noiseValue !== null && noiseValue > 60 ? 'text-yellow-300' : 'text-white/80'">
										{{ noiseValue !== null ? toFixedNumber(noiseValue) : "—" }} dB
									</span>
								</div>
								<div class="flex justify-between text-white/80">
									<span>風速:</span>
									<span>{{ windSpeed !== null ? toFixedNumber(windSpeed, 1) : "—" }} m/s</span>
								</div>
							</div>
						</div>

						<!-- 停車空間（範例資料，未來可從多個感測器讀取） -->
						<div class="overview-location-card opacity-60">
							<div class="mb-4">
								<h3 class="text-xl 2xl:text-2xl font-semibold text-white mb-2">停車空間</h3>
								<p class="text-sm 2xl:text-base text-white/70">B1F</p>
							</div>
							<div class="grid grid-cols-2 gap-4 mb-4">
								<div>
									<div class="text-sm 2xl:text-base text-white/70 mb-1">AQI</div>
									<div class="text-2xl 2xl:text-3xl font-semibold text-white">—</div>
								</div>
								<div>
									<div class="text-sm 2xl:text-base text-white/70 mb-1">噪音值</div>
									<div class="text-2xl 2xl:text-3xl font-semibold text-white">—</div>
								</div>
							</div>
							<div class="text-sm text-white/50 italic">待連接感測器</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import AQICard from "~/components/common/AQICard.vue";
import EnvironmentCard from "~/components/common/EnvironmentCard.vue";
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

// 噪音值和風速（目前為模擬資料，未來可從感測器讀取）
const noiseValue = ref<number | null>(70);
const windSpeed = ref<number | null>(0.7);

const currentLocation = computed(() => {
	return sensorDevice.value?.name || "1F / 管理中心";
});

const isFetching = ref(false);
const isSensorOffline = ref(false);
const lastOfflineAlertTime = ref<number | null>(null);
const lastUpdated = ref<Date | null>(null);
const AUTO_REFRESH_INTERVAL = 5000;
const OFFLINE_ALERT_INTERVAL = 30000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

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

const calculatePollutantAQI = (value: number | null, breakpoints: AQIBreakpoint[]): number | null => {
	if (value === null) {
		return null;
	}

	const targetBreakpoint =
		breakpoints.find((breakpoint) => {
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

// 載入感測器設備配置
const loadSensorDevice = async () => {
	try {
		const result = await deviceApi.getDevices({
			type_code: "sensor",
			status: "active",
			limit: 1
		});
		
		if (result.devices.length > 0) {
			sensorDevice.value = result.devices[0];
		} else {
			console.warn("[environment] 未找到啟用的感測器設備");
			toast.warning("未找到啟用的感測器設備", 5000);
		}
	} catch (error) {
		console.error("[environment] 載入感測器設備失敗", error);
		const errorMsg = error instanceof Error ? error.message : "載入感測器設備失敗";
		toast.error(errorMsg, 5000);
	}
};

const loadSensorData = async () => {
	if (isFetching.value) {
		return;
	}

	if (!sensorDevice.value) {
		await loadSensorDevice();
	}

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
		
		const response = await request<ModbusDataResponse<number>>(`/modbus/holding-registers?${queryParams.toString()}`);
		transformSensorData(response.data);
		lastUpdated.value = new Date();
		
		if (isSensorOffline.value) {
			isSensorOffline.value = false;
			toast.success("感測器已恢復連線", 5000);
			lastOfflineAlertTime.value = null;
		}
	} catch (error: any) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isOfflineError = errorMessage.includes("503") || 
			errorMessage.includes("服務不可用") || 
			errorMessage.includes("設備離線");
		
		if (isOfflineError) {
			const now = Date.now();
			const shouldShowAlert = !isSensorOffline.value || 
				(lastOfflineAlertTime.value === null || 
				 (now - lastOfflineAlertTime.value) >= OFFLINE_ALERT_INTERVAL);
			
			if (shouldShowAlert) {
				isSensorOffline.value = true;
				lastOfflineAlertTime.value = now;
				toast.warning("感測器離線，無法讀取資料", 8000);
			}
		} else {
			if (!isSensorOffline.value) {
				console.error("[environment] 讀取感測器資料失敗", error);
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
	await loadSensorDevice();
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
	location: currentLocation.value,
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
	location: currentLocation.value,
	metrics: [
		{ label: "溫度", value: toFixedNumber(sensorData.temperature, 1), unit: "°C", icon: "temperature" },
		{ label: "濕度", value: toFixedNumber(sensorData.humidity, 1), unit: "%", icon: "humidity" },
		{ label: "CO₂", value: toFixedNumber(sensorData.co2), unit: "ppm", icon: "CO₂" }
	]
}));

// 狀態判斷函數
const getStatusClass = (type: string, value: number | null): string => {
	if (value === null) return "";
	
	switch (type) {
		case "pm25":
			if (value <= 15) return "";
			if (value <= 35) return "border-yellow-400";
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
			if (value <= 28) return "";
			if (value <= 30) return "border-yellow-400";
			return "border-red-400 bg-red-500/20";
		case "humidity":
			if (value >= 20 && value <= 80) return "";
			return "border-yellow-400 bg-yellow-500/10";
		case "noise":
			if (value <= 60) return "";
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
			if (value <= 15) return "bg-green-400";
			if (value <= 35) return "bg-yellow-400";
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
			if (value <= 28) return "bg-green-400";
			if (value <= 30) return "bg-yellow-400";
			return "bg-red-400";
		case "humidity":
			if (value >= 20 && value <= 80) return "bg-green-400";
			return "bg-yellow-400";
		case "wind":
			return "bg-green-400";
		case "noise":
			if (value <= 60) return "bg-green-400";
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
			if (value <= 15) return "正常";
			if (value <= 35) return "注意";
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
			if (value <= 28) return "正常";
			if (value <= 30) return "注意";
			return "警報";
		case "humidity":
			if (value >= 20 && value <= 80) return "正常";
			return "異常";
		case "wind":
			return "正常";
		case "noise":
			if (value <= 60) return "正常";
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

const formatDate = (value: Date | null) => {
	if (!value) return "—";
	return value.toLocaleString("zh-TW");
};
</script>

<style scoped>
.environment-param-card {
	@apply bg-white/10 rounded-xl border-2 border-white/30 p-4 2xl:p-6 backdrop-blur-sm transition-all;
}

.environment-param-card:hover {
	@apply bg-white/15 border-white/40;
}

.overview-location-card {
	@apply bg-white/10 rounded-xl border-2 border-white/30 p-4 2xl:p-6 backdrop-blur-sm;
}
</style>

