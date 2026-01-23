<template>
	<div class="space-y-4">
		<!-- 主要指標（大型圓形儀表） -->
		<div>
			<!-- 熱指數 -->
			<div class="flex flex-col items-center">
				<div class="relative aspect-square w-full max-w-[200px]">
					<!-- SVG 弧形指示器 -->
					<svg
						class="absolute inset-0 z-20 h-full w-full -rotate-90 transform"
						viewBox="0 0 240 240"
						style="overflow: visible"
					>
						<path
							:d="getArcPath('heatIndex')"
							fill="none"
							:stroke="getArcColor('heatIndex')"
							stroke-width="12"
							stroke-linecap="round"
							:stroke-dasharray="getArcLength('heatIndex')"
							:stroke-dashoffset="getArcDashOffset('heatIndex')"
							class="transition-all duration-500 ease-out"
							:style="{ opacity: heatIndex.value !== null ? 1 : 0 }"
						/>
					</svg>
					<div
						class="absolute z-10 flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-white"
					>
						<!-- 標題（頂部） -->
						<div class="flex flex-col items-center border-b-2 border-white mb-1 pb-1 w-[70%]">
							<div class="text-xs font-light tracking-widest text-white">Heat Index</div>
							<div class="text-xl ms-[6px] tracking-[6px] font-semibold text-white 2xl:text-2xl">熱指數</div>
						</div>
						<!-- 數值（中間） -->
						<div class="text-4xl text-white 2xl:text-5xl">
							{{ heatIndex.value !== null ? heatIndex.value.toFixed(1) : "—" }}
						</div>
						<!-- 等級顯示（小圓圈） -->
						<div
							v-if="heatIndex.value !== null"
							class="flex items-center justify-center rounded-full bg-white h-10 w-10"
						>
							<div class="text-black text-2xl">{{ heatIndex.level }}</div>
							<div class="text-black text-[10px]">級</div>
						</div>
					</div>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<!-- 噪音值 -->
				<div class="flex flex-col items-center">
					<div class="relative aspect-square w-full max-w-[160px]">
						<!-- SVG 弧形指示器 -->
						<svg
							class="absolute inset-0 z-20 h-full w-full -rotate-90 transform"
							viewBox="0 0 240 240"
							style="overflow: visible"
						>
							<path
								:d="getArcPath('noise')"
								fill="none"
								:stroke="getArcColor('noise')"
								stroke-width="12"
								stroke-linecap="round"
								:stroke-dasharray="getArcLength('noise')"
								:stroke-dashoffset="getArcDashOffset('noise')"
								class="transition-all duration-500 ease-out"
								:style="{ opacity: sensorData.noise !== null ? 1 : 0 }"
							/>
						</svg>
						<div
							class="absolute z-10 flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-white"
						>
							<!-- 標題（頂部） -->
							<div class="flex flex-col items-center border-b-2 border-white mb-1 pb-1 w-[70%]">
								<div class="text-xs font-light tracking-widest text-white">Noise Level</div>
								<div class="ms-[6px] tracking-[6px] font-semibold text-white text-xl 2xl:text-2xl">噪音值</div>
							</div>
							<!-- 數值（中間） -->
							<div
								class="text-4xl font-light 2xl:text-5xl"
								:class="getNoiseValueColor()"
							>
								{{ sensorData.noise !== null ? Math.round(sensorData.noise) : "—" }}
							</div>
						</div>
					</div>
				</div>

				<!-- PM2.5 -->
				<div class="flex flex-col items-center">
					<div class="relative aspect-square w-full max-w-[160px]">
						<!-- SVG 弧形指示器 -->
						<svg
							class="absolute inset-0 z-20 h-full w-full -rotate-90 transform"
							viewBox="0 0 240 240"
							style="overflow: visible"
						>
							<path
								:d="getArcPath('pm25')"
								fill="none"
								:stroke="getArcColor('pm25')"
								stroke-width="12"
								stroke-linecap="round"
								:stroke-dasharray="getArcLength('pm25')"
								:stroke-dashoffset="getArcDashOffset('pm25')"
								class="transition-all duration-500 ease-out"
								:style="{ opacity: sensorData.pm25 !== null ? 1 : 0 }"
							/>
						</svg>
						<div
							class="absolute z-10 flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-white"
						>
							<!-- 標題（頂部） -->
							<div class="flex flex-col items-center border-b-2 border-white mb-1 pb-1 w-[70%]">
								<div class="text-xs font-light tracking-widest text-white">細懸浮微粒</div>
								<div class="ms-[6px] tracking-[6px] font-semibold text-white text-xl 2xl:text-2xl">PM2.5</div>
							</div>
							<!-- 數值（中間） -->
							<div class="text-4xl font-light text-white 2xl:text-5xl">
								{{ sensorData.pm25 !== null ? Math.round(sensorData.pm25) : "—" }}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 詳細參數（小型卡片） -->
		<div class="grid grid-cols-2 gap-3">
			<EnvironmentParamCardSimple
				v-for="param in displayParams"
				:key="param.type"
				:type="param.type"
				:value="param.value"
				:label="param.label"
				:unit="param.unit"
				:fraction-digits="param.fractionDigits"
				:get-status-class="getStatusClass"
				:get-status-dot-class="getStatusDotClass"
				:get-status-text="getStatusText"
				:get-status-text-class="getStatusTextClass"
				:to-fixed-number="toFixedNumber"
				:level="param.level"
				:show-level="param.showLevel"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import EnvironmentParamCardSimple from "~/components/home/EnvironmentParamCardSimple.vue";
