<template>
	<div class="flex flex-row justify-center items-center gap-4 xl:gap-6 2xl:gap-8 h-full py-4 xl:py-6 2xl:py-8 pl-12 xl:pl-0">
		<!-- Temperature Gauge -->
		<div class="relative w-full aspect-square max-w-[200px] 2xl:max-w-[240px]">
			<!-- SVG 弧形指示器 -->
			<svg class="absolute inset-0 w-full h-full transform -rotate-90 z-20" viewBox="0 0 240 240" style="overflow: visible">
				<path :d="arcPath" fill="none" :stroke="temperatureColor" stroke-width="12" stroke-linecap="round" class="transition-all duration-500 ease-out" />
			</svg>

			<!-- Background Circle -->
			<div class="absolute inset-0 w-full h-full rounded-full border-4 border-white flex flex-col items-center justify-center overflow-hidden z-10 space-y-2">
				<!-- 溫度圖標 -->
				<NuxtImg src="/layout/temperature-icon.png" alt="溫度" class="w-16 xl:h-16 2xl:w-20 2xl:h-20" width="80" height="80" />

				<!-- 位置資訊 -->
				<div class="text-sm 2xl:text-base font-light text-white/80 tracking-widest px-2 text-center leading-tight -translate-y-2 2xl:-translate-y-3">
					{{ data.location }}
				</div>
				<div class="h-0.5 w-4/5 mx-auto bg-white/20 -translate-y-2 2xl:-translate-y-3"></div>
				<!-- 溫度數值 -->
				<div class="text-4xl 2xl:text-5xl font-extralight text-white -translate-y-2 2xl:-translate-y-3">
					{{ data.temperature }}
				</div>
			</div>
		</div>

		<!-- Metrics List -->
		<div class="flex flex-col space-y-4 xl:space-y-5 2xl:space-y-6 w-full">
			<div v-for="(metric, index) in data.metrics" :key="index" class="flex items-center space-x-2 2xl:space-x-4">
				<div class="w-16 h-16 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16">
					<NuxtImg :src="getMetricIcon(metric.icon)" :alt="metric.label" class="w-full h-full object-contain" width="64" height="64" />
				</div>
				<div class="flex flex-col text-white">
					<span class="text-lg 2xl:text-xl font-light tracking-wide whitespace-nowrap">{{ metric.label }}</span>
					<span class="text-base 2xl:text-lg font-light tracking-wide whitespace-nowrap">{{ metric.value }} {{ metric.unit }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
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

const props = defineProps<{
	data: EnvironmentData;
}>();

// 計算溫度指示器的顏色
const temperatureColor = computed(() => {
	const temp = props.data.temperature;
	if (temp <= 20) return "#3B82F6"; // 藍色 - 冷
	if (temp <= 28) return "#10B981"; // 綠色 - 舒適
	if (temp <= 30) return "#F59E0B"; // 橙色 - 溫暖
	return "#EF4444"; // 紅色 - 警示
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

// 計算動態弧形的 path
const arcPath = computed(() => {
	const percentage = temperaturePercentage.value;
	const currentAngleRange = (arcAngleRange * percentage) / 100;
	const startAngleRad = (arcStartAngle * Math.PI) / 180;
	const endAngleRad = ((arcStartAngle + currentAngleRange) * Math.PI) / 180;
	const startX = centerX + radius * Math.cos(startAngleRad);
	const startY = centerY + radius * Math.sin(startAngleRad);
	const endX = centerX + radius * Math.cos(endAngleRad);
	const endY = centerY + radius * Math.sin(endAngleRad);
	const largeArcFlag = currentAngleRange > 180 ? 1 : 0;
	return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
});

const getMetricIcon = (iconName: string) => {
	const iconMap: Record<string, string> = {
		temperature: "/layout/temperature.png",
		humidity: "/layout/humidity.png",
		wind: "/layout/wind-speed.png"
	};
	return iconMap[iconName] || "/layout/temperature.png";
};
</script>
