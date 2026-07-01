<template>
	<div class="flex flex-col items-center justify-center" aria-hidden="true">
		<div
			v-for="axis in arrowAxes"
			:key="axis"
			class="elevator-dir-arrow-wrap"
			:class="[sizeClass, axis === 'down' ? '-mt-0.5 2xl:-mt-1' : '']"
		>
			<svg
				class="transition-colors duration-300"
				:class="[
					sizeClass,
					elevatorLedArrowClass(direction, axis),
					isMoving && direction === axis ? `elevator-dir-arrow--active-${axis}` : '',
				]"
				:viewBox="axis === 'up' ? '2 3 20 13' : '2 8 20 13'"
				fill="currentColor"
			>
				<path :d="axis === 'up' ? ARROW_UP_PATH : ARROW_DOWN_PATH" />
			</svg>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ElevatorDirection } from "~/types/elevator"
import { elevatorLedArrowClass } from "~/utils/elevatorDisplayUtils"

const ARROW_UP_PATH = "M10.8 6.2Q12 4.8 13.2 6.2L20.2 15Q21 16 20 16H4Q3 16 3.8 15Z"
const ARROW_DOWN_PATH = "M10.8 17.8Q12 19.2 13.2 17.8L20.2 9Q21 8 20 8H4Q3 8 3.8 9Z"
const arrowAxes = ["up", "down"] as const

interface Props {
	direction?: ElevatorDirection
	isMoving?: boolean
	size?: "md" | "lg"
}

const props = withDefaults(defineProps<Props>(), {
	direction: "idle",
	isMoving: false,
	size: "lg",
})

const sizeClass = computed(() =>
	props.size === "lg" ? "h-7 w-7 2xl:h-16 2xl:w-16" : "h-6 w-6 2xl:h-12 2xl:w-12",
)
</script>
