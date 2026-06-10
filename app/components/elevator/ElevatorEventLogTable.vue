<template>
	<div class="monitoring-log-panel flex min-h-[320px] w-full min-w-0 flex-col 2xl:min-h-[400px]">
		<div
			v-if="logs.length === 0"
			class="flex flex-1 items-center justify-center rounded-lg border-2 border-white/20 bg-white/5 p-8"
			role="status"
		>
			<MonitoringLogEmptyState message="尚無電梯事件記錄" />
		</div>

		<div v-else>
			<table class="w-full border-b-2 border-l-2 border-r-2 border-white/20">
				<thead class="bg-white/20">
					<tr class="people-log-th text-center text-xs font-semibold text-white/80 2xl:text-sm">
						<th v-for="col in recordColumns" :key="col" class="people-log-cell-pad p-2">
							{{ recordColumnLabels[col] }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="log in logs"
						:key="log.id"
						class="border-b border-white/10 text-center text-white"
					>
						<td
							v-for="col in recordColumns"
							:key="`${log.id}-${col}`"
							class="people-log-cell-pad p-2"
						>
							{{ getElevatorLogCellValue(log, col) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, toRefs } from "vue"
import type { ElevatorLog } from "~/types/elevator"
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue"
import {
	ELEVATOR_LOG_COLUMN_LABELS,
	normalizeElevatorLogDisplayColumns,
	getElevatorLogCellValue,
	type ElevatorLogColumnKey,
} from "~/utils/elevatorLogColumns"

interface Props {
	logs: ElevatorLog[]
	displayColumns?: string[]
}

const props = withDefaults(defineProps<Props>(), {
	logs: () => [],
	displayColumns: undefined,
})

const { logs, displayColumns } = toRefs(props)

const recordColumns = computed(() => normalizeElevatorLogDisplayColumns(displayColumns.value))
const recordColumnLabels = ELEVATOR_LOG_COLUMN_LABELS as Record<ElevatorLogColumnKey, string>
</script>
