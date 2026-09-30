<template>
	<button
		type="button"
		class="relative flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left transition-all hover:brightness-110"
		:class="[
			backgroundClass,
			blinkAnimationClass,
			selected && 'ring-2 ring-sky-400/90',
			showHazardBar && 'pb-5',
		]"
		:aria-label="`更換主顯示指標：${label}`"
		:aria-pressed="selected"
		@click="emit('select', type)"
	>
		<div
			v-if="showHazardBar"
			class="offline-hazard-bar absolute inset-x-0 bottom-0 h-2.5 rounded-b-xl"
			:style="warningBarStyle"
			aria-hidden="true"
		/>

		<div class="h-16 w-16 shrink-0 2xl:h-20 2xl:w-20">
			<NuxtImg
				v-if="iconSrc"
				:src="iconSrc"
				:alt="label"
				class="h-full w-full object-contain"
				width="80"
				height="80"
				quality="90"
				loading="lazy"
			/>
		</div>

		<div class="w-1.5 self-stretch bg-white/20" aria-hidden="true" />

		<div class="min-w-0 flex-1">
			<div class="flex items-center justify-between gap-2">
				<div class="truncate text-lg font-medium tracking-widest text-white">
					{{ label }}
				</div>
				<div class="flex shrink-0 items-center gap-1 rounded-lg border border-white/30 p-0.5">
					<div
						class="h-3 w-3 rounded-full border-2 border-white 2xl:h-4 2xl:w-4"
						:style="statusDotStyle"
					/>
					<div class="text-sm font-medium text-white 2xl:text-base" :class="statusTextClass">
						{{ statusText }}
					</div>
				</div>
			</div>

			<div class="mt-2 flex items-baseline gap-2">
				<div
					class="flex min-w-[80px] items-center justify-center rounded-lg bg-white/10 px-3 py-1 text-2xl text-white 2xl:text-3xl"
				>
					{{ displayValue }}
				</div>
				<div class="text-sm text-white/80 2xl:text-base">{{ unit }}</div>
			</div>
		</div>
	</button>
</template>

<script setup lang="ts">
import {
	normalizeMonitoringStatusText,
	monitoringStatusTextToUiStatus,
	monitoringUiStatusToBlinkClass,
	monitoringUiStatusToCardBackgroundClass,
	monitoringUiStatusToDotColor,
} from "~/utils/monitoringStatus"

interface Props {
	type: string
	value: number | null
	iconSrc?: string
	label: string
	unit: string
	fractionDigits?: number
	deviceError?: boolean
	selected?: boolean
	getStatusClass?: (type: string, value: number | null) => string
	getStatusDotClass?: (type: string, value: number | null) => string
	getStatusText: (type: string, value: number | null) => string
	getStatusTextClass: (type: string, value: number | null) => string
	toFixedNumber: (value: number | null, fractionDigits?: number) => number | string
}

const props = withDefaults(defineProps<Props>(), {
	iconSrc: "",
	deviceError: false,
	selected: false,
})

const emit = defineEmits<{
	select: [type: string]
}>()

const displayValue = computed(() => {
	if (props.deviceError || props.value === null) return "--"
	return props.toFixedNumber(props.value, props.fractionDigits ?? 0)
})

const statusText = computed(() =>
	normalizeMonitoringStatusText(props.getStatusText(props.type, props.value))
)
const statusTextClass = computed(() => props.getStatusTextClass(props.type, props.value))

const uiStatus = computed(() => {
	if (props.deviceError) return "offline" as const
	return monitoringStatusTextToUiStatus(statusText.value)
})

const showHazardBar = computed(() => uiStatus.value === "offline")

const backgroundClass = computed(() =>
	monitoringUiStatusToCardBackgroundClass(uiStatus.value)
)

const blinkAnimationClass = computed(() =>
	uiStatus.value === "offline" ? "" : monitoringUiStatusToBlinkClass(uiStatus.value)
)

const warningBarStyle = computed(() => ({
	backgroundImage:
		"repeating-linear-gradient(90deg, #FFC801 0px, #FFC801 10px, #000000 10px, #000000 20px)",
	backgroundSize: "40px 100%",
}))

const statusDotStyle = computed(() => ({
	backgroundColor: monitoringUiStatusToDotColor(uiStatus.value),
}))
</script>
