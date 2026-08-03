<script setup lang="ts">
export type EnergyAlertItem = {
	id: number
	message: string
	severity: string
	created_at: string
}

const DISPLAY_LIMIT = 3
const ALERT_LOG_PATH = "/core/alert-log"

const props = defineProps<{
	alerts: EnergyAlertItem[]
}>()

type AlertIcon = "bang" | "check"

const alertSeverityUi = (severity: string): { wrap: string; dot: string; icon: AlertIcon } => {
	const key = severity.toLowerCase()
	if (key === "critical" || key === "danger" || key === "error") {
		return {
			wrap: "border-red-400/40 bg-red-500/10",
			dot: "bg-red-500",
			icon: "bang",
		}
	}
	if (key === "warning" || key === "warn") {
		return {
			wrap: "border-amber-400/35 bg-amber-500/10",
			dot: "bg-amber-400",
			icon: "bang",
		}
	}
	return {
		wrap: "border-cyan-400/30 bg-cyan-500/10",
		dot: "bg-[#2EE6D6]",
		icon: "check",
	}
}

const alertsView = computed(() =>
	props.alerts.slice(0, DISPLAY_LIMIT).map((a) => ({
		...a,
		ui: alertSeverityUi(a.severity),
	}))
)

const hasMore = computed(() => props.alerts.length > DISPLAY_LIMIT)
</script>

<template>
	<div>
		<h3 class="mb-4 text-center text-xl font-semibold tracking-[4px] 2xl:text-2xl">告警通知</h3>
		<ul class="space-y-2 text-sm 2xl:text-base">
			<li
				v-for="a in alertsView"
				:key="a.id"
				class="flex items-center gap-3 rounded-xl border-2 px-4 py-2"
				:class="a.ui.wrap"
			>
				<span
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
					:class="a.ui.dot"
					aria-hidden="true"
				>
					<svg
						v-if="a.ui.icon === 'bang'"
						class="h-3.5 w-3.5"
						viewBox="0 0 16 16"
						fill="currentColor"
						xmlns="http://www.w3.org/2000/svg"
					>
						<rect x="7" y="2.5" width="2" height="7.5" rx="1" />
						<circle cx="8" cy="13" r="1.25" />
					</svg>
					<svg
						v-else
						class="h-3.5 w-3.5"
						viewBox="0 0 16 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M3.5 8.5L6.5 11.5L12.5 4.5"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>
				<div class="min-w-0 flex-1">
					<div class="text-white/90">{{ a.message }}</div>
					<div class="mt-0.5 text-xs tracking-wider text-white/45 2xl:text-sm">
						{{ new Date(a.created_at).toLocaleString() }}
					</div>
				</div>
			</li>
			<li v-if="alertsView.length === 0" class="py-8 text-center text-white/60">
				<p class="text-base 2xl:text-lg">目前無能源告警</p>
				<p class="mt-2 text-sm 2xl:text-base">契約容量與表計異常會顯示於此</p>
			</li>
		</ul>
		<div v-if="hasMore" class="mt-2 text-right">
			<NuxtLink
				:to="ALERT_LOG_PATH"
				class="text-sm text-white/70 transition-colors hover:text-white 2xl:text-base"
				aria-label="查看更多告警通知，前往警示紀錄"
			>
				查看更多 >
			</NuxtLink>
		</div>
	</div>
</template>
