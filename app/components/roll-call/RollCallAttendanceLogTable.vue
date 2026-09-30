<template>
	<div class="monitoring-log-panel flex min-h-[320px] w-full min-w-0 flex-1 flex-col 2xl:min-h-[400px]">
		<div
			v-if="rows.length === 0"
			class="monitoring-log-empty flex flex-1 items-center justify-center rounded-lg p-8"
			role="status"
		>
			<MonitoringLogEmptyState :message="emptyMessage" />
		</div>
		<div v-else class="show-scrollbar min-h-0 flex-1 overflow-auto">
			<table class="monitoring-log-table w-full">
				<thead class="monitoring-chip-bg">
					<tr class="people-log-th text-center text-xs font-semibold text-white/80 2xl:text-sm">
						<th class="people-log-cell-pad p-2">姓名</th>
						<th class="people-log-cell-pad p-2">工號</th>
						<th class="people-log-cell-pad p-2">群組</th>
						<th class="people-log-cell-pad p-2">狀態</th>
						<th v-if="canMark" class="people-log-cell-pad p-2">操作</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="row in rows"
						:key="row.personId"
						class="monitoring-log-row text-center text-white"
					>
						<td class="people-log-cell-pad p-2">{{ row.fullName || "—" }}</td>
						<td class="people-log-cell-pad p-2">{{ row.employeeNo }}</td>
						<td class="people-log-cell-pad p-2">{{ row.groupName || "未分組" }}</td>
						<td class="people-log-cell-pad p-2">{{ statusLabel(row.status) }}</td>
						<td v-if="canMark" class="people-log-cell-pad p-2">
							<span v-if="canMarkRows" class="inline-flex flex-wrap justify-center gap-2">
								<button
									type="button"
									class="rounded-lg border border-white/40 px-2 py-1 text-xs 2xl:text-sm"
									aria-label="標記已簽到"
									@click="emit('mark', row.personId, 'present')"
								>
									已簽到
								</button>
								<button
									type="button"
									class="rounded-lg border border-white/40 px-2 py-1 text-xs 2xl:text-sm"
									aria-label="標記未到"
									@click="emit('mark', row.personId, 'absent')"
								>
									未到
								</button>
							</span>
							<span v-else class="text-white/40">—</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue"
import type { RollCallAttendanceRow } from "~/types/rollCall"

withDefaults(
	defineProps<{
		rows: RollCallAttendanceRow[]
		canMark?: boolean
		canMarkRows?: boolean
		emptyMessage?: string
	}>(),
	{
		canMark: false,
		canMarkRows: false,
		emptyMessage: "尚無簽到紀錄",
	},
)

const emit = defineEmits<{
	mark: [personId: number, status: "present" | "absent"]
}>()

const statusLabel = (status: string) => {
	if (status === "present") return "已簽到"
	if (status === "absent") return "未到"
	return "尚未簽到"
}
</script>
