<template>
	<div
		class="flex cursor-pointer gap-2 rounded-xl bg-white/10 py-1 transition-all hover:bg-white/15"
		role="button"
		tabindex="0"
		:aria-label="`${location.name}，${statusAriaLabel}`"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<div
			class="my-4 flex w-[36px] items-center justify-center bg-white px-2 text-xl 2xl:text-xl"
			style="clip-path: polygon(0 0, 100% calc(0% + 24px), 100% calc(100% - 24px), 0 100%)"
		>
			{{ regionText }}
		</div>

		<div class="relative flex min-w-0 flex-1 flex-col items-center pr-2">
			<div class="mb-2 flex w-[160px] items-center justify-center border-b border-white/80 pb-px">
				<h3 class="text-base text-white 2xl:text-lg">{{ location.name }}</h3>
			</div>

			<div
				class="flex items-center justify-center text-white py-4"
				role="status"
				aria-live="polite"
			>
				<div class="flex min-w-0 flex-col items-center px-4">
					<p class="text-4xl font-bold leading-none 2xl:text-6xl">24F</p>
				</div>

				<div class="flex flex-col items-center pr-4" aria-hidden="true">
					<svg
						class="h-6 w-6 shrink-0 transition-opacity duration-300 2xl:h-12 2xl:w-12"
						:class="elevatorDirectionArrowClass(direction, 'up')"
						viewBox="2 3 20 13"
						fill="currentColor"
					>
						<path d="M10.8 6.2Q12 4.8 13.2 6.2L20.2 15Q21 16 20 16H4Q3 16 3.8 15Z" />
					</svg>
					<svg
						class="-mt-0.5 h-6 w-6 shrink-0 transition-opacity duration-300 2xl:h-12 2xl:w-12"
						:class="elevatorDirectionArrowClass(direction, 'down')"
						viewBox="2 8 20 13"
						fill="currentColor"
					>
						<path d="M10.8 17.8Q12 19.2 13.2 17.8L20.2 9Q21 8 20 8H4Q3 8 3.8 9Z" />
					</svg>
				</div>

				<div class="flex flex-col items-center gap-2 border-l border-white/20 pl-3 2xl:pl-4">
					<div
						class="flex h-9 w-full min-w-[6rem] items-center justify-center rounded-full border-2 text-sm font-bold 2xl:h-10 2xl:min-w-[7rem] 2xl:text-base"
						:class="callButtonClass"
					>
						呼梯
					</div>

					<div
						class="flex h-9 w-full min-w-[6rem] items-center justify-center gap-2 rounded-full border px-2 2xl:h-10 2xl:min-w-[7rem]"
						:class="healthBadgeClass"
					>
						<div
							class="h-3.5 w-3.5 shrink-0 rounded-full border border-white/60 2xl:h-4 2xl:w-4"
							:class="deviceStatusDotClass"
							aria-hidden="true"
						></div>
						<span class="text-sm text-white 2xl:text-base">{{ deviceHealthLabel }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ElevatorDirection, ElevatorLocation } from "~/types/elevator"
import {
	buildElevatorDeviceStatusLabel,
	buildElevatorStatusAriaLabel,
	elevatorDirectionArrowClass,
	formatElevatorLiveFloorText,
} from "~/utils/elevatorDisplayUtils"

interface Props {
	location: ElevatorLocation & { overviewZoneName?: string | null }
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

const emit = defineEmits<{ click: [locationId: number] }>()

const regionText = computed(() => props.location.overviewZoneName || "未分類")

const deviceHealthLabel = computed(() => buildElevatorDeviceStatusLabel(props.isConnected))

const deviceStatusDotClass = computed(() => (props.isConnected ? "bg-emerald-400" : "bg-amber-400"))

const healthBadgeClass = computed(() =>
	props.isConnected
		? "border-white/25 bg-white/10"
		: "blink-slow border-amber-400/50 bg-amber-400/20"
)

const callButtonClass = computed(() =>
	props.isConnected
		? "border-cyan-400/60 bg-cyan-500/70 text-white"
		: "border-white/25 bg-white/10 text-white/50"
)

const displayFloorText = computed(() =>
	formatElevatorLiveFloorText({
		floorLabel: props.floorLabel,
		currentFloor: props.currentFloor,
	})
)

const statusAriaLabel = computed(() =>
	buildElevatorStatusAriaLabel({
		floorText: displayFloorText.value,
		direction: props.direction,
		isConnected: props.isConnected,
		deviceHealthLabel: true,
	})
)

const handleClick = () => {
	const id = props.location.locationId ?? Number(props.location.id || 0)
	emit("click", id)
}
</script>
