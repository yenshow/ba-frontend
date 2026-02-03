<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all"
		@click="handleClick"
	>
		<div
			class="my-4 flex items-center justify-center bg-white px-2 text-xl 2xl:text-xl w-[36px]"
			style="clip-path: polygon(0 0, 100% calc(0% + 24px), 100% calc(100% - 24px), 0 100%)"
		>
			{{ zone }}
		</div>
		<div class="flex flex-col items-center">
			<!-- 頂部：標題和區域 -->
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ name }}</h3>
			</div>

			<div class="flex items-center gap-2">
				<!-- AQI 儀表 -->
				<div
					class="flex aspect-square h-[100px] w-[100px] flex-col items-center justify-center rounded-full border-2 border-white/80 2xl:h-[140px] 2xl:w-[140px]"
				>
					<div class="ps-[2px] text-2xl tracking-[2px] text-white 2xl:text-3xl">AQI</div>
					<div class="my-1 h-px w-2/3 bg-white/80 2xl:my-2"></div>
					<Transition name="fade" mode="out-in">
						<div :key="aqi ?? 'empty'" class="text-3xl text-white 2xl:text-5xl">{{ aqi ?? "—" }}</div>
					</Transition>
				</div>

				<!-- 噪音值儀表 -->
				<div
					class="flex aspect-square h-[100px] w-[100px] flex-col items-center justify-center rounded-full border-2 border-white/80 2xl:h-[140px] 2xl:w-[140px]"
				>
					<div class="ps-[2px] text-lg tracking-[2px] text-white 2xl:text-2xl">噪音值</div>
					<div class="my-1 h-px w-2/3 bg-white/80 2xl:my-2"></div>
					<Transition name="fade" mode="out-in">
						<div :key="noise ?? 'empty'" class="text-3xl text-white 2xl:text-5xl">{{ noise ?? "--" }}</div>
					</Transition>
				</div>

				<!-- 參數網格（3x3） -->
				<div v-if="!disabled && params && params.length > 0" class="grid grid-cols-3">
					<div
						v-for="param in params"
						:key="param.label"
						class="relative flex flex-col items-center justify-center px-2 py-1 transition-all"
						:class="[getParamBackgroundClass(param), getParamBlinkClass(param)]"
					>
						<!-- 左側黃色邊框線（微微靠內） -->
						<div class="absolute left-1 top-2 h-4/5 w-1 bg-white/30"></div>

						<!-- 數值 -->
						<Transition name="fade" mode="out-in">
							<div
								:key="`${param.label}-${param.value}`"
								class="flex items-baseline gap-1"
							>
								<div
									class="flex min-w-[30px] items-center justify-center text-sm font-semibold text-white 2xl:text-base"
								>
									{{ param.value }}
								</div>
								<div class="text-xs text-white/80">{{ param.unit }}</div>
							</div>
						</Transition>
						<!-- 不透明分隔線 -->
						<div class="my-0.5 h-px w-[90%] bg-white/80"></div>
						<!-- 標籤 -->
						<div class="text-xs font-medium tracking-widest text-white/70 2xl:text-sm">
							{{ param.label }}
						</div>
					</div>
				</div>

				<!-- 無資料或未連接狀態 -->
				<div v-else class="flex min-h-[170px] min-w-[240px] flex-col items-center justify-center py-6">
					<div v-if="disabled" class="text-sm italic text-white/50 2xl:text-base">待連接感測器</div>
					<div v-else class="text-sm text-white/50 2xl:text-base">尚無參數資料</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Param {
	label: string;
	value: string | number;
	unit: string;
	alertClass?: string;
	type?: string; // 參數類型（用於狀態判斷）
	rawValue?: number | null; // 原始數值（用於狀態判斷）
}

interface Props {
	name: string;
	zone: string;
	aqi?: number | null;
	noise?: number | null;
	params?: Param[];
	disabled?: boolean;
	getStatusText?: (type: string, value: number | null) => string; // 狀態文字判斷函數
}

interface Emits {
	(e: "click"): void;
}

const emit = defineEmits<Emits>();

const handleClick = () => {
	emit("click");
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	getStatusText: undefined
});

// 判斷參數狀態類型
const getParamStatusType = (param: Param): "normal" | "warning" | "alarm" => {
	if (!props.getStatusText || !param.type || param.rawValue === undefined) {
		return "normal";
	}

	const statusText = props.getStatusText(param.type, param.rawValue);
	if (statusText === "正常") return "normal";
	if (statusText === "警報") return "alarm";
	return "warning"; // 異常、注意等
};

// 參數背景顏色類別
const getParamBackgroundClass = (param: Param) => {
	const statusType = getParamStatusType(param);
	switch (statusType) {
		case "normal":
			return "bg-transparent"; // 正常：白色 10% 透明度
		case "warning":
			return "bg-[#FFC801]/90"; // 異常：黃色 90% 透明度
		case "alarm":
			return "bg-[#FF0000]/90"; // 警報：紅色 90% 透明度
		default:
			return "bg-transparent";
	}
};

// 參數閃爍動畫類別
const getParamBlinkClass = (param: Param) => {
	const statusType = getParamStatusType(param);
	if (statusType === "alarm") {
		return "blink-fast"; // 警報：快速閃爍（1秒）
	} else if (statusType === "warning") {
		return "blink-slow"; // 異常/警告：慢速閃爍（2秒）
	}
	return ""; // 正常：不閃爍
};
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
