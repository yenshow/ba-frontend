<template>
	<div
		class="flex flex-col justify-between rounded-md border border-black/50 bg-white/75 px-3 py-2 text-black/90 gap-2"
	>
		<div class="text-center text-xl font-semibold ms-[4px] tracking-[4px] text-black/80">
			{{ label }}
		</div>
		<div class="border-t border-black/50 pt-2">
			<div class="flex items-end justify-center gap-1.5">
				<div class="text-4xl font-semibold leading-none text-black">
					{{ displayValue }}
				</div>
				<div v-if="unit" class="pb-0.5 text-sm font-medium text-black/80">
					{{ unit }}
				</div>
			</div>
		</div>
		<div
			class="w-fit mx-auto px-2 flex items-center justify-center gap-2 text-xs text-black/80 rounded-full border border-black/50"
		>
			<span class="h-4 w-4 rounded-full" :class="statusDotClass" />
			<span class="text-base font-semibold">{{ statusText }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	label: string
	value: number | null
	unit?: string
	status?: "normal" | "offline" | "abnormal" | "alarm"
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
	if (computedStatus.value === "normal") return "正常"
	if (computedStatus.value === "offline") return "離線"
	if (computedStatus.value === "abnormal") return "異常"
	return "警報"
})

const statusDotClass = computed(() => {
	if (computedStatus.value === "normal") return "bg-emerald-500"
	if (computedStatus.value === "offline") return "bg-black/25"
	if (computedStatus.value === "abnormal") return "bg-amber-500"
	return "bg-rose-500"
})
</script>
