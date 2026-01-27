<template>
	<div
		class="relative flex flex-col rounded-xl px-2 py-3 transition-all"
		:class="[backgroundClass, blinkAnimationClass]"
	>
		<!-- 警告條（設備異常時顯示） -->
		<div
			v-if="props.deviceError"
			class="blink-animation absolute bottom-0 left-0 right-0 h-2 rounded-b-xl"
			:style="warningBarStyle"
		></div>

		<!-- 內容區域：水平排版（由左到右） -->
		<div class="relative z-10 flex flex-1 items-center gap-2">
			<!-- 左側：圖標 -->
			<div class="relative flex h-16 w-16 shrink-0 items-center justify-center 2xl:h-20 2xl:w-20">
				<Transition name="fade">
					<NuxtImg
						v-if="iconSrc"
						key="icon"
						:src="iconSrc"
						:alt="label"
						class="absolute inset-0 h-16 w-16 object-contain 2xl:h-20 2xl:w-20"
						width="80"
						height="80"
						quality="90"
						loading="lazy"
					/>
				</Transition>
			</div>

			<!-- 分隔線 -->
			<div class="h-20 w-[6px] bg-white/20"></div>

			<!-- 中間：參數標籤、數值和單位 -->
			<div class="flex flex-col justify-center">
				<!-- 參數標籤 -->
				<div class="mb-2 font-medium tracking-widest text-white text-lg">{{ label }}</div>

				<!-- 數值和單位 -->
				<div class="flex items-baseline gap-2">
					<div
						class="flex min-w-[80px] items-center justify-center rounded-lg bg-white/10 px-3 py-1 text-2xl text-white 2xl:text-3xl"
					>
						{{ displayValue }}
					</div>
					<div class="text-sm text-white/80 2xl:text-base">{{ unit }}</div>
				</div>
			</div>

			<!-- 右側：狀態指示器（圓點 + 狀態文字） -->
			<div
				class="absolute right-0 top-0 flex shrink-0 items-center gap-1 rounded-lg border border-white/30 p-[2px]"
			>
				<div
					class="h-3 w-3 rounded-full border-2 border-white 2xl:h-4 2xl:w-4"
					:style="statusDotStyle"
				></div>
				<div class="text-sm font-medium text-white 2xl:text-base" :class="statusTextClass">
					{{ statusText }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	type: string;
	value: number | null;
	iconSrc?: string;
	label: string;
	unit: string;
	fractionDigits?: number;
	deviceError?: boolean; // 設備本身是否異常（用於顯示黃黑警告條）
	// 注意：getStatusClass 和 getStatusDotClass 已不再使用，組件內部根據 statusText 決定樣式
	// 保留這些 props 僅為了向後兼容，但實際上不會被使用
	getStatusClass?: (type: string, value: number | null) => string;
	getStatusDotClass?: (type: string, value: number | null) => string;
	getStatusText: (type: string, value: number | null) => string;
	getStatusTextClass: (type: string, value: number | null) => string;
	toFixedNumber: (value: number | null, fractionDigits?: number) => number;
}

const props = withDefaults(defineProps<Props>(), {
	iconSrc: "",
	deviceError: false
});

const displayValue = computed(() => {
	if (props.value === null) return "--";
	return props.toFixedNumber(props.value, props.fractionDigits ?? 0);
});

const statusText = computed(() => props.getStatusText(props.type, props.value));
const statusTextClass = computed(() => props.getStatusTextClass(props.type, props.value));

// 判斷狀態類型
const statusType = computed<"normal" | "warning" | "alarm">(() => {
	const text = statusText.value;
	if (text === "正常") return "normal";
	if (text === "警報") return "alarm";
	return "warning"; // 異常、注意等
});

// 背景顏色類別
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

// 警告條樣式（黃黑條紋）
const warningBarStyle = computed(() => {
	return {
		backgroundImage:
			"repeating-linear-gradient(90deg, #FFC801 0px, #FFC801 10px, #000000 10px, #000000 20px)"
	};
});

// 狀態燈內聯樣式
const statusDotStyle = computed(() => {
	const status = statusType.value;

	if (status === "normal") {
		// 正常：綠色 #00FFB5，白色線條 2pt
		return {
			backgroundColor: "#00FFB5"
		};
	} else if (status === "warning") {
		// 注意/異常：黃色 #FFC701，白色線條約 2pt
		return {
			backgroundColor: "#FFC701"
		};
	} else if (status === "alarm") {
		// 警報：紅色 #FF0000，100% 透明度，白色線條約 2pt
		return {
			backgroundColor: "#FF0000"
		};
	}

	// 無資料時使用灰色
	return {
		backgroundColor: "#9CA3AF"
	};
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

/* 設備異常警告條：中等速度閃爍（1.5秒） */
.blink-animation {
	animation: blink 1.5s ease-in-out infinite;
}

/* 數值異常/警告：慢速閃爍（2秒） */
.blink-slow {
	animation: blink 2s ease-in-out infinite;
}

/* 數值警報：快速閃爍（1秒） */
.blink-fast {
	animation: blink 1s ease-in-out infinite;
}

/* Transition 淡入淡出效果 */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
	opacity: 1;
}
</style>
