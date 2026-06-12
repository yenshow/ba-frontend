<template>
	<section class="min-h-[664px] rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div v-if="locationFilterOptions.length > 1" class="flex items-center gap-2">
				<label class="text-lg font-semibold 2xl:text-xl">地點：</label>
				<div class="min-w-[10rem]">
					<FilterDropdown
						v-model="filterLocationId"
						:options="locationFilterOptions"
						placeholder="全部"
						text-size="text-sm 2xl:text-base"
					/>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-3 2xl:gap-4">
				<SearchInput
					v-model="searchQuery"
					input-id="elevator-simulation-search"
					label="搜尋"
					placeholder="姓名 / ID"
					aria-label="搜尋事件"
				/>
				<TimeRangePicker v-model="timeRangeModel" :presets="[...TIME_RANGE_PRESETS_FULL_REPORT]" />
				<button
					type="button"
					:disabled="filteredLogs.length === 0"
					class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					aria-label="匯出 CSV"
					@click="handleExportCsv"
				>
					匯出 CSV
				</button>
			</div>
		</div>

		<div
			v-if="filteredLogs.length === 0"
			class="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-8 text-center"
		>
			<p class="text-base text-white/70 2xl:text-lg">尚無電梯事件紀錄</p>
		</div>

		<div v-else class="show-scrollbar overflow-x-auto">
			<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
				<thead class="sticky top-0 z-10 bg-white/20 backdrop-blur-sm">
					<tr class="text-white/90">
						<th
							v-for="col in displayColumns"
							:key="col"
							class="whitespace-nowrap border border-white/20 p-2"
						>
							{{ ELEVATOR_LOG_COLUMN_LABELS[col] }}
						</th>
						<th class="whitespace-nowrap border border-white/20 p-2">地點</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="log in filteredLogs"
						:key="`${log.id}-${log.locationId ?? ''}`"
						class="border-b border-white/10 text-white"
					>
						<td
							v-for="col in displayColumns"
							:key="`${log.id}-${col}`"
							class="border border-white/20 p-2"
						>
							{{ getElevatorLogCellValue(log, col) }}
						</td>
						<td class="border border-white/20 p-2">
							{{ getLocationLabel(log.locationId) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { ElevatorLog } from "~/types/elevator"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"
import { TIME_RANGE_PRESETS_FULL_REPORT } from "~/utils/dateUtils"
import {
	ELEVATOR_LOG_COLUMN_LABELS,
	ELEVATOR_DEFAULT_LOG_DISPLAY_COLUMNS,
	getElevatorLogCellValue,
} from "~/utils/elevatorLogColumns"
import { exportCsv } from "~/utils/csvExport"

interface LocationOption {
	id: number
	label: string
}

type ElevatorSimulationTimeRange = { startDate: string; endDate: string; preset: string }

interface Props {
	logs: ElevatorLog[]
	locationOptions?: LocationOption[]
	timeRange: ElevatorSimulationTimeRange
}

const props = withDefaults(defineProps<Props>(), {
	logs: () => [],
	locationOptions: () => [],
})

const emit = defineEmits<{ "update:time-range": [value: ElevatorSimulationTimeRange] }>()

const filterLocationId = ref("")
const searchQuery = ref("")
const displayColumns = ELEVATOR_DEFAULT_LOG_DISPLAY_COLUMNS

const timeRangeModel = computed({
	get: () => props.timeRange,
	set: (v) => emit("update:time-range", v),
})

const locationFilterOptions = computed(() => [
	{ value: "", label: "全部" },
	...props.locationOptions.map((o) => ({ value: String(o.id), label: o.label })),
])

const filteredLogs = computed(() => {
	let list = props.logs
	if (filterLocationId.value) {
		const sid = Number(filterLocationId.value)
		list = list.filter((l) => l.locationId === sid)
	}
	const q = searchQuery.value.trim().toLowerCase()
	if (q) {
		list = list.filter((l) => {
			const name = l.personName?.toLowerCase() || ""
			const emp = l.employeeNo?.toLowerCase() || ""
			return name.includes(q) || emp.includes(q)
		})
	}
	return list
})

const getLocationLabel = (locationId?: number) => {
	if (!locationId) return "—"
	return props.locationOptions.find((o) => o.id === locationId)?.label || String(locationId)
}

const handleExportCsv = () => {
	const headers = [...displayColumns.map((c) => ELEVATOR_LOG_COLUMN_LABELS[c]), "地點"]
	const rows = filteredLogs.value.map((log) => {
		const row: Record<string, string> = { 地點: getLocationLabel(log.locationId) }
		for (const col of displayColumns) {
			row[ELEVATOR_LOG_COLUMN_LABELS[col]] = getElevatorLogCellValue(log, col)
		}
		return row
	})
	const filename = `電梯事件報表_${new Date().toISOString().slice(0, 10)}.csv`
	exportCsv(headers, rows, filename)
}

watch(
	() => props.locationOptions,
	(opts) => {
		if (filterLocationId.value && !opts.some((o) => String(o.id) === filterLocationId.value)) {
			filterLocationId.value = ""
		}
	},
)
</script>
