<template>
	<div class="space-y-3 2xl:space-y-6">
		<!-- 主要指標（大型圓形儀表） -->
		<div>
			<!-- 熱指數 -->
			<div class="flex flex-col items-center">
				<div class="relative aspect-square w-full max-w-[160px] 2xl:max-w-[200px]">
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
							:style="{ opacity: heatIndex.valueC !== null ? 1 : 0 }"
						/>
					</svg>
					<div
						class="absolute z-10 flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-white"
					>
						<!-- 標題（頂部） -->
						<div class="mb-1 flex w-[70%] flex-col items-center border-b-2 border-white pb-1">
							<div class="text-xs font-light tracking-widest text-white">Heat Index</div>
							<div class="ms-[6px] text-xl font-semibold tracking-[6px] text-white 2xl:text-2xl">
								熱指數
							</div>
						</div>
						<!-- 數值（中間）：以級數呈現，避免與溫度重複 -->
						<div class="mb-2 flex items-baseline gap-1 text-white">
							<div class="text-4xl 2xl:text-5xl">
								{{ heatIndex.valueC === null ? "--" : heatIndex.valueC.toFixed(1) }}
							</div>
							<div class="text-lg 2xl:text-xl">°C</div>
						</div>
						<!-- 補充：體感溫度（小圓圈） -->
						<div
							v-if="heatIndex.valueC !== null"
							class="flex items-center justify-center rounded-full bg-white px-1.5 py-1"
						>
							<div class="text-lg text-black 2xl:text-2xl">
								{{ heatIndex.level ? heatIndex.level : "--" }}
							</div>
							<div v-if="heatIndex.level" class="ms-1 text-[10px] text-black/80 2xl:text-xs">級</div>
						</div>
					</div>
				</div>
			</div>
			<div class="grid grid-cols-2">
				<!-- 噪音值 -->
				<div class="flex flex-col items-center">
					<div class="relative aspect-square w-full max-w-[140px] 2xl:max-w-[160px]">
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
							<div class="mb-1 flex w-[70%] flex-col items-center border-b-2 border-white pb-1">
								<div class="text-xs font-light tracking-widest text-white">Noise Level</div>
								<div class="ms-[6px] text-xl font-semibold tracking-[6px] text-white 2xl:text-2xl">
									噪音值
								</div>
							</div>
							<!-- 數值（中間） -->
							<div class="text-4xl 2xl:text-5xl" :class="getNoiseValueColor()">
								{{ getFormattedValue("noise", sensorData.noise) }}
							</div>
						</div>
					</div>
				</div>

				<!-- PM2.5 -->
				<div class="flex flex-col items-center">
					<div class="relative aspect-square w-full max-w-[140px] 2xl:max-w-[160px]">
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
							<div class="mb-1 flex w-[70%] flex-col items-center border-b-2 border-white pb-1">
								<div class="text-xs font-light tracking-widest text-white">細懸浮微粒</div>
								<div class="ms-[6px] text-xl font-semibold tracking-[6px] text-white 2xl:text-2xl">
									PM2.5
								</div>
							</div>
							<!-- 數值（中間） -->
							<div class="text-4xl text-white 2xl:text-5xl">
								{{ getFormattedValue("pm25", sensorData.pm25) }}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 詳細參數（小型卡片） -->
		<div class="grid grid-cols-2 gap-2 2xl:gap-3">
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
import { getHeatIndexDerivedResult } from "~/utils/environmentDerivedMetrics";
import { useAlertRules } from "~/composables/monitoring/useAlertRules";
import type { AlertRule } from "~/types/alert";
import {
	getParameterDisplayName,
	getParameterUnit,
	getParameterFractionDigits,
	formatSensorValue
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

const { getRules, getStatusText: getStatusTextFromRules } = useAlertRules();
const alertRules = ref<AlertRule[]>([]);
const rulesLoaded = ref(false);

const loadAlertRules = async () => {
	if (rulesLoaded.value) return;
	const rules = await getRules("environment", "threshold");
	alertRules.value = rules as AlertRule[];
	rulesLoaded.value = true;
};

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
		value: heatIndex.value.valueC,
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

const getFormattedValue = (type: SensorParameterType, value: number | null): string => {
	return formatSensorValue(type, value, { fallback: "--" });
};

// 熱指數
const heatIndex = computed(() => {
	return getHeatIndexDerivedResult(props.sensorData.temperature, props.sensorData.humidity);
});

onMounted(() => {
	void loadAlertRules();
});

// 狀態判斷函數（以警報規則為準；未載入規則時一律視為正常）
const getStatusClass = (type: string, value: number | null): string => {
	const status = getStatusText(type, value);
	if (status === "警報") return "bg-red-500/20";
	if (status === "異常") return "bg-yellow-500/20";
	return "";
};

const getStatusDotClass = (type: string, value: number | null): string => {
	const status = getStatusText(type, value);
	if (status === "警報") return "bg-red-400";
	if (status === "異常") return "bg-yellow-400";
	if (status === "離線") return "bg-gray-400";
	return "bg-green-400";
};

const getStatusText = (type: string, value: number | null): string => {
	if (value === null) return "離線";

	// 熱指數：使用 derived 的 valueC 做規則判斷（規則仍以 parameter=heatIndex）
	const effectiveValue = type === "heatIndex" ? heatIndex.value.valueC : value;
	if (effectiveValue === null) return "離線";

	if (rulesLoaded.value) {
		try {
			return getStatusTextFromRules(type, effectiveValue, alertRules.value);
		} catch {
			// ignore: 視為正常
		}
	}

	return "正常";
};

const getStatusTextClass = (type: string, value: number | null): string => {
	if (value === null) return "text-white/50";

	const status = getStatusText(type, value);
	if (status === "正常") return "text-green-300";
	if (status === "異常") return "text-yellow-300";
	if (status === "警報") return "text-red-300";
	if (status === "離線") return "text-white/60";
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
			return heatIndex.value.valueC;
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
	const status = getStatusText(type, value);
	if (status === "警報") return "#FF0000";
	if (status === "異常") return "#FFC701";
	return "#ffffff";
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
	const status = getStatusText("noise", value);
	if (status === "警報") return "text-red-300";
	if (status === "異常") return "text-yellow-300";
	return "text-white";
};
</script>
