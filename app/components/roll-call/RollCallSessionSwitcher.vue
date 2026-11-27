<template>
	<div
		v-if="sessions.length > 1"
		class="flex shrink-0 flex-wrap items-center justify-center gap-3"
		role="tablist"
		aria-label="班別切換"
	>
		<button
			v-for="session in sessions"
			:key="sessionKey(session)"
			type="button"
			role="tab"
			:aria-selected="sessionKey(session) === modelValue"
			:aria-label="`${session.ruleName} ${formatWindow(session)}`"
			class="rounded-xl border px-4 py-2 text-base font-semibold transition-colors 2xl:px-5 2xl:py-2.5 2xl:text-lg"
			:class="
				sessionKey(session) === modelValue
					? 'border-cyan-300/80 bg-cyan-400/20 text-white'
					: 'border-white/25 bg-black/20 text-white/75 hover:border-white/50 hover:text-white'
			"
			@click="emit('update:modelValue', sessionKey(session))"
		>
			<span>{{ session.ruleName }}</span>
			<span class="ms-2 text-sm font-medium text-white/70 2xl:text-base">
				{{ formatWindow(session) }}
			</span>
			<span
				v-if="statusLabel(session)"
				class="ms-2 text-sm font-medium 2xl:text-base"
				:class="statusClass(session)"
			>
				{{ statusLabel(session) }}
			</span>
		</button>
	</div>
</template>

<script setup lang="ts">
import type { RollCallSessionSummary } from "~/types/rollCall"

defineProps<{
	sessions: RollCallSessionSummary[]
	modelValue: string | null
}>()

const emit = defineEmits<{
	"update:modelValue": [value: string]
}>()

const sessionKey = (session: RollCallSessionSummary) =>
	`${session.ruleId}:${session.sessionDate}`

const formatWindow = (session: RollCallSessionSummary) =>
	`${session.windowStart || "--:--"}–${session.windowEnd || "--:--"}`

const statusLabel = (session: RollCallSessionSummary) => {
	if (session.status === "open") return "進行中"
	if (session.status === "closed") return "已結場"
	if (session.status === "not_started") return "尚未開始"
	return ""
}

const statusClass = (session: RollCallSessionSummary) => {
	if (session.status === "open") return "text-emerald-300"
	if (session.status === "closed") return "text-white/50"
	return "text-amber-200/80"
}
</script>
