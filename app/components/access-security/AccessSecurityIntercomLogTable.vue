<template>
	<div
		class="monitoring-log-panel flex min-h-[240px] w-full min-w-0 flex-1 flex-col 2xl:min-h-[320px]"
	>
		<div
			v-if="rows.length === 0"
			class="monitoring-log-empty flex flex-1 items-center justify-center rounded-lg p-8"
			role="status"
		>
			<MonitoringLogEmptyState message="尚無對講事件" />
		</div>
		<div v-else class="show-scrollbar min-h-0 flex-1 overflow-y-auto">
			<table class="monitoring-log-table w-full">
				<thead class="monitoring-chip-bg">
					<tr class="people-log-th text-center text-xs font-semibold text-white/80 2xl:text-sm">
						<th class="people-log-cell-pad p-2">戶別</th>
						<th class="people-log-cell-pad p-2">摘要</th>
						<th class="people-log-cell-pad p-2">來源</th>
						<th class="people-log-cell-pad p-2">時間</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows" :key="row.id" class="monitoring-log-row text-center text-white">
						<td class="people-log-cell-pad p-2">
							<span class="people-log-cell text-sm 2xl:text-base">{{ row.unit }}</span>
						</td>
						<td class="people-log-cell-pad p-2">
							<span class="people-log-cell text-sm 2xl:text-base">{{ row.summary }}</span>
						</td>
						<td class="people-log-cell-pad p-2">
							<span
								:class="[
									'people-log-tag inline-block rounded-full px-2 py-0.5 text-xs font-medium 2xl:text-sm',
									row.sourceClass,
								]"
							>
								{{ row.source }}
							</span>
						</td>
						<td class="people-log-cell-pad p-2">
							<div class="people-log-time flex flex-col items-center gap-1 text-xs 2xl:text-sm">
								<span>{{ row.date }}</span>
								<span>{{ row.clock || "—" }}</span>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue"
import {
	getOperationalSourceLabel,
	type OperationalEvent,
} from "~/composables/systems/useOperationalEvents"
import { formatDateTime } from "~/utils/dateUtils"
import type { AccessSecuritySiteLocation } from "~/types/accessSecurity"
import {
	formatAccessSecurityIntercomUnitLabel,
	formatIntercomMonitorSummary,
	getIntercomSourceBadgeClass,
	parseIntercomLogTimestamp,
	resolveAccessSecurityIntercomUnit,
} from "~/utils/accessSecurityIntercomEvents"

const props = defineProps<{
	events: OperationalEvent[]
	locations: AccessSecuritySiteLocation[]
	focusedLocationId?: number | null
}>()

const rows = computed(() => {
	const focused = props.focusedLocationId ?? null
	return (props.events || [])
		.filter((event) => {
			if (focused == null) return true
			const loc = resolveAccessSecurityIntercomUnit(event, props.locations)
			return loc?.id === focused
		})
		.map((event) => {
			const stamped = parseIntercomLogTimestamp(formatDateTime(event.occurred_at))
			return {
				id: event.id,
				unit: formatAccessSecurityIntercomUnitLabel(event, props.locations),
				summary: formatIntercomMonitorSummary(event.summary),
				source: getOperationalSourceLabel(event.source),
				sourceClass: getIntercomSourceBadgeClass(event.source),
				date: stamped.date,
				clock: stamped.time,
			}
		})
})
</script>
