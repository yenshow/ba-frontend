<template>
	<div class="space-y-2 px-4 text-center">
		<!-- 時間範圍選擇 -->
		<div class="ms-auto flex w-fit gap-2 border-b border-white/80 px-2 pb-px text-xs text-white/70">
			<button
				v-for="period in periods"
				:key="period.value"
				:class="[
					'cursor-pointer transition-colors',
					selectedPeriod === period.value ? 'font-semibold text-white' : 'text-white/70 hover:text-white'
				]"
				@click="selectedPeriod = period.value"
			>
				{{ period.label }}
			</button>
		</div>

		<!-- 圖表區域 -->
		<div ref="chartContainer" class="relative h-24 w-full">
			<Transition name="fade" mode="out-in">
				<div
					v-if="isLoading"
					key="loading"
					class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10"
				>
					<span class="text-white/50">載入中...</span>
				</div>
				<div
					v-else-if="error"
					key="error"
					class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10"
				>
					<span class="text-red-400">{{ error }}</span>
				</div>
				<div
					v-else-if="!chartData || chartData.labels.length === 0"
					key="no-data"
					class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10"
				>
					<span class="text-white/50">尚無資料</span>
				</div>
				<canvas v-else ref="chartCanvas" key="chart" class="absolute inset-0 h-full w-full"></canvas>
			</Transition>
		</div>
		<div class="text-xs tracking-widest text-white">{{ chartTitle }}</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from "vue";
import { Chart, registerables } from "chart.js";
import { useEnvironmentApi } from "~/composables/systems/useEnvironmentApi";
import type { AggregatedBucket } from "~/composables/systems/useEnvironmentApi";
import { getTimeRangeForTrendUTC } from "~/utils/dateUtils";

Chart.register(...registerables);

type GaugeType = "noise" | "aqi" | "temperature";
type Period = "day" | "week" | "month" | "year";

const props = defineProps<{
	type: GaugeType;
	locationId: string | null;
}>();

const periods: { value: Period; label: string }[] = [
	{ value: "day", label: "日" },
	{ value: "week", label: "週" },
	{ value: "month", label: "月" },
	{ value: "year", label: "年" }
];

const selectedPeriod = ref<Period>("day");
const isLoading = ref(false);
const error = ref<string | null>(null);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartContainer = ref<HTMLElement | null>(null);
let chartInstance: Chart | null = null;

const getParameterName = (type: GaugeType): string => {
	if (type === "aqi") return "aqi";
	return type === "noise" ? "noise" : "temperature";
};

const calculateAQI = (
	pm25: number | null | undefined,
	pm10: number | null | undefined
): number | null => {
	if (pm25 === null && pm10 === null) return null;
	if (pm25 === null && pm10 !== null) {
		if (pm10 <= 54) return (50 / 54) * pm10;
		if (pm10 <= 154) return 50 + (50 / 100) * (pm10 - 54);
		if (pm10 <= 254) return 100 + (50 / 100) * (pm10 - 154);
		return null;
	}
	if (pm25 !== null && pm10 === null) {
		if (pm25 <= 12) return (50 / 12) * pm25;
		if (pm25 <= 35.4) return 50 + (50 / 23.4) * (pm25 - 12);
		if (pm25 <= 55.4) return 100 + (50 / 20) * (pm25 - 35.4);
		return null;
	}
	if (pm25 !== null && pm10 !== null) {
		let aqi25: number | null = null;
		let aqi10: number | null = null;
		if (pm25 <= 12) aqi25 = (50 / 12) * pm25;
		else if (pm25 <= 35.4) aqi25 = 50 + (50 / 23.4) * (pm25 - 12);
		else if (pm25 <= 55.4) aqi25 = 100 + (50 / 20) * (pm25 - 35.4);
		if (pm10 <= 54) aqi10 = (50 / 54) * pm10;
		else if (pm10 <= 154) aqi10 = 50 + (50 / 100) * (pm10 - 54);
		else if (pm10 <= 254) aqi10 = 100 + (50 / 100) * (pm10 - 154);
		if (aqi25 === null && aqi10 === null) return null;
		if (aqi25 === null) return aqi10;
		if (aqi10 === null) return aqi25;
		return Math.max(aqi25, aqi10);
	}
	return null;
};

const periodToBucket: Record<Period, AggregatedBucket> = {
	day: "hour",
	week: "day",
	month: "day",
	year: "month"
};

