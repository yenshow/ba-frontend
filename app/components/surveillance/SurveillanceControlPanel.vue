<template>
	<div
		class="flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-white/30 bg-white/10 p-4 backdrop-blur-sm"
	>
		<!-- 左側：布局選擇 -->
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium text-white xl:text-base 2xl:text-lg">畫面布局：</span>
			<div class="flex gap-1">
				<button
					v-for="layoutOption in layoutOptions"
					:key="layoutOption.value"
					:class="[
						'rounded-lg px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors xl:text-base 2xl:text-lg',
						modelValue === layoutOption.value
							? 'border-2 border-white/50 bg-white/30 text-white'
							: 'border-2 border-white/30 bg-white/10 text-white/80 hover:border-white/40 hover:bg-white/15'
					]"
					@click="$emit('update:modelValue', layoutOption.value)"
				>
					{{ layoutOption.label }}
				</button>
			</div>
		</div>

		<!-- 中間：統計資訊 -->
		<div class="flex items-center gap-4 text-sm xl:text-base 2xl:text-lg">
			<div class="flex items-center gap-2">
				<span class="text-white/70">總攝影機：</span>
				<span class="font-semibold text-white">{{ totalCameras }}</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-white/70">運行中：</span>
				<span class="font-semibold text-green-300">{{ streamingCount }}</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-white/70">監控畫面：</span>
				<span class="font-semibold text-white">{{ viewCount }}/{{ maxViews }}</span>
			</div>
		</div>

		<!-- 右側：操作按鈕 -->
		<div class="flex items-center gap-2">
			<button
				v-if="canStartAll"
				@click="$emit('startAll')"
				class="rounded-lg border-2 border-green-400/50 bg-green-500/30 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:border-green-400/70 hover:bg-green-500/40 xl:text-sm 2xl:text-lg"
			>
				全部啟動
			</button>
			<button
				v-if="canStopAll"
				@click="$emit('stopAll')"
				class="rounded-lg border-2 border-red-400/50 bg-red-500/30 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:border-red-400/70 hover:bg-red-500/40 xl:text-sm 2xl:text-lg"
			>
				全部停止
			</button>
			<button
				@click="$emit('refresh')"
				class="rounded-lg border-2 border-white/30 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/15 xl:text-sm 2xl:text-lg"
			>
				刷新狀態
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { GridLayout } from "~/types/surveillance";

interface Props {
	modelValue: GridLayout;
	totalCameras: number;
	streamingCount: number;
	viewCount: number;
	maxViews: number;
	canStartAll?: boolean;
	canStopAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	canStartAll: false,
	canStopAll: false
});

defineEmits<{
	"update:modelValue": [value: GridLayout];
	startAll: [];
	stopAll: [];
	refresh: [];
}>();

const layoutOptions = [
	{ value: "1" as GridLayout, label: "1 畫面" },
	{ value: "4" as GridLayout, label: "4 畫面" },
	{ value: "9" as GridLayout, label: "9 畫面" }
];
</script>
