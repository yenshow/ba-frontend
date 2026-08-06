<script setup lang="ts">
import type { EnergyAlertDisplayItem } from "~/types/energy"
import { getEnergyAlertUi } from "~/utils/energyAlertUi"

const props = defineProps<{
	alerts: EnergyAlertDisplayItem[]
	limit?: number
	emptyTitle?: string
	emptyHint?: string
}>()

const alertsView = computed(() => {
	const list =
		props.limit != null ? props.alerts.slice(0, props.limit) : props.alerts
	return list.map((a) => ({
		...a,
		ui: getEnergyAlertUi(a.severity, a.kind),
	}))
})
</script>

<template>
	<ul class="space-y-2 text-sm 2xl:text-base">
		<li
			v-for="a in alertsView"
			:key="`${a.kind || 'item'}-${a.id}`"
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
					v-else-if="a.ui.icon === 'info'"
					class="h-3.5 w-3.5"
					viewBox="0 0 16 16"
					fill="currentColor"
					xmlns="http://www.w3.org/2000/svg"
				>
					<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5" />
					<rect x="7.25" y="7" width="1.5" height="4.5" rx="0.75" />
					<circle cx="8" cy="4.75" r="0.9" />
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
			<p class="text-base 2xl:text-lg">{{ emptyTitle || "目前無能源通知" }}</p>
			<p v-if="emptyHint" class="mt-2 text-sm 2xl:text-base">{{ emptyHint }}</p>
		</li>
	</ul>
</template>
