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
			<div
				v-if="isLoading"
				class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10"
			>
				<span class="text-white/50">載入中...</span>
			</div>
			<div
				v-else-if="error"
				class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10"
			>
				<span class="text-red-400">{{ error }}</span>
			</div>
			<div
				v-else-if="!chartData || chartData.labels.length === 0"
				class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10"
			>
				<span class="text-white/50">尚無資料</span>
			</div>
			<canvas v-else ref="chartCanvas" class="h-full w-full"></canvas>
		</div>
		<div class="text-xs tracking-widest text-white">{{ chartTitle }}</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { Chart, registerables } from "chart.js";
import { useEnvironmentApi } from "~/composables/systems/useEnvironmentApi";

// 註冊 Chart.js 組件
Chart.register(...registerables);

type GaugeType = "noise" | "aqi" | "temperature";
type Period = "day" | "week" | "month" | "year";

interface Props {
	type: GaugeType;
	locationId: string | null;
}

const props = defineProps<Props>();

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

// 取得對應的參數名稱
const getParameterName = (type: GaugeType): string => {
	switch (type) {
		case "noise":
			return "noise";
		case "aqi":
			// AQI 是計算值，需要從 pm25 和 pm10 計算
			return "aqi";
		case "temperature":
			return "temperature";
		default:
			return "";
	}
};

