<template>
	<div
		class="elevator-floor-roll relative inline-block text-center"
		:class="sizeClass"
		:style="{ '--elevator-floor-step-ms': `${ELEVATOR_FLOOR_STEP_MS}ms` }"
	>
		<span
			class="invisible block leading-none"
			:class="elevatorLedFloorTextClass"
			aria-hidden="true"
		>
			{{ floorText }}
		</span>
		<Transition :name="transitionName">
			<p
				:key="floorText"
				:class="[elevatorLedFloorTextClass, 'elevator-floor-roll__digit leading-none']"
			>
				{{ floorText }}
			</p>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { elevatorLedFloorTextClass } from "~/utils/elevatorDisplayUtils"
import { ELEVATOR_FLOOR_STEP_MS } from "~/utils/realtimeTiming"

interface Props {
	floorText: string
	slideDirection?: "up" | "down" | null
	size?: "md" | "lg"
}

const props = withDefaults(defineProps<Props>(), {
	slideDirection: null,
	size: "lg",
})

const skipTransition = ref(true)

watch(
	() => props.floorText,
	() => {
		if (skipTransition.value) skipTransition.value = false
	},
)

const transitionName = computed(() => {
	if (skipTransition.value) return ""
	return props.slideDirection === "down" ? "elevator-floor-slide-down" : "elevator-floor-slide-up"
})

const sizeClass = computed(() =>
	props.size === "lg" ? "text-3xl 2xl:text-7xl" : "text-4xl 2xl:text-6xl",
)
</script>
