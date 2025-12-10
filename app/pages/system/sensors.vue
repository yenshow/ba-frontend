<template>
	<div class="space-y-6">
		<header class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-3xl font-semibold text-white">環境感測器即時資料</h1>
				<p class="text-white/80">監控空氣品質、溫濕度等環境數據</p>
			</div>
			<div class="flex items-center gap-3">
				<span v-if="lastUpdated" class="text-sm text-white/70">最後更新：{{ formatDate(lastUpdated) }}</span>
				<button
					type="button"
					class="rounded-xl bg-white/20 px-5 py-2 text-white shadow hover:bg-white/30 disabled:cursor-not-allowed disabled:bg-white/10"
					:disabled="isLoading"
					@click="loadSensorData"
				>
					{{ isLoading ? "讀取中..." : "重新整理" }}
				</button>
			</div>
		</header>

		<!-- 設備狀態卡片 -->
		<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div class="glass-card">
				<p class="text-sm text-white/70">連線狀態</p>
				<p class="text-2xl font-semibold" :class="isConnected ? 'text-emerald-300' : 'text-rose-300'">
					{{ isConnected ? "已連線" : "未連線" }}
				</p>
				<p class="text-sm text-white/70">{{ healthStatus }}</p>
			</div>

			<div class="glass-card">
				<p class="text-sm text-white/70">目標裝置</p>
				<p class="text-xl font-semibold text-white">{{ hostLabel }}</p>
				<p class="text-sm text-white/70">Unit ID：{{ health?.unitId ?? "-" }}</p>
			</div>

			<div class="glass-card">
				<p class="text-sm text-white/70">最後連線時間</p>
				<p class="text-xl font-semibold text-white">{{ formatDate(health?.lastConnectedAt ?? null) }}</p>
				<p class="text-sm text-white/70">自健康檢查回傳</p>
			</div>

			<div class="glass-card">
				<p class="text-sm text-white/70">更新頻率</p>
				<p class="text-xl font-semibold text-white">{{ AUTO_REFRESH_INTERVAL / 1000 }} 秒</p>
				<p class="text-sm text-white/70">自動刷新中</p>
			</div>
		</section>

		<!-- 錯誤訊息 -->
		<div v-if="errorMessage" class="rounded-xl bg-rose-500/20 border border-rose-500/50 p-4 text-rose-200">
			{{ errorMessage }}
		</div>

		<!-- 感測器資料卡片 -->
		<section class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
			<!-- PM2.5 -->
			<div class="sensor-card">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-white">PM2.5</h3>
					<div class="w-3 h-3 rounded-full" :class="getPM25StatusClass(sensorData.pm25)"></div>
				</div>
				<p class="text-4xl font-bold text-white mb-1">{{ sensorData.pm25 ?? "—" }}</p>
				<p class="text-sm text-white/70">µg/m³</p>
				<p class="text-xs text-white/50 mt-2">細懸浮微粒</p>
			</div>

			<!-- PM10 -->
			<div class="sensor-card">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-white">PM10</h3>
					<div class="w-3 h-3 rounded-full" :class="getPM10StatusClass(sensorData.pm10)"></div>
				</div>
				<p class="text-4xl font-bold text-white mb-1">{{ sensorData.pm10 ?? "—" }}</p>
				<p class="text-sm text-white/70">µg/m³</p>
				<p class="text-xs text-white/50 mt-2">懸浮微粒</p>
			</div>

			<!-- CO2 -->
			<div class="sensor-card">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-white">CO₂</h3>
					<div class="w-3 h-3 rounded-full" :class="getCO2StatusClass(sensorData.co2)"></div>
				</div>
				<p class="text-4xl font-bold text-white mb-1">{{ sensorData.co2 ?? "—" }}</p>
				<p class="text-sm text-white/70">ppm</p>
				<p class="text-xs text-white/50 mt-2">二氧化碳</p>
			</div>

			<!-- Temperature -->
			<div class="sensor-card">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-white">溫度</h3>
					<div class="w-3 h-3 rounded-full bg-blue-400"></div>
				</div>
				<p class="text-4xl font-bold text-white mb-1">{{ sensorData.temperature ?? "—" }}</p>
				<p class="text-sm text-white/70">°C</p>
				<p class="text-xs text-white/50 mt-2">Temperature</p>
			</div>

			<!-- Humidity -->
			<div class="sensor-card">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-white">濕度</h3>
					<div class="w-3 h-3 rounded-full bg-cyan-400"></div>
				</div>
				<p class="text-4xl font-bold text-white mb-1">{{ sensorData.humidity ?? "—" }}</p>
				<p class="text-sm text-white/70">%</p>
				<p class="text-xs text-white/50 mt-2">Humidity</p>
			</div>

			<!-- TVOC -->
			<div class="sensor-card">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-white">TVOC</h3>
					<div class="w-3 h-3 rounded-full bg-purple-400"></div>
				</div>
				<p class="text-4xl font-bold text-white mb-1">{{ sensorData.tvoc ?? "—" }}</p>
				<p class="text-sm text-white/70">ppm</p>
				<p class="text-xs text-white/50 mt-2">總揮發性有機化合物</p>
			</div>

			<!-- HCHO -->
			<div class="sensor-card">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-white">HCHO</h3>
					<div class="w-3 h-3 rounded-full bg-orange-400"></div>
				</div>
				<p class="text-4xl font-bold text-white mb-1">{{ sensorData.hcho ?? "—" }}</p>
				<p class="text-sm text-white/70">ppm</p>
				<p class="text-xs text-white/50 mt-2">甲醛</p>
			</div>
		</section>

		<!-- 原始資料表格（可選，用於調試） -->
		<details class="data-card">
			<summary class="cursor-pointer text-white/70 hover:text-white mb-4">原始資料（展開查看）</summary>
			<table class="data-table">
				<thead>
					<tr>
						<th>感測器</th>
						<th>Modbus 地址</th>
						<th>原始值</th>
						<th>轉換後值</th>
						<th>單位</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>PM2.5</td>
						<td>0</td>
						<td>{{ rawData[0] ?? "—" }}</td>
						<td>{{ sensorData.pm25 ?? "—" }}</td>
						<td>µg/m³</td>
					</tr>
					<tr>
						<td>PM10</td>
						<td>1</td>
						<td>{{ rawData[1] ?? "—" }}</td>
						<td>{{ sensorData.pm10 ?? "—" }}</td>
						<td>µg/m³</td>
					</tr>
					<tr>
						<td>TVOC</td>
						<td>2</td>
						<td>{{ rawData[2] ?? "—" }}</td>
						<td>{{ sensorData.tvoc ?? "—" }}</td>
						<td>ppm</td>
					</tr>
					<tr>
						<td>HCHO</td>
						<td>3</td>
						<td>{{ rawData[3] ?? "—" }}</td>
						<td>{{ sensorData.hcho ?? "—" }}</td>
						<td>ppm</td>
					</tr>
					<tr>
						<td>Humidity</td>
						<td>4</td>
						<td>{{ rawData[4] ?? "—" }}</td>
						<td>{{ sensorData.humidity ?? "—" }}</td>
						<td>%</td>
					</tr>
					<tr>
						<td>Temperature</td>
						<td>5</td>
						<td>{{ rawData[5] ?? "—" }}</td>
						<td>{{ sensorData.temperature ?? "—" }}</td>
						<td>°C</td>
					</tr>
					<tr>
						<td>CO₂</td>
						<td>6</td>
						<td>{{ rawData[6] ?? "—" }}</td>
						<td>{{ sensorData.co2 ?? "—" }}</td>
						<td>ppm</td>
					</tr>
				</tbody>
			</table>
		</details>
	</div>