import type { EnvironmentLocation, SensorParameterType } from "~/types/environment";
import type { SensorDeviceModelConfig } from "~/types/device";
import {
	getParameterDisplayName,
	getParameterUnit,
	getParameterFractionDigits
} from "~/utils/sensorUtils";

interface Props {
	location: EnvironmentLocation;
	sensorData: {
		pm25: number | null;
		pm10: number | null;
		tvoc: number | null;
		hcho: number | null;
		humidity: number | null;
		temperature: number | null;
		co2: number | null;
		noise: number | null;
		wind: number | null;
	};
	deviceModelConfig: SensorDeviceModelConfig | null;
}

const props = defineProps<Props>();

// 啟用的參數列表（排除 HCHO 和 TVOC）
const enabledParams = computed(() => {
	return props.location.parameters.filter(
		param => param.enabled && param.type !== "hcho" && param.type !== "tvoc"
	);
});

// 獲取參數的完整標籤（中英文）
const getParameterFullLabel = (type: SensorParameterType): string => {
	const labelMap: Record<SensorParameterType | "heatIndex", string> = {
		pm25: "PM2.5 懸浮微粒",
		pm10: "PM10 懸浮微粒",
		co2: "CO2 二氧化碳",
		noise: "噪音值 Noise Level",
		humidity: "濕度 humidity",
		temperature: "溫度 temperature",
		wind: "風速 wind speed",
		heatIndex: "熱指數 Heat Index",
		tvoc: "TVOC",
		hcho: "HCHO"
	};
	return labelMap[type] || getParameterDisplayName(type);
};

// 顯示的參數列表（包含熱指數）
const displayParams = computed(() => {
	const params: Array<{
		type: string;
		value: number | null;
		label: string;
		unit: string;
		fractionDigits: number;
		level: number;
		showLevel: boolean;
	}> = [];

	// 添加啟用的參數（排除 HCHO 和 TVOC）
	enabledParams.value.forEach(param => {
		params.push({
			type: param.type,
			value: getParamValue(param.type),
			label: getParameterFullLabel(param.type),
			unit: getParameterUnit(param.type),
			fractionDigits: getParameterFractionDigits(param.type),
			level: 0,
			showLevel: false
		});
	});

	// 添加熱指數
	params.push({
		type: "heatIndex",
		value: heatIndex.value.value,
		label: getParameterFullLabel("heatIndex" as SensorParameterType),
		unit: "",
		fractionDigits: 1,
		level: heatIndex.value.level,
		showLevel: true
	});

	return params;
});

// 取得參數值
const getParamValue = (type: SensorParameterType): number | null => {
	return props.sensorData[type] ?? null;
};

