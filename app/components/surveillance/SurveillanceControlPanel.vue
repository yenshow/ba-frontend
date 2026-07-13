<template>
	<div
		class="flex items-center justify-between gap-2 2xl:gap-4 rounded-lg border-2 border-white/30 bg-white/10 p-4 backdrop-blur-sm"
	>
		<div class="flex items-center gap-2">
			<div class="flex gap-1">
				<button
					v-for="layoutOption in layoutOptions"
					:key="layoutOption.value"
					:class="[
						'rounded-lg px-3 py-1.5 transition-colors text-base 2xl:text-lg',
						modelValue === layoutOption.value
							? 'border-2 border-white/50 bg-white/20 text-white'
							: 'border-2 border-white/30 bg-black/20 text-white/80 hover:border-white/40 hover:bg-white/15',
					]"
					@click="$emit('update:modelValue', layoutOption.value)"
				>
					{{ layoutOption.label }}
				</button>
			</div>
		</div>

		<div class="flex items-center gap-2 2xl:gap-4 text-base 2xl:text-lg">
			<div class="flex items-center gap-1 2xl:gap-2">
				<span class="text-white/70">攝影機：</span>
				<span class="font-semibold text-white">{{ totalCameras }}</span>
			</div>
			<div class="flex items-center gap-1 2xl:gap-2">
				<span class="text-white/70">監控畫面：</span>
				<span class="font-semibold text-white">{{ viewCount }}/{{ maxViews }}</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				v-if="modelValue === '9' || modelValue === '16'"
				type="button"
				@click="$emit('fullscreen')"
				class="rounded-lg border-2 border-white/30 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/15 xl:text-sm 2xl:text-lg"
			>
				全螢幕
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { GridLayout } from "~/types/surveillance"

interface Props {
	modelValue: GridLayout
	totalCameras: number
	viewCount: number
	maxViews: number
}

defineProps<Props>()

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
</script>
