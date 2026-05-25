<template>
	<div class="space-y-2 px-4 text-center">
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
					v-else-if="loadStatus === 'error'"
					key="error"
					class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10"
				>
					<span class="text-red-400">{{ errorMessage }}</span>
				</div>
				<div
					v-else-if="loadStatus === 'no_data'"
					key="no-data"
					class="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-white/10"
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
import {
	useEnvironmentTrendSeries,
	type TrendGaugeType,
	type TrendPeriod,
	type TrendLoadStatus
} from "~/composables/systems/environment/useEnvironmentTrendSeries";

Chart.register(...registerables);

const props = defineProps<{
	type: TrendGaugeType;
	locationId: string | number | null;
	/** 父層 hydrate 後遞增，強制重載趨勢 */
	refreshKey?: number;
}>();

const periods: { value: TrendPeriod; label: string }[] = [
	{ value: "day", label: "日" },
	{ value: "week", label: "週" },
	{ value: "month", label: "月" },
	{ value: "year", label: "年" }
];

const selectedPeriod = ref<TrendPeriod>("day");
const isLoading = ref(false);
const loadStatus = ref<TrendLoadStatus>("no_data");
const errorMessage = ref<string | null>(null);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartContainer = ref<HTMLElement | null>(null);
const chartData = ref<{ labels: string[]; values: number[] } | null>(null);
let chartInstance: Chart | null = null;

const { loadTrend } = useEnvironmentTrendSeries();

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

const loadHistoricalData = async () => {
	const locId = props.locationId != null && props.locationId !== "" ? props.locationId : null;
	if (!locId) {
		chartData.value = null;
		loadStatus.value = "no_data";
		return;
	}

	isLoading.value = true;
	errorMessage.value = null;

	try {
		const result = await loadTrend(props.type, locId, selectedPeriod.value);
		if (result.status === "loading") return;

		loadStatus.value = result.status;
		errorMessage.value = result.errorMessage;
		if (result.status === "ok") {
			chartData.value = { labels: result.labels, values: result.values };
		} else {
			chartData.value = null;
		}
	} finally {
		isLoading.value = false;
	}
};

const renderChart = async () => {
	if (!chartCanvas.value || !chartData.value || chartData.value.labels.length === 0) {
		return;
	}

	if (chartInstance) {
		chartInstance.destroy();
		chartInstance = null;
	}

	const ctx = chartCanvas.value.getContext("2d");
	if (!ctx) return;

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
					borderColor: "#ffffff",
					backgroundColor: "transparent",
					borderWidth: 2,
					fill: false,
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
			layout: { padding: { left: 0, right: 0, top: 0, bottom: 0 } },
			plugins: {
				legend: { display: false },
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
					display: true,
					grid: { display: true, color: "rgba(255, 255, 255, 0.3)" },
					border: { display: false },
					ticks: { color: "#ffffff", font: { size: 10 }, padding: 4 }
				},
				y: {
					display: true,
					grid: { display: true, color: "rgba(255, 255, 255, 0.3)" },
					border: { display: false },
					ticks: {
						color: "#ffffff",
						font: { size: 10 },
						padding: 4,
						callback(value: number | string) {
							const n = typeof value === "number" ? value : Number(value);
							return Number.isFinite(n) ? Number(n.toFixed(1)) : value;
						}
					},
					beginAtZero: false
				}
			},
			interaction: { intersect: false, mode: "index" }
		}
	});
};

watch(
	[selectedPeriod, () => props.locationId, () => props.refreshKey],
	() => {
		if (props.locationId != null && props.locationId !== "") {
			void loadHistoricalData();
		}
	},
	{ immediate: true }
);

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

onUnmounted(() => {
	if (chartInstance) {
		chartInstance.destroy();
		chartInstance = null;
	}
});
</script>