function formatLabel(timestamp: string, period: Period): string {
	const d = new Date(timestamp);
	if (period === "day") return `${d.getUTCHours().toString().padStart(2, "0")}:00`;
	if (period === "year") return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}`;
	return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

const loadHistoricalData = async () => {
	if (!props.locationId) {
		chartData.value = null;
		return;
	}
	isLoading.value = true;
	error.value = null;
	try {
		const { start, end } = getTimeRangeForTrendUTC(selectedPeriod.value);
		const bucket = periodToBucket[selectedPeriod.value];
		const environmentApi = useEnvironmentApi();
		const response = await environmentApi.getReadingsAggregated(props.locationId, {
			bucket,
			startTime: start.toISOString(),
			endTime: end.toISOString()
		});
		const readings = response?.readings ?? [];
		if (!readings?.length) {
			chartData.value = null;
			return;
		}
		const labels: string[] = [];
		const values: number[] = [];
		for (const r of readings) {
			let value: number | null = null;
			if (props.type === "aqi") value = calculateAQI(r.data?.pm25, r.data?.pm10);
			else value = r.data?.[getParameterName(props.type)] ?? null;
			if (value !== null) {
				labels.push(formatLabel(r.timestamp, selectedPeriod.value));
				values.push(Number(Number(value).toFixed(1)));
			}
		}
		chartData.value = labels.length ? { labels, values } : null;
	} catch (err: any) {
		console.error("[SensorTrendChart] 載入失敗:", err);
		error.value = err?.message || "載入資料失敗";
		chartData.value = null;
	} finally {
		isLoading.value = false;
	}
};

const chartData = ref<{ labels: string[]; values: (number | null)[] } | null>(null);

// 圖表標題
const chartTitle = computed(() => {
	switch (props.type) {
		case "noise":
			return "噪音值趨勢圖";
		case "aqi":
			return "AQI指數趨勢圖";
		case "temperature":
			return "溫度趨勢圖";
		default:
			return "";
	}
});

// 繪製圖表
const renderChart = async () => {
	if (!chartCanvas.value || !chartData.value || chartData.value.labels.length === 0) {
		return;
	}

	// 銷毀舊圖表
	if (chartInstance) {
		chartInstance.destroy();
		chartInstance = null;
	}

	const ctx = chartCanvas.value.getContext("2d");
	if (!ctx) return;

	// 確保 Canvas 有正確的尺寸
	const container = chartContainer.value;
	if (container) {
		const rect = container.getBoundingClientRect();
		chartCanvas.value.width = rect.width;
		chartCanvas.value.height = rect.height;
	}

	chartInstance = new Chart(ctx, {
		type: "line",
		data: {
			labels: chartData.value.labels,
			datasets: [
				{
					label: chartTitle.value,
					data: chartData.value.values,
					borderColor: "#ffffff", // 白色數據線，符合附圖
					backgroundColor: "transparent", // 不填充，只顯示線條
					borderWidth: 2,
					fill: false, // 不填充
					tension: 0.4,
					pointRadius: 0,
					pointHoverRadius: 4,
					pointHoverBackgroundColor: "#ffffff",
					pointHoverBorderColor: "#fff",
					pointHoverBorderWidth: 2
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			layout: {
				padding: {
					left: 0,
					right: 0,
					top: 0,
					bottom: 0
				}
			},
			plugins: {
				legend: {
					display: false
				},
				tooltip: {
					enabled: true,
					backgroundColor: "rgba(0, 0, 0, 0.8)",
					titleColor: "#fff",
					bodyColor: "#fff",
					borderColor: "#ffffff",
					borderWidth: 1,
					padding: 8,
					displayColors: false
				}
			},
			scales: {
				x: {
					display: true, // 顯示 X 軸
					grid: {
						display: true,
						color: "rgba(255, 255, 255, 0.3)" // 白色網格線
					},
					border: {
						display: false
					},
					ticks: {
						color: "#ffffff", // 白色標籤
						font: {
							size: 10
						},
						padding: 4
					}
				},
				y: {
					display: true, // 顯示 Y 軸
					grid: {
						display: true,
						color: "rgba(255, 255, 255, 0.3)" // 白色網格線
					},
					border: {
						display: false
					},
					ticks: {
						color: "#ffffff",
						font: { size: 10 },
						padding: 4,
						callback: function (value: number | string) {
							const n = typeof value === "number" ? value : Number(value);
							return Number.isFinite(n) ? Number(n.toFixed(1)) : value;
						}
					},
					beginAtZero: false // 不強制從 0 開始，讓數據範圍更合理
				}
			},
			interaction: {
				intersect: false,
				mode: "index"
			}
		}
	});
};

// 監聽時間範圍與地點，觸發載入（immediate 涵蓋掛載時）
watch(
	[selectedPeriod, () => props.locationId],
	() => {
		if (props.locationId) void loadHistoricalData();
	},
	{ immediate: true }
);

// 監聽資料或 Canvas 變化，重新繪製圖表
watch(
	[chartData, chartCanvas],
	async () => {
		if (chartCanvas.value && chartData.value?.labels?.length) {
			await nextTick();
			await renderChart();
		}
	},
	{ deep: true }
);

// 組件卸載時銷毀圖表
onUnmounted(() => {
	if (chartInstance) {
		chartInstance.destroy();
		chartInstance = null;
	}
});
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

.fade-enter-to,
.fade-leave-from {
	opacity: 1;
}
</style>
