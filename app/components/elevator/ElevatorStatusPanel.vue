<template>
	<div
		class="flex gap-8 items-center justify-center my-16"
		role="status"
		aria-live="polite"
		:aria-label="statusAriaLabel"
	>
		<div class="rounded-xl border border-white/25 bg-cyan-950/30 py-4 px-8 text-center">
			<p class="text-xl font-bold text-white/70 2xl:text-2xl">目前樓層</p>
			<p class="mt-2 text-4xl font-bold text-white 2xl:text-8xl">
				{{ displayFloorText }}
			</p>
		</div>

		<div class="flex flex-col items-center gap-0" aria-hidden="true">
			<svg
				class="h-8 w-8 shrink-0 transition-opacity duration-300 2xl:h-20 2xl:w-20"
				:class="upArrowOpacityClass"
				viewBox="2 3 20 13"
				fill="currentColor"
			>
				<path d="M12 4 22 16H2Z" />
			</svg>
			<svg
				class="-mt-1 h-8 w-8 shrink-0 transition-opacity duration-300 2xl:-mt-2 2xl:h-20 2xl:w-20"
				:class="downArrowOpacityClass"
				viewBox="2 8 20 13"
				fill="currentColor"
			>
				<path d="M12 20 2 8h20Z" />
			</svg>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ElevatorDirection } from "~/types/elevator"

interface Props {
	currentFloor?: number | string | null
	direction?: ElevatorDirection
	isConnected?: boolean
	floorLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
	currentFloor: null,
	direction: "idle",
	isConnected: false,
	floorLabel: undefined,
})

const displayFloorText = computed(() => {
	if (props.floorLabel) return props.floorLabel
	if (props.currentFloor == null || props.currentFloor === "") return "-- F"
	return `${props.currentFloor} F`
})

const isUpActive = computed(() => props.direction === "up")
const isDownActive = computed(() => props.direction === "down")

const upArrowOpacityClass = computed(() =>
	isUpActive.value ? "text-white opacity-100" : "text-white opacity-25"
)
const downArrowOpacityClass = computed(() =>
	isDownActive.value ? "text-white opacity-100" : "text-white opacity-25"
)

const statusAriaLabel = computed(() => {
	const floor = displayFloorText.value
	const dir = props.direction === "up" ? "上行" : props.direction === "down" ? "下行" : "靜止"
	const conn = props.isConnected ? "" : "，待連線"
	return `目前樓層 ${floor}，${dir}${conn}`
})
</script>