</template>

<script setup lang="ts">
import { useModbusApi } from "~/composables/useModbus";
import type { ModbusHealth, ModbusDeviceConfig } from "~/types/modbus";

definePageMeta({
	layout: "default"
});

const modbusApi = useModbusApi();

// 感測器設備配置：192.168.2.204:5020, Unit ID: 1
const sensorDeviceConfig: ModbusDeviceConfig = {
	host: "192.168.2.204",
	port: 5020,
	unitId: 1
};

// 感測器地址映射（Holding Registers）
const SENSOR_ADDRESSES = {
	PM25: 0,
	PM10: 1,
	TVOC: 2,
	HCHO: 3,
	HUMIDITY: 4,
	TEMPERATURE: 5,
	CO2: 6
};

const health = ref<ModbusHealth | null>(null);
const rawData = ref<number[]>([]);
const sensorData = reactive({
	pm25: null as number | null,
	pm10: null as number | null,
	tvoc: null as number | null,
	hcho: null as number | null,
	humidity: null as number | null,
	temperature: null as number | null,
	co2: null as number | null
});

const errorMessage = ref<string | null>(null);
const isLoading = ref(false);
const isAutoRefreshing = ref(false);
const lastUpdated = ref<Date | null>(null);
const AUTO_REFRESH_INTERVAL = 2000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const isConnected = computed(() => Boolean(health.value?.isOpen));
const hostLabel = computed(() => {
	if (!health.value) return "-";
	return `${health.value.host}:${health.value.port}`;
});
const healthStatus = computed(() => (health.value ? (health.value.isOpen ? "Modbus TCP 連線中" : "待連線") : "尚未取得"));

