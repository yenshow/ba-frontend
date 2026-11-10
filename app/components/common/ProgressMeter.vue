<template>
	<div
		class="overflow-hidden rounded-full bg-white/15"
		:class="barHeightClass"
		role="progressbar"
		:aria-valuenow="percent ?? undefined"
		aria-valuemin="0"
		aria-valuemax="100"
		:aria-label="ariaLabel"
	>
		<div
			v-if="percent != null"
			class="h-full min-w-[0.5rem] rounded-full transition-[width] duration-300 ease-out"
			:class="fillClass"
			:style="{ width: `${displayWidth}%` }"
		/>
		<div
			v-else
			class="h-full w-1/4 animate-pulse rounded-full bg-cyan-300/50"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(
	defineProps<{
		/** 0–100；null 顯示不確定脈衝 */
		percent?: number | null
		/** warning／stalled 用琥珀，其餘青色 */
		tone?: "default" | "warning"
		ariaLabel?: string
		size?: "sm" | "md"
	}>(),
	{
		percent: null,
		tone: "default",
		ariaLabel: "進度",
		size: "md",
	},
)

const barHeightClass = computed(() => (props.size === "sm" ? "h-2" : "h-2.5"))

const fillClass = computed(() =>
	props.tone === "warning" ? "bg-amber-300" : "bg-cyan-300",
)

const displayWidth = computed(() => {
	const p = Number(props.percent)
	if (!Number.isFinite(p) || p <= 0) return 2
	return Math.min(100, Math.max(2, p))
})
</script>
