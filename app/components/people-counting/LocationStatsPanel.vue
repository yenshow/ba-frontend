<template>
	<div class="mx-auto grid w-full max-w-6xl grid-cols-3 gap-6 rounded-lg text-white xl:gap-8">
		<div
			v-for="card in cards"
			:key="card.label"
			class="flex flex-col items-center justify-center gap-4 monitoring-chip-bg py-4"
		>
			<div class="whitespace-nowrap text-[24px] font-semibold leading-none 2xl:text-[36px]">
				{{ card.label }}
			</div>
			<div
				class="vehicle-stats-value flex min-w-[120px] items-center justify-center bg-black/20 text-[48px] leading-none 2xl:min-w-[200px] 2xl:text-[96px]"
			>
				{{ card.value ?? 0 }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
	entryCount?: number
	exitCount?: number
	currentCount?: number
	/** 自訂三欄（時段簽到等）；有值時優先於 entry/exit/current */
	items?: Array<{ label: string; value: number }>
}>()

const cards = computed(() => {
	if (props.items && props.items.length > 0) return props.items
	return [
		{ label: "進場人數", value: props.entryCount ?? 0 },
		{ label: "出場人數", value: props.exitCount ?? 0 },
		{ label: "在場人數", value: props.currentCount ?? 0 },
	]
})
</script>
