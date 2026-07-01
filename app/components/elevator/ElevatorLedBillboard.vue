<template>
	<div
		class="elevator-led-panel elevator-led-scanline rounded-2xl border-2 border-white/25 bg-gradient-to-b from-white/[0.12] to-white/[0.04] p-4"
		role="status"
		aria-live="polite"
		:aria-label="statusAriaLabel"
	>
		<p class="text-center text-lg font-semibold text-white/80 2xl:text-xl">即時狀態</p>

		<div class="flex items-center justify-center gap-2 2xl:gap-3">
			<div class="flex shrink-0 flex-col items-center">
				<p class="text-sm font-semibold tracking-[0.35em] text-cyan-200/45 2xl:text-base">
					目前樓層
				</p>
				<ElevatorFloorRollDisplay
					:floor-text="floorText"
					:slide-direction="slideDirection"
					size="lg"
				/>
			</div>

			<ElevatorDirectionArrows
				class="shrink-0"
				:direction="direction"
				:is-moving="isMoving"
				size="lg"
			/>

			<div class="flex shrink-0 flex-col items-center border-l border-white/10 px-3 2xl:px-6">
				<div
					class="flex h-9 w-full min-w-[6rem] items-center justify-center gap-2 rounded-full border px-2 2xl:h-10 2xl:min-w-[7rem]"
					:class="healthBadgeClass"
				>
					<div
						class="h-4 w-4 shrink-0 rounded-full border border-white/60 2xl:h-5 2xl:w-5"
						:class="deviceStatusDotClass"
						aria-hidden="true"
					></div>
					<span class="text-sm text-white 2xl:text-base">{{ deviceHealthLabel }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ElevatorDirection } from "~/types/elevator"
import ElevatorFloorRollDisplay from "~/components/elevator/ElevatorFloorRollDisplay.vue"
import ElevatorDirectionArrows from "~/components/elevator/ElevatorDirectionArrows.vue"

interface Props {
	floorText: string
	direction?: ElevatorDirection
	slideDirection?: "up" | "down" | null
	isConnected?: boolean
	statusAriaLabel: string
	deviceHealthLabel: string
	deviceStatusDotClass: string
	isMoving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	direction: "idle",
	slideDirection: null,
	isConnected: false,
	isMoving: false,
})

const healthBadgeClass = computed(() =>
	props.isConnected
		? "border-white/25 bg-white/10"
		: "blink-slow border-amber-400/50 bg-amber-400/20"
)
</script>

<style scoped>
.elevator-led-scanline {
	position: relative;
	overflow: hidden;
}

.elevator-led-scanline::after {
	content: "";
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: repeating-linear-gradient(
		0deg,
		rgba(255, 255, 255, 0.03) 0,
		rgba(255, 255, 255, 0.03) 1px,
		transparent 1px,
		transparent 3px
	);
	opacity: 0.5;
}
</style>
