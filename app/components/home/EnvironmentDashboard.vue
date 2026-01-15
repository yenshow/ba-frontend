<template>
	<div class="space-y-4">
		<!-- 主要指標（大型圓形儀表） -->
		<div class="grid grid-cols-3 gap-4">
			<!-- 熱指數 -->
			<div class="flex flex-col items-center">
				<div class="relative aspect-square w-full max-w-[140px] 2xl:max-w-[180px]">
					<div
						class="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-end rounded-full border-4 border-white pb-4"
					>
						<div class="text-4xl text-white 2xl:text-5xl">
							{{ heatIndex.value !== null ? heatIndex.value.toFixed(1) : "—" }}
						</div>
						<div class="text-lg text-white/80 2xl:text-xl"></div>
						<div class="my-2 h-px w-3/4 bg-white/80"></div>
						<div class="ps-[4px] text-lg tracking-[4px] text-white 2xl:text-xl">熱指數</div>
					</div>
				</div>
				<div class="mt-2 text-center text-white">
					<div class="text-xs text-white/70 xl:text-sm">Level {{ heatIndex.level }}</div>
				</div>
			</div>

			<!-- 噪音值 -->
			<div class="flex flex-col items-center">
				<div class="relative aspect-square w-full max-w-[140px] 2xl:max-w-[180px]">
					<div
						class="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-end rounded-full border-4 border-white pb-4"
					>
						<div class="text-4xl text-white 2xl:text-5xl">
							{{ sensorData.noise !== null ? Math.round(sensorData.noise) : "—" }}
						</div>
						<div class="text-lg text-white/80 2xl:text-xl">dB</div>
						<div class="my-2 h-px w-3/4 bg-white/80"></div>
						<div class="ps-[4px] text-lg tracking-[4px] text-white 2xl:text-xl">噪音值</div>
					</div>
				</div>
			</div>

			<!-- PM2.5 -->
			<div class="flex flex-col items-center">
				<div class="relative aspect-square w-full max-w-[140px] 2xl:max-w-[180px]">
					<div
						class="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-end rounded-full border-4 border-white pb-4"
					>
						<div class="text-4xl text-white 2xl:text-5xl">
							{{ sensorData.pm25 !== null ? Math.round(sensorData.pm25) : "—" }}
						</div>
						<div class="text-lg text-white/80 2xl:text-xl">µg/m³</div>
						<div class="my-2 h-px w-3/4 bg-white/80"></div>
						<div class="ps-[4px] text-lg tracking-[4px] text-white 2xl:text-xl">PM2.5</div>
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
</script>
