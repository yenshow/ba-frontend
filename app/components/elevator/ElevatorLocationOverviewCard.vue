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

			<div class="flex w-full items-center gap-8 py-4 text-white">
				<div class="flex w-1/2 min-w-0 flex-col gap-3 border-r-2 border-white/50 pr-8">
					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm font-semibold 2xl:text-base">今日事件</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ todayEventCount }}
						</div>
					</div>

					<div class="flex items-center justify-center gap-3 bg-white/20 p-2">
						<div class="text-sm font-semibold 2xl:text-base">樓層範圍</div>
						<div class="w-[80px] bg-black/20 text-center text-xl 2xl:w-[100px] 2xl:text-2xl">
							{{ floorRangeDisplay }}
						</div>
					</div>
				</div>

				<div
					class="flex w-1/2 min-w-0 items-center justify-center"
					role="status"
					aria-live="polite"
				>
					<div
						class="flex min-h-[36px] w-full max-w-[180px] items-center justify-center gap-2 2xl:max-w-[200px]"
					>
						<p class="text-4xl font-bold leading-none text-white 2xl:text-6xl">24F</p>
						<div class="flex flex-col">
							<svg
								class="h-8 w-8 shrink-0 transition-opacity duration-300 2xl:h-12 2xl:w-12"
								:class="elevatorDirectionArrowClass(direction, 'up')"
								viewBox="2 3 20 13"
								fill="currentColor"
							>
								<path d="M10.8 6.2Q12 4.8 13.2 6.2L20.2 15Q21 16 20 16H4Q3 16 3.8 15Z" />
							</svg>
							<svg
								class="-mt-0.5 h-8 w-8 shrink-0 transition-opacity duration-300 2xl:h-12 2xl:w-12"
								:class="elevatorDirectionArrowClass(direction, 'down')"
								viewBox="2 8 20 13"
								fill="currentColor"
							>
								<path d="M10.8 17.8Q12 19.2 13.2 17.8L20.2 9Q21 8 20 8H4Q3 8 3.8 9Z" />
							</svg>
						</div>
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
	buildElevatorStatusAriaLabel,
	elevatorDirectionArrowClass,
	formatElevatorLiveFloorText,
} from "~/utils/elevatorDisplayUtils"
import { resolveElevatorFloorRange } from "~/utils/elevatorFloorConfig"

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

const todayEventCount = computed(() => {
	const n = Number(props.location.todayEventCount)
	return Number.isFinite(n) ? n : 0
})

const floorRangeDisplay = computed(() => {
	const range = resolveElevatorFloorRange(props.location)
	if (!range) return "—"
	return `${range.floorStart} — ${range.floorEnd}`
})

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
		verboseConnection: true,
		todayEventCount: todayEventCount.value,
	})
)

const handleClick = () => {
	const id = props.location.locationId ?? Number(props.location.id || 0)
	emit("click", id)
}
</script>
