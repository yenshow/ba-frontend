<template>
	<div
		class="relative flex items-center justify-between rounded-xl px-3 py-2 transition-all"
		:class="[backgroundClass, blinkAnimationClass]"
	>
		<!-- 參數名稱（中文和英文）- 左側 -->
		<div class="text-xs text-white/80 2xl:text-sm">
			{{ label }}
		</div>

		<!-- 數值和單位 - 右側 -->
		<div class="flex items-baseline gap-1">
			<div class="text-xl font-medium text-white 2xl:text-2xl">
				{{ displayValue }}
			</div>
			<div v-if="!showLevel" class="text-xs text-white/70 2xl:text-sm">{{ unit }}</div>
			<div v-if="showLevel" class="text-xs text-white/70 2xl:text-sm">/{{ levelText }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
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
	if (props.value === null) return "—";
	return props.toFixedNumber(props.value, props.fractionDigits ?? 0);
});

const statusText = computed(() => props.getStatusText(props.type, props.value));

// 判斷狀態類型
const statusType = computed<"normal" | "warning" | "alarm">(() => {
	const text = statusText.value;
	if (text === "正常") return "normal";
	if (text === "警報") return "alarm";
	return "warning"; // 異常、注意等
});

// 背景顏色類別（根據狀態動態改變）
const backgroundClass = computed(() => {
	switch (statusType.value) {
		case "normal":
			return "bg-white/10"; // 正常：白色 10% 透明度
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
