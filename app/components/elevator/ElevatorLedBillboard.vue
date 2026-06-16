<template>
	<div
		class="elevator-led-screen elevator-led-scanline rounded-2xl border-2 border-white/20 bg-black/25 p-4"
		role="status"
		aria-live="polite"
		:aria-label="statusAriaLabel"
	>
		<p class="text-center text-lg font-semibold text-white/80 2xl:text-xl">即時狀態</p>

		<div class="flex items-center justify-center">
			<div class="flex min-w-[7.5rem] flex-col items-center px-4 2xl:min-w-[10rem] 2xl:px-8">
				<p class="text-sm font-semibold tracking-[0.35em] text-cyan-200/45 2xl:text-base">
					目前樓層
				</p>
				<p
					class="elevator-led-text text-center text-3xl leading-none 2xl:text-7xl"
					:class="digitGlowClass"
				>
					24F
				</p>
			</div>

			<div class="flex flex-col items-center justify-center pr-4 2xl:pr-8" aria-hidden="true">
				<svg
					class="h-7 w-7 shrink-0 transition-all duration-300 2xl:h-16 2xl:w-16"
					:class="arrowLedClass('up')"
					viewBox="2 3 20 13"
					fill="currentColor"
				>
					<path d="M10.8 6.2Q12 4.8 13.2 6.2L20.2 15Q21 16 20 16H4Q3 16 3.8 15Z" />
				</svg>
				<svg
					class="-mt-0.5 h-7 w-7 shrink-0 transition-all duration-300 2xl:-mt-1 2xl:h-16 2xl:w-16"
					:class="arrowLedClass('down')"
					viewBox="2 8 20 13"
					fill="currentColor"
				>
					<path d="M10.8 17.8Q12 19.2 13.2 17.8L20.2 9Q21 8 20 8H4Q3 8 3.8 9Z" />
				</svg>
			</div>

			<div class="flex flex-col items-center px-4 gap-4 2xl:px-8 border-l border-white/10">
				<button
					type="button"
					class="flex h-9 w-full min-w-[6rem] items-center justify-center rounded-full border-2 px-4 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 2xl:h-10 2xl:min-w-[7rem] 2xl:text-base"
					:class="callButtonClass"
					:disabled="isCallElevatorDisabled"
					:aria-label="`呼梯至 ${selectedFloorLabel || '未選樓層'}`"
					@click="emit('call-elevator')"
				>
					呼梯
				</button>

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

interface Props {
	floorText: string
	direction?: ElevatorDirection
	isConnected?: boolean
	statusAriaLabel: string
	deviceHealthLabel: string
	deviceStatusDotClass: string
	isCallElevatorDisabled?: boolean
	selectedFloorLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
	direction: "idle",
	isConnected: false,
	isCallElevatorDisabled: true,
	selectedFloorLabel: "",
})

const emit = defineEmits<{ "call-elevator": [] }>()

const healthBadgeClass = computed(() =>
	props.isConnected
		? "border-white/25 bg-white/10"
		: "blink-slow border-amber-400/50 bg-amber-400/20"
)

const digitGlowClass = computed(() =>
	props.isConnected ? "elevator-led-text--on" : "elevator-led-text--off"
)

const callButtonClass = computed(() =>
	props.isConnected
		? "border-cyan-400/60 bg-cyan-500/70 text-white hover:bg-cyan-400"
		: "border-white/25 bg-white/10 text-white/50"
)

const arrowLedClass = (axis: "up" | "down") => {
	if (!props.isConnected) return "elevator-led-arrow--off"
	if (props.direction === axis) return "elevator-led-arrow--on"
	return "elevator-led-arrow--dim"
}
</script>

<style scoped>
.elevator-led-screen {
	box-shadow:
		inset 0 2px 12px rgba(0, 0, 0, 0.35),
		inset 0 0 20px rgba(34, 211, 238, 0.06);
}

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
		rgba(0, 0, 0, 0.08) 0,
		rgba(0, 0, 0, 0.08) 1px,
		transparent 1px,
		transparent 3px
	);
	opacity: 0.3;
}

.elevator-led-text {
	font-family:
		ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
		monospace;
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	letter-spacing: 0.12em;
}

.elevator-led-text--on {
	color: #67e8f9;
	text-shadow:
		0 0 6px rgba(103, 232, 249, 0.85),
		0 0 16px rgba(34, 211, 238, 0.45);
}

.elevator-led-text--off {
	color: rgba(251, 191, 36, 0.8);
	text-shadow:
		0 0 4px rgba(251, 191, 36, 0.4),
		0 0 10px rgba(245, 158, 11, 0.2);
}

.elevator-led-arrow--on {
	color: #67e8f9;
	filter: drop-shadow(0 0 5px rgba(103, 232, 249, 0.85));
	opacity: 1;
}

.elevator-led-arrow--dim {
	color: rgba(34, 211, 238, 0.35);
	opacity: 0.6;
}

.elevator-led-arrow--off {
	color: rgba(251, 191, 36, 0.4);
	opacity: 0.45;
}
</style>