// 計算熱指數
const calculateHeatIndex = (temperature: number | null, humidity: number | null) => {
	if (temperature === null || humidity === null) {
		return { value: null, level: 0 };
	}

	// 簡化的熱指數計算（基於溫度和濕度）
	// 使用簡化公式：HI = T + 0.5 * (T - 14.4) * (RH - 50)
	// 其中 T 是溫度（攝氏度），RH 是相對濕度（%）
	let heatIndex = temperature + 0.5 * (temperature - 14.4) * ((humidity - 50) / 100);

	// 如果溫度低於 27°C，熱指數等於溫度
	if (temperature < 27) {
		heatIndex = temperature;
	}

	// 計算等級
	let level = 1;
	if (heatIndex >= 54) {
		level = 5; // 極度危險
	} else if (heatIndex >= 41) {
		level = 4; // 危險
	} else if (heatIndex >= 32) {
		level = 3; // 警告
	} else if (heatIndex >= 27) {
		level = 2; // 注意
	} else {
		level = 1; // 安全
	}

	return {
		value: Math.round(heatIndex * 10) / 10,
		level
	};
};

// 熱指數
const heatIndex = computed(() => {
	return calculateHeatIndex(props.sensorData.temperature, props.sensorData.humidity);
});

// 狀態判斷函數（從環境頁面複製）
const getStatusClass = (type: string, value: number | null): string => {
	if (value === null) return "";

	switch (type) {
		case "pm25":
			if (value <= 25) return "";
			if (value <= 50) return "bg-yellow-500/20";
			return "bg-red-500/20";
		case "pm10":
			if (value <= 50) return "";
			if (value <= 100) return "bg-yellow-500/20";
			return "bg-red-500/20";
		case "humidity":
			if (value >= 30 && value <= 70) return "";
			return "bg-yellow-500/20";
		case "temperature":
			if (value >= 18 && value <= 28) return "";
			if (value >= 15 && value <= 32) return "bg-yellow-500/20";
			return "bg-red-500/20";
		case "co2":
			if (value <= 1000) return "";
			if (value <= 2000) return "bg-yellow-500/20";
			return "bg-red-500/20";
		case "noise":
			if (value <= 60) return "";
			if (value <= 70) return "bg-yellow-500/20";
			return "bg-red-500/20";
		case "wind":
			return "";
		case "heatIndex":
			// 熱指數狀態判斷
			if (value < 27) return "";
			if (value < 32) return "bg-yellow-500/20";
			if (value < 41) return "bg-yellow-500/20";
			return "bg-red-500/20";
		default:
			return "";
	}
};

const getStatusDotClass = (type: string, value: number | null): string => {
	if (value === null) return "bg-gray-400";

	switch (type) {
		case "pm25":
			if (value <= 25) return "bg-green-400";
			if (value <= 50) return "bg-yellow-400";
			return "bg-red-400";
		case "pm10":
			if (value <= 50) return "bg-green-400";
			if (value <= 100) return "bg-yellow-400";
			return "bg-red-400";
		case "humidity":
			if (value >= 30 && value <= 70) return "bg-green-400";
			return "bg-yellow-400";
		case "temperature":
			if (value >= 18 && value <= 28) return "bg-green-400";
			if (value >= 15 && value <= 32) return "bg-yellow-400";
			return "bg-red-400";
		case "co2":
			if (value <= 1000) return "bg-green-400";
			if (value <= 2000) return "bg-yellow-400";
			return "bg-red-400";
		case "noise":
			if (value <= 60) return "bg-green-400";
			if (value <= 70) return "bg-yellow-400";
			return "bg-red-400";
		case "wind":
			return "bg-green-400";
		case "heatIndex":
			// 熱指數狀態判斷
			if (value < 27) return "bg-green-400";
			if (value < 32) return "bg-yellow-400";
			if (value < 41) return "bg-yellow-400";
			return "bg-red-400";
		default:
			return "bg-gray-400";
	}
};

