<template>
	<div
		class="flex items-center justify-between gap-2 rounded-lg border-2 border-white/30 bg-white/10 p-4 backdrop-blur-sm 2xl:gap-4"
	>
		<div class="flex gap-1" role="group" aria-label="監控畫面布局">
			<button
				v-for="layoutOption in layoutOptions"
				:key="layoutOption.value"
				type="button"
				:class="[
					'rounded-lg px-3 py-1.5 text-base transition-colors 2xl:text-lg',
					modelValue === layoutOption.value
						? 'border-2 border-white/50 bg-white/20 text-white'
						: 'border-2 border-white/30 bg-black/20 text-white/80 hover:border-white/40 hover:bg-white/15',
				]"
				:aria-pressed="modelValue === layoutOption.value"
				:aria-label="layoutOption.label"
				@click="$emit('update:modelValue', layoutOption.value)"
			>
				{{ layoutOption.label }}
			</button>
		</div>

		<div class="flex items-center gap-2 text-base 2xl:gap-4 2xl:text-lg">
			<div class="flex items-center gap-1 2xl:gap-2">
				<span class="text-white/70">攝影機：</span>
				<span class="font-semibold text-white">{{ totalCameras }}</span>
			</div>
			<div class="flex items-center gap-1 2xl:gap-2">
				<span class="text-white/70">監控畫面：</span>
				<span class="font-semibold text-white">{{ viewCount }}/{{ maxViews }}</span>
			</div>
		</div>

		<button
			type="button"
			aria-label="全螢幕"
			class="rounded-lg border-2 border-white/30 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/15 xl:text-sm 2xl:text-lg"
			@click="$emit('fullscreen')"
		>
			全螢幕
		</button>
	</div>
</template>

<script setup lang="ts">
import type { GridLayout } from "~/types/surveillance"

interface Props {
	modelValue: GridLayout
	totalCameras: number
	viewCount: number
}

const props = defineProps<Props>()

defineEmits<{
	"update:modelValue": [value: GridLayout]
	fullscreen: []
}>()

const layoutOptions = [
	{ value: "1" as GridLayout, label: "1 畫面" },
	{ value: "4" as GridLayout, label: "4 畫面" },
	{ value: "9" as GridLayout, label: "9 畫面" },
	{ value: "16" as GridLayout, label: "16 畫面" },
]

const maxViews = computed(() => parseInt(props.modelValue, 10))
</script>
