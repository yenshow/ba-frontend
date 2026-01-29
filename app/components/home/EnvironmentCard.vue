<template>
	<div
		class="flex h-full flex-row items-center justify-center gap-4 py-4 pl-12 xl:gap-6 xl:py-6 xl:pl-0 2xl:gap-8 2xl:py-8"
	>
		<!-- Temperature Gauge -->
		<div class="relative aspect-square w-full max-w-[200px] 2xl:max-w-[240px]">
			<!-- SVG 弧形指示器 -->
			<svg
				class="absolute inset-0 z-10 h-full w-full -rotate-90 transform"
				viewBox="0 0 240 240"
				style="overflow: visible"
			>
				<path
					:d="fullArcPath"
					fill="none"
					:stroke="temperatureColor"
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
				<!-- 溫度圖標 -->
				<NuxtImg
					src="/environment/temperature-icon.png"
					alt="溫度"
					class="w-16 xl:h-16 2xl:h-20 2xl:w-20"
					width="80"
					height="80"
				/>

				<!-- 位置資訊 -->
				<div class="ps-2 -translate-y-3">
					<FilterDropdown
						v-model="selectedLocationId"
						:options="options"
						:placeholder="placeholder"
						:textSize="textSize"
					/>
				</div>
				<div class="mx-auto h-0.5 w-4/5 -translate-y-2 bg-white/20 2xl:-translate-y-3"></div>
				<!-- 溫度數值 -->
				<div class="-translate-y-2 text-4xl font-extralight text-white 2xl:-translate-y-3 2xl:text-5xl">
					{{ data.temperature }}
				</div>
			</div>
		</div>

		<!-- Metrics List -->
		<div class="flex w-full flex-col space-y-4 2xl:space-y-6">
			<div
				v-for="(metric, index) in data.metrics"
				:key="index"
				class="flex items-center space-x-2 2xl:space-x-4"
			>
				<div class="h-14 w-14 2xl:h-16 2xl:w-16">
					<NuxtImg
						:src="getMetricIcon(metric.icon)"
						:alt="metric.label"
						class="h-full w-full object-contain"
						width="64"
						height="64"
					/>
				</div>
				<div class="flex flex-col text-white">
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
</template>

<script setup lang="ts">
import FilterDropdown from "~/components/common/FilterDropdown.vue";

interface EnvironmentData {
	temperature: number;
	location: string;
	metrics: Array<{
		label: string;
		value: number;
		unit: string;
		icon: string;
	}>;
}

interface FilterOption {
	value: string;
	label: string;
}

const props = withDefaults(
	defineProps<{
		data: EnvironmentData;
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

// 計算溫度指示器的顏色（純色，無漸變）
const temperatureColor = computed(() => {
	const temp = props.data.temperature;

	if (temp <= 20) return "#3B82F6"; // 藍色 - 冷
	if (temp <= 28) return "#10B981"; // 綠色 - 舒適
	if (temp <= 30) return "#F59E0B"; // 橙色 - 溫暖
	if (temp <= 50) return "#EF4444"; // 紅色 - 警示
	return "#DC2626"; // 深紅色 - 極高溫
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

// 根據溫度值計算弧長百分比（0-100%，最大值 50°C）
const temperaturePercentage = computed(() => {
	const temp = props.data.temperature;
	const maxTemp = 50;
	return Math.min((temp / maxTemp) * 100, 100);
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
	const percentage = temperaturePercentage.value;
	// 當 percentage 為 0 時，offset 等於總長度（完全不顯示）
	// 當 percentage 為 100 時，offset 為 0（完全顯示）
	return arcLength.value * (1 - percentage / 100);
});

// 檢查資料是否已準備好（避免初始渲染時的動畫問題）
const isDataReady = computed(() => {
	return props.data.temperature >= 0;
});

const getMetricIcon = (iconName: string) => {
	const iconMap: Record<string, string> = {
		temperature: "/environment/temperature.png",
		humidity: "/environment/humidity.png",
		wind: "/environment/wind-speed.png",
		"CO₂": "/environment/CO2.png",
		"PM2.5": "/environment/PM2.5.png"
	};
	return iconMap[iconName] || "/environment/temperature.png";
};
</script>