// 轉換原始資料為感測器數值
const transformSensorData = (raw: number[]) => {
	if (raw.length < 7) return;

	sensorData.pm25 = raw[SENSOR_ADDRESSES.PM25] - 1; // 或直接使用 raw[0]
	sensorData.pm10 = raw[SENSOR_ADDRESSES.PM10] - 1; // 或直接使用 raw[1]
	sensorData.tvoc = Number((raw[SENSOR_ADDRESSES.TVOC] / 1000).toFixed(3));
	sensorData.hcho = raw[SENSOR_ADDRESSES.HCHO];
	sensorData.humidity = Number((raw[SENSOR_ADDRESSES.HUMIDITY] / 10).toFixed(1));
	sensorData.temperature = Number((raw[SENSOR_ADDRESSES.TEMPERATURE] / 10).toFixed(1));
	sensorData.co2 = raw[SENSOR_ADDRESSES.CO2];
};

// 狀態指示器顏色
const getPM25StatusClass = (value: number | null) => {
	if (value === null) return "bg-gray-400";
	if (value <= 15) return "bg-green-400";
	if (value <= 35) return "bg-yellow-400";
	return "bg-red-400";
};

const getPM10StatusClass = (value: number | null) => {
	if (value === null) return "bg-gray-400";
	if (value <= 50) return "bg-green-400";
	if (value <= 100) return "bg-yellow-400";
	return "bg-red-400";
};

const getCO2StatusClass = (value: number | null) => {
	if (value === null) return "bg-gray-400";
	if (value <= 1000) return "bg-green-400";
	if (value <= 2000) return "bg-yellow-400";
	return "bg-red-400";
};

const setError = (message: string) => {
	errorMessage.value = message;
};

const loadSensorData = async (options?: { silent?: boolean }) => {
	if (options?.silent && (isLoading.value || isAutoRefreshing.value)) {
		return;
	}

	const targetLoading = options?.silent ? isAutoRefreshing : isLoading;
	targetLoading.value = true;

	if (!options?.silent) {
		errorMessage.value = null;
	}

	try {
		// 讀取健康狀態
		health.value = await modbusApi.getHealth(sensorDeviceConfig);

		// 讀取感測器資料（地址 0-6，共 7 個寄存器）
		const response = await modbusApi.getHoldingRegisters(0, 7, sensorDeviceConfig);
		rawData.value = response.data;

		// 轉換資料
		transformSensorData(response.data);

		lastUpdated.value = new Date();
	} catch (error) {
		console.error(error);
		if (!options?.silent) {
			setError(error instanceof Error ? error.message : "讀取感測器資料失敗");
		}
	} finally {
		targetLoading.value = false;
	}
};

const formatDate = (value: Date | string | null) => {
	if (!value) return "—";
	const date = typeof value === "string" ? new Date(value) : value;
	return date.toLocaleString("zh-TW");
};

const startAutoRefresh = () => {
	if (refreshTimer) return;
	refreshTimer = setInterval(() => {
		loadSensorData({ silent: true });
	}, AUTO_REFRESH_INTERVAL);
};

const stopAutoRefresh = () => {
	if (!refreshTimer) return;
	clearInterval(refreshTimer);
	refreshTimer = null;
};

onMounted(() => {
	loadSensorData();
	startAutoRefresh();
});

onBeforeUnmount(() => {
	stopAutoRefresh();
});
</script>

<style scoped>
.glass-card {
	border-radius: 1rem;
	border: 1px solid rgba(255, 255, 255, 0.3);
	background-color: rgba(255, 255, 255, 0.1);
	padding: 1.25rem;
	color: #fff;
	backdrop-filter: blur(8px);
}

.sensor-card {
	border-radius: 1rem;
	border: 1px solid rgba(255, 255, 255, 0.3);
	background-color: rgba(255, 255, 255, 0.1);
	padding: 1.5rem;
	color: #fff;
	backdrop-filter: blur(8px);
	transition: transform 0.2s, box-shadow 0.2s;
}

.sensor-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.data-card {
	border-radius: 1rem;
	border: 1px solid rgba(255, 255, 255, 0.3);
	background-color: rgba(255, 255, 255, 0.1);
	padding: 1.5rem;
	color: #fff;
	backdrop-filter: blur(8px);
}

.data-table {
	width: 100%;
	border-collapse: collapse;
}

.data-table th {
	border-bottom: 1px solid rgba(255, 255, 255, 0.3);
	padding-bottom: 0.5rem;
	padding-top: 0.5rem;
	text-align: left;
	font-size: 0.875rem;
	font-weight: 400;
	color: rgba(255, 255, 255, 0.7);
}

.data-table td {
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	padding: 0.75rem 0;
	font-size: 0.875rem;
	color: #fff;
}
</style>
