<template>
	<div
		v-if="shouldShow"
		class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium 2xl:text-sm"
		:class="badgeClass"
		role="status"
		aria-live="polite"
	>
		<span class="h-1.5 w-1.5 rounded-full" :class="dotClass" aria-hidden="true" />
		<span>{{ label }}</span>
		<span v-if="timeLabel" class="text-white/60">{{ timeLabel }}</span>
	</div>
</template>

<script setup lang="ts">
import type { PollingHealthState } from "~/composables/monitoring/modbus/useModbusPollingPolicy"

const props = withDefaults(
	defineProps<{
		state: PollingHealthState
		lastSuccessAt?: number | null
		showWhenHealthy?: boolean
	}>(),
	{
		lastSuccessAt: null,
		showWhenHealthy: false,
	}
)

const shouldShow = computed(() => props.showWhenHealthy || props.state !== "HEALTHY")

const label = computed(() => {
	if (props.state === "OFFLINE") return "離線（退避中）"
	if (props.state === "DEGRADED") return "不穩定（退避中）"
	return "連線正常"
})

const badgeClass = computed(() => {
	if (props.state === "OFFLINE") return "border-rose-300/40 bg-rose-500/15 text-rose-100"
	if (props.state === "DEGRADED") return "border-amber-300/40 bg-amber-500/15 text-amber-100"
	return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
})

const dotClass = computed(() => {
	if (props.state === "OFFLINE") return "bg-rose-300"
	if (props.state === "DEGRADED") return "bg-amber-300"
	return "bg-emerald-300"
})

const timeLabel = computed(() => {
	const t = props.lastSuccessAt
	if (!t) return ""
	const s = new Date(t).toLocaleTimeString("zh-TW", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
	return `最後更新 ${s}`
})
</script>

