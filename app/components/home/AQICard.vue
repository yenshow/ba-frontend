<template>
	<div
		class="flex h-full flex-row items-center justify-center gap-6 py-6 pl-8 2xl:gap-8 2xl:py-8 2xl:pl-12"
	>
		<!-- AQI Gauge -->
		<div class="relative aspect-square w-full max-w-[200px] 2xl:max-w-[240px]">
			<!-- SVG 弧形指示器 -->
			<svg
				class="absolute inset-0 z-10 h-full w-full -rotate-90"
				viewBox="0 0 240 240"
				style="overflow: visible"
			>
				<path
					:d="fullArcPath"
					fill="none"
					:stroke="arcColor"
					stroke-width="12"
					stroke-linecap="round"
					:stroke-dasharray="arcLength"
					:stroke-dashoffset="arcDashOffset"
					class="transition-[stroke-dashoffset,opacity] duration-500 ease-out"
					:style="{ opacity: isDataReady ? 1 : 0 }"
				/>
			</svg>

			<!-- Background Circle -->
			<div
				class="absolute inset-0 z-20 flex h-full w-full flex-col items-center justify-center space-y-2 overflow-hidden rounded-full border-4 border-white"
			>
				<!-- AQI 標題 -->
				<div class="text-5xl font-light tracking-widest text-white 2xl:text-6xl min-w-[100px] 2xl:min-w-[120px] text-center">AQI</div>
				<!-- 位置資訊 -->
				<div class="ps-2">
					<FilterDropdown
						v-model="selectedLocationId"
						:options="options"
						:placeholder="placeholder"
						:textSize="textSize"
					/>
				</div>
				<div class="mx-auto h-0.5 w-4/5 bg-white/20"></div>
				<!-- AQI 數值（底部） -->
				<div class="z-10 text-4xl font-light text-white 2xl:text-5xl">{{ aqi.value }}</div>
			</div>
		</div>

		<!-- Metrics List - 兩列布局 -->
		<div class="grid w-full grid-cols-2">
			<div
				v-for="(column, columnIndex) in metricsColumns"
				:key="columnIndex"
				class="flex flex-col space-y-4 2xl:space-y-6"
			>
				<div
					v-for="metric in column"
					:key="`${metric.label}-${metric.unit}`"
					class="flex items-center space-x-2 2xl:space-x-4"
				>
					<div class="h-14 w-14 2xl:h-16 2xl:w-16">
						<NuxtImg
							:src="getMetricIcon(metric)"
							:alt="metric.label"
							class="h-full w-full object-contain"
							width="64"
							height="64"
						/>
					</div>
					<div class="flex min-w-0 flex-1 flex-col text-white">
						<span class="whitespace-nowrap text-lg font-light tracking-wide 2xl:text-xl">{{
							metric.label
						}}</span>
						<span class="whitespace-nowrap text-base font-light tracking-wide 2xl:text-lg"
							>{{ metric.value }} {{ metric.unit }}</span
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import FilterDropdown from "~/components/common/FilterDropdown.vue";

interface AQIData {
	value: number | string;
	location: string;
	metrics: Array<{
		label: string;
		value: number | string;
		unit: string;
		icon?: string;
	}>;
}

type AQIMetric = AQIData["metrics"][number];

interface FilterOption {
	value: string;
	label: string;
}

const props = withDefaults(
	defineProps<{
		aqi: AQIData;
		modelValue: string;
		options: FilterOption[];
		placeholder?: string;
		textSize?: string;
	}>(),
	{
		placeholder: "請選擇地點",
		textSize: "text-sm 2xl:text-base"
	}
);

const emit = defineEmits<{
	"update:modelValue": [value: string];
}>();

const selectedLocationId = computed({
	get: () => props.modelValue,
	set: (value: string) => emit("update:modelValue", value)
});

const metricsColumns = computed(() => {
	const metrics = props.aqi.metrics ?? [];
	const half = Math.ceil(metrics.length / 2);
	return [metrics.slice(0, half), metrics.slice(half)];
});

const iconMap: Record<string, string> = {
	"PM2.5": "/environment/PM2.5.png",
	PM10: "/environment/PM10.png",
	CO2: "/environment/CO2.png",
	"CO₂": "/environment/CO2.png",
	HCHO: "/environment/HCHO.png",
	TVOC: "/environment/TVOC.png",
	temperature: "/environment/temperature.png",
	濕度: "/environment/humidity.png",
	humidity: "/environment/humidity.png",
	wind: "/environment/wind-speed.png",
	風速: "/environment/wind-speed.png",
	noise: "/environment/noise.png",
	噪音: "/environment/noise.png"
};

const getMetricIcon = (metric: AQIMetric) => {
	if (metric.icon && iconMap[metric.icon]) {
		return iconMap[metric.icon];
	}
	if (iconMap[metric.label]) {
		return iconMap[metric.label];
	}
	return "/environment/PM2.5.png";
};

const numericAqi = computed((): number | null => {
	const value = props.aqi.value;
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return value;
});

// 計算弧形指示器的顏色
const arcColor = computed(() => {
	const value = numericAqi.value;
	if (value === null) return "#6b7280";
	if (value < 10) return "#001Eff";
	if (value <= 50) return "#00ffb4";
	if (value <= 100) return "#FFC701";
	return "#FF0000";
});

// 圓心座標和半徑計算
// 白色圓圈實際半徑 = (240 - 8) / 2 = 116px
const centerX = 120;
const centerY = 120;
const circleRadius = 116;
const radius = circleRadius * 1.2; // 圓弧半徑為白色圓圈的 1.2 倍

// 圓弧的角度範圍（最大 270 度，從 -135° 到 135°）
const arcStartAngle = -135;
const arcEndAngle = 135;
const arcAngleRange = arcEndAngle - arcStartAngle; // 270 度

// 根據 AQI 值計算弧長百分比（0-100%，最大值 150）
const arcPercentage = computed(() => {
	const value = numericAqi.value;
	if (value === null) return 0;
	const maxValue = 150;
	return Math.min((value / maxValue) * 100, 100);
});

// 計算完整的弧形 path（用於 stroke-dasharray）
const fullArcPath = computed(() => {
	const startAngleRad = (arcStartAngle * Math.PI) / 180;
	const endAngleRad = (arcEndAngle * Math.PI) / 180;
	const startX = centerX + radius * Math.cos(startAngleRad);
	const startY = centerY + radius * Math.sin(startAngleRad);
	const endX = centerX + radius * Math.cos(endAngleRad);
	const endY = centerY + radius * Math.sin(endAngleRad);
	return `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;
});

// 計算完整弧形的長度（用於 stroke-dasharray）
const arcLength = computed(() => {
	// 270 度的圓弧長度 = 2 * π * radius * (270 / 360)
	return 2 * Math.PI * radius * (arcAngleRange / 360);
});

// 計算 stroke-dashoffset（控制顯示的弧長）
const arcDashOffset = computed(() => {
	const percentage = arcPercentage.value;
	// 當 percentage 為 0 時，offset 等於總長度（完全不顯示）
	// 當 percentage 為 100 時，offset 為 0（完全顯示）
	return arcLength.value * (1 - percentage / 100);
});

// 檢查資料是否已準備好（避免初始渲染時的動畫問題）
const isDataReady = computed(() => numericAqi.value !== null);
</script>
