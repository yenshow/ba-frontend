<template>
	<div class="flex h-full flex-col justify-end space-y-4">
		<!-- 儀表區域 -->
		<div class="flex flex-col items-center space-y-4">
			<div class="relative aspect-square w-full" :class="gaugeSizeClass">
				<!-- SVG 弧形指示器 -->
				<svg
					class="absolute inset-0 z-20 h-full w-full -rotate-90 transform"
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
						class="transition-all duration-500 ease-out"
						:style="{ opacity: isDataReady ? 1 : 0 }"
					/>
				</svg>

				<!-- 圓形儀表 -->
				<div
					class="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-end rounded-full border-4 border-white pb-4"
				>
					<div :class="valueSizeClass">
						{{ displayValue }}
					</div>
					<div v-if="unit" :class="unitSizeClass">
						{{ unit }}
					</div>
					<div v-else :class="unitSizeClass">--</div>
					<div class="my-2 h-px w-3/4 bg-white/80"></div>
					<div :class="titleSizeClass">{{ title }}</div>
				</div>
			</div>
		</div>

		<!-- 趨勢圖區域 -->
		<SensorTrendChart :type="type" :location-id="locationId || null" />
	</div>
</template>

<script setup lang="ts">
import SensorTrendChart from "./SensorTrendChart.vue";

type GaugeType = "noise" | "aqi" | "temperature";
type GaugeSize = "normal" | "large";

interface Props {
	type: GaugeType;
	value: number | null;
	size?: GaugeSize; // 預設為 "normal"，中間的 AQI 可以使用 "large"
	locationId?: string | null; // 地點 ID，用於載入趨勢圖資料
}

const props = withDefaults(defineProps<Props>(), {
	size: "normal"
});

// 統一的尺寸配置
const sizeConfig = computed(() => {
	if (props.size === "large") {
		return {
			gauge: "max-w-[180px] 2xl:max-w-[220px]",
			value: "text-5xl text-white 2xl:text-6xl",
			unit: "text-xl text-white/80 2xl:text-2xl",
			title: "text-2xl text-white 2xl:text-4xl tracking-[6px] ps-[6px]"
		};
	}
	return {
		gauge: "max-w-[140px] 2xl:max-w-[180px]",
		value: "text-4xl text-white 2xl:text-5xl",
		unit: "text-lg text-white/80 2xl:text-xl",
		title: "text-lg text-white 2xl:text-xl tracking-[4px] ps-[4px]"
	};
});

// 為了保持模板簡潔，提供個別的 computed（從統一配置中取得）
const gaugeSizeClass = computed(() => sizeConfig.value.gauge);
const valueSizeClass = computed(() => sizeConfig.value.value);
const unitSizeClass = computed(() => sizeConfig.value.unit);
const titleSizeClass = computed(() => sizeConfig.value.title);

// 趨勢圖標題
const trendChartTitle = computed(() => {
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

// 根據類型計算顯示的標題
const title = computed(() => {
	switch (props.type) {
		case "noise":
			return "噪音值";
		case "aqi":
			return "AQI";
		case "temperature":
			return "溫度";
		default:
			return "";
	}
});

// 根據類型計算顯示的單位
const unit = computed(() => {
	switch (props.type) {
		case "noise":
			return "dB";
		case "aqi":
			return null; // AQI 沒有單位，顯示 "--"
		case "temperature":
			return "°C";
		default:
			return null;
	}
});

// 根據類型格式化顯示值
const displayValue = computed(() => {
	if (props.value === null) return "—";

	switch (props.type) {
		case "noise":
			return Math.round(props.value);
		case "aqi":
			return Math.round(props.value);
		case "temperature":
			return props.value.toFixed(1);
		default:
			return props.value;
	}
});

// 計算弧形指示器的顏色
const arcColor = computed(() => {
	const value = props.value;
	if (value === null) return "#00ffb4"; // 預設綠色

	switch (props.type) {
		case "noise":
			// 噪音值顏色邏輯
			if (value <= 60) return "#00ffb4"; // 綠色 - 正常
			if (value <= 70) return "#FFC701"; // 黃色 - 警告
			return "#FF0000"; // 紅色 - 警報

		case "aqi":
			// AQI 顏色邏輯
			if (value < 10) return "#001Eff"; // 藍色
			if (value <= 50) return "#00ffb4"; // 綠色 - 正常
			if (value <= 100) return "#FFC701"; // 黃色 - 警告
			return "#FF0000"; // 紅色 - 警報

		case "temperature":
			// 溫度顏色邏輯
			if (value <= 20) return "#001Eff"; // 藍色 - 冷
			if (value <= 25) return "#00ffb4"; // 綠色 - 舒適
			if (value <= 30) return "#FFC701"; // 橙色 - 溫暖
			return "#FF0000"; // 紅色 - 警示

		default:
			return "#00ffb4";
	}
});

// 圓心座標和半徑計算
const centerX = 120;
const centerY = 120;
const circleRadius = 116;
const radius = circleRadius * 1.2; // 圓弧半徑為白色圓圈的 1.2 倍

// 圓弧的角度範圍（最大 270 度，從 -135° 到 135°）
const arcStartAngle = -135;
const arcEndAngle = 135;
const arcAngleRange = arcEndAngle - arcStartAngle; // 270 度

// 根據類型和值計算弧長百分比
const arcPercentage = computed(() => {
	const value = props.value;
	if (value === null) return 0;

	switch (props.type) {
		case "noise":
			// 噪音值範圍：0-100 dB，最大值 100
			const maxNoise = 100;
			return Math.min((value / maxNoise) * 100, 100);

		case "aqi":
			// AQI 範圍：0-150，最大值 150
			const maxAQI = 150;
			return Math.min((value / maxAQI) * 100, 100);

		case "temperature":
			// 溫度範圍：0-50°C，最大值 50
			const maxTemp = 50;
			return Math.min((value / maxTemp) * 100, 100);

		default:
			return 0;
	}
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
const isDataReady = computed(() => {
	return props.value !== null && props.value >= 0;
});
</script>
