<template>
	<div class="flex flex-row justify-center items-center gap-4 xl:gap-6 2xl:gap-8 h-full py-4 xl:py-6 2xl:py-8 pl-12 xl:pl-8 2xl:pl-12">
		<!-- AQI Gauge -->
		<div class="relative w-full aspect-square max-w-[200px] 2xl:max-w-[240px]">
			<!-- SVG 弧形指示器 -->
			<svg class="absolute inset-0 w-full h-full transform -rotate-90 z-20" viewBox="0 0 240 240" style="overflow: visible">
				<path :d="arcPath" fill="none" :stroke="arcColor" stroke-width="12" stroke-linecap="round" class="transition-all duration-500 ease-out" />
			</svg>

			<!-- Background Circle -->
			<div class="absolute inset-0 w-full h-full rounded-full border-4 border-white flex flex-col items-center justify-center overflow-hidden z-10 space-y-2">
				<!-- AQI 標題 -->
				<div class="text-5xl 2xl:text-6xl font-light text-white tracking-widest">AQI</div>
				<!-- 位置資訊 -->
				<div class="text-sm 2xl:text-base font-light text-white/80 tracking-widest">{{ aqi.location }}</div>
				<div class="h-0.5 w-4/5 mx-auto bg-white/20"></div>
				<!-- AQI 數值（底部） -->
				<div class="text-4xl 2xl:text-5xl font-light text-white z-10">{{ aqi.value }}</div>
			</div>
		</div>

		<!-- Metrics List - 兩列布局 -->
		<div class="grid grid-cols-2 w-full">
			<div v-for="(column, columnIndex) in metricsColumns" :key="columnIndex" class="flex flex-col space-y-4 xl:space-y-5 2xl:space-y-6">
				<div v-for="metric in column" :key="`${metric.label}-${metric.unit}`" class="flex items-center space-x-2 2xl:space-x-4">
					<div class="w-16 h-16 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16">
						<NuxtImg :src="getMetricIcon(metric)" :alt="metric.label" class="w-full h-full object-contain" width="64" height="64" />
					</div>
					<div class="flex flex-col text-white min-w-0 flex-1">
						<span class="text-lg 2xl:text-xl font-light tracking-wide whitespace-nowrap">{{ metric.label }}</span>
						<span class="text-base 2xl:text-lg font-light tracking-wide whitespace-nowrap">{{ metric.value }} {{ metric.unit }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface AQIData {
	value: number;
	location: string;
	metrics: Array<{
		label: string;
		value: number;
		unit: string;
		icon?: string;
	}>;
}

type AQIMetric = AQIData["metrics"][number];

const props = defineProps<{
	aqi: AQIData;
}>();

const metricsColumns = computed(() => {
	const metrics = props.aqi.metrics ?? [];
	const half = Math.ceil(metrics.length / 2);
	return [metrics.slice(0, half), metrics.slice(half)];
});

const iconMap: Record<string, string> = {
	"PM2.5": "/layout/pm2.5.png",
	PM10: "/layout/pm10.png",
	PM1: "/layout/pm1.png",
	CO: "/layout/co.png",
	"CO₂": "/layout/co.png",
	SO2: "/layout/so2.png",
	NO2: "/layout/no2.png",
	HCHO: "/layout/no2.png",
	TVOC: "/layout/so2.png",
	濕度: "/layout/humidity.png"
};

const getMetricIcon = (metric: AQIMetric) => {
	if (metric.icon && iconMap[metric.icon]) {
		return iconMap[metric.icon];
	}
	if (iconMap[metric.label]) {
		return iconMap[metric.label];
	}
	return "/layout/pm2.5.png";
};

// 計算弧形指示器的顏色
const arcColor = computed(() => {
	const value = props.aqi.value;
	if (value < 10) return "#00FFBE";
	if (value <= 50) return "#FFFFFF";
	if (value <= 100) return "#FFC800";
	return "#E23C00";
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
	const value = props.aqi.value;
	const maxValue = 150;
	return Math.min((value / maxValue) * 100, 100);
});

// 計算動態弧形的 path
const arcPath = computed(() => {
	const percentage = arcPercentage.value;
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
</script>