const getStatusText = (type: string, value: number | null): string => {
	if (value === null) return "無資料";

	switch (type) {
		case "pm25":
			if (value <= 25) return "正常";
			if (value <= 50) return "注意";
			return "警報";
		case "pm10":
			if (value <= 50) return "正常";
			if (value <= 100) return "注意";
			return "警報";
		case "humidity":
			if (value >= 30 && value <= 70) return "正常";
			return "注意";
		case "temperature":
			if (value >= 18 && value <= 28) return "正常";
			if (value >= 15 && value <= 32) return "注意";
			return "警報";
		case "co2":
			if (value <= 1000) return "正常";
			if (value <= 2000) return "注意";
			return "警報";
		case "noise":
			if (value <= 60) return "正常";
			if (value <= 70) return "注意";
			return "警報";
		case "wind":
			return "正常";
		case "heatIndex":
			// 熱指數狀態判斷
			if (value < 27) return "正常";
			if (value < 32) return "注意";
			if (value < 41) return "注意";
			return "警報";
		default:
			return "無資料";
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

// 數字格式化函數
const toFixedNumber = (value: number | null, fractionDigits?: number): number => {
	if (value === null) return 0;
	const digits = fractionDigits ?? 0;
	return Number(value.toFixed(digits));
};

// 圓弧計算相關常數
const centerX = 120;
const centerY = 120;
const circleRadius = 116;
const radius = circleRadius * 1.2; // 圓弧半徑為白色圓圈的 1.2 倍
const arcStartAngle = -135; // 起始角度
const arcEndAngle = 135; // 結束角度
const arcAngleRange = arcEndAngle - arcStartAngle; // 270 度

// 獲取參數的最大值（用於計算百分比）
const getMaxValue = (type: string): number => {
	switch (type) {
		case "heatIndex":
			return 54; // 熱指數最大值
		case "noise":
			return 100; // 噪音值最大值
		case "pm25":
			return 100; // PM2.5 最大值
		default:
			return 100;
	}
};

// 獲取參數值
const getParamValueForArc = (type: string): number | null => {
	switch (type) {
		case "heatIndex":
			return heatIndex.value.value;
		case "noise":
			return props.sensorData.noise;
		case "pm25":
			return props.sensorData.pm25;
		default:
			return null;
	}
};

// 計算圓弧的顏色
const getArcColor = (type: string): string => {
	const value = getParamValueForArc(type);
	if (value === null) return "#ffffff";

	switch (type) {
		case "heatIndex":
			// 熱指數：根據等級決定顏色
			if (value < 27) return "#ffffff"; // 白色
			if (value < 32) return "#FFC701"; // 黃色
			if (value < 41) return "#FFC701"; // 黃色
			return "#FF0000"; // 紅色
		case "noise":
			// 噪音值：根據值決定顏色
			if (value <= 60) return "#ffffff"; // 白色
			if (value <= 70) return "#FFC701"; // 黃色
			return "#FF8C00"; // 橙色
		case "pm25":
			// PM2.5：根據值決定顏色
			if (value <= 25) return "#ffffff"; // 白色
			if (value <= 50) return "#FFC701"; // 黃色
			return "#FF0000"; // 紅色
		default:
			return "#ffffff";
	}
};

// 計算圓弧百分比
const getArcPercentage = (type: string): number => {
	const value = getParamValueForArc(type);
	if (value === null) return 0;
	const maxValue = getMaxValue(type);
	return Math.min((value / maxValue) * 100, 100);
};

// 計算完整的弧形 path
const getArcPath = (type: string): string => {
	const startAngleRad = (arcStartAngle * Math.PI) / 180;
	const endAngleRad = (arcEndAngle * Math.PI) / 180;
	const startX = centerX + radius * Math.cos(startAngleRad);
	const startY = centerY + radius * Math.sin(startAngleRad);
	const endX = centerX + radius * Math.cos(endAngleRad);
	const endY = centerY + radius * Math.sin(endAngleRad);
	return `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;
};

// 計算完整弧形的長度
const getArcLength = (type: string): number => {
	return 2 * Math.PI * radius * (arcAngleRange / 360);
};

// 計算 stroke-dashoffset（控制顯示的弧長）
const getArcDashOffset = (type: string): number => {
	const percentage = getArcPercentage(type);
	const arcLength = getArcLength(type);
	// 當 percentage 為 0 時，offset 等於總長度（完全不顯示）
	// 當 percentage 為 100 時，offset 為 0（完全顯示）
	return arcLength * (1 - percentage / 100);
};

// 獲取噪音值的文字顏色
const getNoiseValueColor = (): string => {
	const value = props.sensorData.noise;
	if (value === null) return "text-white";
	if (value <= 60) return "text-white";
	if (value <= 70) return "text-yellow-300";
	return "text-orange-400";
};
</script>
