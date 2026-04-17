<template>
	<div
		class="flex flex-col justify-between rounded-xl border border-black/50 bg-white/75 p-4 text-black/90"
	>
		<div class="pb-3 text-center text-2xl font-semibold ms-[4px] tracking-[4px] text-black/80">
			{{ label }}
		</div>
		<div class="border-t border-black/50">
			<div class="flex items-end justify-center gap-1.5 py-4">
				<div class="text-4xl font-semibold leading-none text-black">
					{{ displayValue }}
				</div>
				<div v-if="unit" class="pb-0.5 text-base font-semibold text-black/80">
					{{ unit }}
				</div>
			</div>
		</div>
		<div
			class="w-fit mx-auto px-2 flex items-center justify-center gap-2 text-xs text-black/80 rounded-full border border-[#323232]"
		>
			<span class="h-4 w-4 rounded-full" :class="statusDotClass" />
			<span class="text-lg font-semibold">{{ statusText }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	monitoringUiStatusToDotClass,
	monitoringUiStatusToText,
	type MonitoringUiStatus,
} from "~/utils/monitoringStatus"

interface Props {
	label: string
	value: number | null
	unit?: string
	status?: MonitoringUiStatus
	statusLabel?: string
}

const props = defineProps<Props>()

const normalizeNumber = (v: number) => {
	if (!Number.isFinite(v)) return "--"
	const rounded = Math.round(v * 10) / 10
	const s = String(rounded)
	return s.endsWith(".0") ? s.slice(0, -2) : s
}

const displayValue = computed(() => {
	if (props.value === null) return "--"
	return normalizeNumber(props.value)
})

const computedStatus = computed<NonNullable<Props["status"]>>(() => {
	if (props.status) return props.status
	return props.value === null ? "offline" : "normal"
})

const statusText = computed(() => {
	if (props.statusLabel) return props.statusLabel
	return monitoringUiStatusToText(computedStatus.value)
})

const statusDotClass = computed(() => {
	return monitoringUiStatusToDotClass(computedStatus.value)
})
</script>