// 計算 AQI 值
const calculateAQI = (
	pm25: number | null | undefined,
	pm10: number | null | undefined
): number | null => {
	if (pm25 === null && pm10 === null) return null;
	if (pm25 === null && pm10 !== null) {
		// 只用 PM10 計算
		if (pm10 <= 54) return (50 / 54) * pm10;
		if (pm10 <= 154) return 50 + (50 / 100) * (pm10 - 54);
		if (pm10 <= 254) return 100 + (50 / 100) * (pm10 - 154);
		return null;
	}
	if (pm25 !== null && pm10 === null) {
		// 只用 PM2.5 計算
		if (pm25 <= 12) return (50 / 12) * pm25;
		if (pm25 <= 35.4) return 50 + (50 / 23.4) * (pm25 - 12);
		if (pm25 <= 55.4) return 100 + (50 / 20) * (pm25 - 35.4);
		return null;
	}
	if (pm25 !== null && pm10 !== null) {
		// 計算兩者的 AQI，取最大值
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

// 取得時間範圍
const getTimeRange = (period: Period): { startTime: Date; endTime: Date } => {
	const endTime = new Date();
	const startTime = new Date();

	switch (period) {
		case "day":
			startTime.setHours(0, 0, 0, 0);
			break;
		case "week":
			startTime.setDate(endTime.getDate() - 7);
			startTime.setHours(0, 0, 0, 0);
			break;
		case "month":
			startTime.setMonth(endTime.getMonth() - 1);
			startTime.setHours(0, 0, 0, 0);
			break;
		case "year":
			startTime.setFullYear(endTime.getFullYear() - 1);
			startTime.setHours(0, 0, 0, 0);
			break;
	}

	return { startTime, endTime };
};

// 載入歷史資料
const loadHistoricalData = async () => {
	if (!props.locationId) {
		chartData.value = null;
		return;
	}

	isLoading.value = true;
	error.value = null;

	try {
		const { startTime, endTime } = getTimeRange(selectedPeriod.value);
		const environmentApi = useEnvironmentApi();

		const response = await environmentApi.getReadings(props.locationId, {
			startTime: startTime.toISOString(),
			endTime: endTime.toISOString(),
			limit: 1000
		});

		// 處理資料：支援多種回應格式（直接格式或包裝格式）
		const readings = response.readings || (response as any).data?.readings || [];

		if (!readings || !Array.isArray(readings) || readings.length === 0) {
			chartData.value = null;
			isLoading.value = false;
			return;
		}

		// 根據類型提取數值
		const rawData: Array<{ timestamp: Date; value: number | null }> = readings
			.map(reading => {
				const date = new Date(reading.timestamp);
				let value: number | null = null;

				if (props.type === "aqi") {
					value = calculateAQI(reading.data.pm25, reading.data.pm10);
				} else {
					const paramName = getParameterName(props.type);
					const rawValue = reading.data[paramName as keyof typeof reading.data];
					value = typeof rawValue === "number" ? rawValue : null;
				}

				return { timestamp: date, value };
			})
			.filter(item => item.value !== null); // 過濾掉 null 值

		// 根據時間範圍聚合資料
		let aggregatedData: Array<{ label: string; value: number; timestamp: Date }> = [];

		switch (selectedPeriod.value) {
			case "day":
				// 按小時聚合（取每小時最後一個值）
				const hourlyMap = new Map<string, { value: number; timestamp: Date }>();
				rawData.forEach(item => {
					const hourKey = `${item.timestamp.getHours().toString().padStart(2, "0")}:00`;
					// 建立該小時的標準時間戳（只保留小時，分鐘秒歸零）
					const hourTimestamp = new Date(item.timestamp);
					hourTimestamp.setMinutes(0, 0, 0);
					hourlyMap.set(hourKey, { value: item.value!, timestamp: hourTimestamp });
				});
				aggregatedData = Array.from(hourlyMap.entries())
					.sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
					.map(([label, data]) => ({ label, value: data.value, timestamp: data.timestamp }));
				break;

			case "week":
				// 按日聚合（取每日最後一個值）
				const dailyMap = new Map<string, { value: number; timestamp: Date }>();
				rawData.forEach(item => {
					const dayKey = `${item.timestamp.getMonth() + 1}/${item.timestamp.getDate()}`;
					// 建立該日的標準時間戳（只保留日期，時間歸零）
					const dayTimestamp = new Date(item.timestamp);
					dayTimestamp.setHours(0, 0, 0, 0);
					dailyMap.set(dayKey, { value: item.value!, timestamp: dayTimestamp });
				});
				aggregatedData = Array.from(dailyMap.entries())
					.sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
					.map(([label, data]) => ({ label, value: data.value, timestamp: data.timestamp }));
				break;

			case "month":
				// 按日顯示
				const monthDailyMap = new Map<string, { value: number; timestamp: Date }>();
				rawData.forEach(item => {
					const dayKey = `${item.timestamp.getMonth() + 1}/${item.timestamp.getDate()}`;
					// 建立該日的標準時間戳（只保留日期，時間歸零）
					const dayTimestamp = new Date(item.timestamp);
					dayTimestamp.setHours(0, 0, 0, 0);
					monthDailyMap.set(dayKey, { value: item.value!, timestamp: dayTimestamp });
				});
				aggregatedData = Array.from(monthDailyMap.entries())
					.sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
					.map(([label, data]) => ({ label, value: data.value, timestamp: data.timestamp }));
				break;

			case "year":
				// 按月顯示
				const monthlyMap = new Map<string, { value: number; timestamp: Date }>();
				rawData.forEach(item => {
					const monthKey = `${item.timestamp.getFullYear()}/${item.timestamp.getMonth() + 1}`;
					// 建立該月的標準時間戳（只保留年月，日期和時間歸零）
					const monthTimestamp = new Date(item.timestamp.getFullYear(), item.timestamp.getMonth(), 1);
					monthlyMap.set(monthKey, { value: item.value!, timestamp: monthTimestamp });
				});
				aggregatedData = Array.from(monthlyMap.entries())
					.sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
					.map(([label, data]) => ({ label, value: data.value, timestamp: data.timestamp }));
				break;
		}

		chartData.value = {
			labels: aggregatedData.map(item => item.label),
			values: aggregatedData.map(item => item.value)
		};
	} catch (err: any) {
		console.error("[SensorTrendChart] 載入歷史資料失敗:", err);
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

// 根據類型取得顏色
const getChartColor = (type: GaugeType): string => {
	switch (type) {
		case "noise":
			return "#00ffb4";
		case "aqi":
			return "#00ffb4";
		case "temperature":
			return "#00ffb4";
		default:
			return "#00ffb4";
	}
};

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
						color: "#ffffff", // 白色標籤
						font: {
							size: 10
						},
						padding: 4,
						// 自動計算刻度，符合附圖的數值範圍顯示
						callback: function (value) {
							return value;
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

// 監聽時間範圍和地點變化
watch(
	[selectedPeriod, () => props.locationId],
	() => {
		if (props.locationId) {
			void loadHistoricalData();
		}
	},
	{ immediate: false }
);

// 監聽資料或 Canvas 變化，重新繪製圖表
watch(
	[chartData, chartCanvas],
	async () => {
		if (chartCanvas.value && chartData.value && chartData.value.labels.length > 0) {
			await nextTick();
			await renderChart();
		}
	},
	{ deep: true }
);

// 組件掛載時載入資料
onMounted(() => {
	void loadHistoricalData();
});

// 組件卸載時銷毀圖表
onUnmounted(() => {
	if (chartInstance) {
		chartInstance.destroy();
		chartInstance = null;
	}
});
</script>
