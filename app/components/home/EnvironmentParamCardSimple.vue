<template>
	<div
		class="relative flex items-center transition-all"
		:class="[backgroundClass, blinkAnimationClass]"
	>
		<!-- 參數名稱（中文和英文）- 左側 -->
		<div
			class="flex w-[100px] flex-col items-center justify-center bg-white/10 py-3 leading-none text-white/80 2xl:w-[120px]"
		>
			<!-- 根據參數類型決定顯示順序 -->
			<div class="absolute left-1 top-1/2 h-[80%] w-2 -translate-y-1/2 bg-white/30"></div>
			<template v-if="labelOrder === 'chinese-first'">
				<div class="ms-[4px] text-[16px] tracking-[4px] 2xl:text-[24px]">{{ chineseLabel }}</div>
				<div class="text-xs text-white/70 2xl:text-sm">{{ englishLabel }}</div>
			</template>
			<template v-else>
				<div class="ms-[4px] text-[16px] tracking-[4px] 2xl:text-[24px]">{{ englishLabel }}</div>
				<div class="text-xs text-white/70 2xl:text-sm">{{ chineseLabel }}</div>
			</template>
		</div>

		<!-- 數值和單位 - 右側 -->
		<div class="mx-3 flex flex-1 items-end justify-center gap-1 border-b border-white/30 pb-2">
			<div class="text-2xl text-white 2xl:text-3xl">
				{{ displayValue }}
			</div>
			<div v-if="!showLevel" class="text-sm text-white/70 2xl:text-base">{{ unit }}</div>
			<div v-if="showLevel" class="text-sm text-white/70 2xl:text-base">/{{ levelText }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	normalizeMonitoringStatusText,
	monitoringStatusTextToUiStatus
} from "~/utils/monitoringStatus";

interface Props {
	type: string;
	value: number | null;
	label: string;
	unit: string;
	fractionDigits?: number;
	getStatusClass: (type: string, value: number | null) => string;
	getStatusDotClass: (type: string, value: number | null) => string;
	getStatusText: (type: string, value: number | null) => string;
	getStatusTextClass: (type: string, value: number | null) => string;
	toFixedNumber: (value: number | null, fractionDigits?: number) => number;
	level?: number; // 熱指數等級
	showLevel?: boolean; // 是否顯示等級
}

const props = withDefaults(defineProps<Props>(), {
	fractionDigits: 0,
	level: 0,
	showLevel: false
});

const displayValue = computed(() => {
	if (props.value === null) return "--";
	return props.toFixedNumber(props.value, props.fractionDigits ?? 0);
});

const statusText = computed(() =>
	normalizeMonitoringStatusText(props.getStatusText(props.type, props.value))
);

// 判斷狀態類型（無資料時用中性樣式，不顯示黃/紅警示）
const statusType = computed<"normal" | "warning" | "alarm" | "offline">(() => {
	const ui = monitoringStatusTextToUiStatus(statusText.value);
	if (ui === "offline") return "offline";
	if (ui === "alarm") return "alarm";
	if (ui === "abnormal") return "warning";
	return "normal";
});

// 背景顏色類別（根據狀態動態改變）
const backgroundClass = computed(() => {
	switch (statusType.value) {
		case "normal":
			return "bg-white/10"; // 正常：白色 10% 透明度
		case "offline":
			return "bg-white/10";
		case "warning":
			return "bg-[#FFC801]/90"; // 異常：黃色 90% 透明度
		case "alarm":
			return "bg-[#FF0000]/90"; // 警報：紅色 90% 透明度
		default:
			return "bg-white/10";
	}
});

// 閃爍動畫類別（根據狀態級別設置不同的閃爍頻率）
const blinkAnimationClass = computed(() => {
	if (statusType.value === "alarm") {
		return "blink-fast"; // 警報：快速閃爍（1秒）
	} else if (statusType.value === "warning") {
		return "blink-slow"; // 異常/警告：慢速閃爍（2秒）
	}
	return ""; // 正常：不閃爍
});

// 熱指數等級文字
const levelText = computed(() => {
	if (props.level > 0) {
		return `${props.level}級`;
	}
	return "";
});

// 解析 label，分離中文和英文
const parseLabel = (label: string): { chinese: string; english: string } => {
	// 使用正則表達式分離中文字符和英文字符
	const chineseRegex = /[\u4e00-\u9fa5]+/g;
	const englishRegex = /[A-Za-z0-9.\s]+/g;

	const chineseMatches = label.match(chineseRegex) || [];
	const englishMatches = label.match(englishRegex) || [];

	const chinese = chineseMatches.join(" ").trim();
	const english = englishMatches.join(" ").trim();

	return { chinese, english };
};

// 根據參數類型決定顯示順序
const labelOrder = computed<"chinese-first" | "english-first">(() => {
	// 根據 type 決定順序
	// pm25, pm10, co2: 英文在上
	// noise, humidity, temperature, wind, heatIndex: 中文在上
	const englishFirstTypes = ["pm25", "pm10", "co2"];

	if (englishFirstTypes.includes(props.type)) {
		return "english-first";
	}
	return "chinese-first";
});

// 解析後的標籤
const parsedLabel = computed(() => parseLabel(props.label));
const chineseLabel = computed(() => parsedLabel.value.chinese);
const englishLabel = computed(() => parsedLabel.value.english);
</script>

<style scoped>
/* 閃爍動畫 */
@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

/* 數值異常/警告：慢速閃爍（2秒） */
.blink-slow {
	animation: blink 2s ease-in-out infinite;
}

/* 數值警報：快速閃爍（1秒） */
.blink-fast {
	animation: blink 1s ease-in-out infinite;
}
</style>
