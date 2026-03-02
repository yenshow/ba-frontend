<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<p class="text-base text-white/70 2xl:text-lg">共 {{ readings.length }} 筆讀數</p>
			<div class="flex items-center gap-3 2xl:gap-4">
				<TimeRangePicker v-model="timeRangeModel" :presets="[...TIME_RANGE_PRESETS]" />
				<button
					type="button"
					:disabled="readings.length === 0"
					class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					aria-label="匯出 CSV"
					@click="handleExportCsv"
				>
					匯出 CSV
				</button>
			</div>
		</div>

		<div
			v-if="readings.length === 0"
			class="flex min-h-[200px] items-center justify-center text-center"
		>
			<p class="text-base text-white/70 2xl:text-lg">尚無環境讀數資料</p>
		</div>

		<div v-else class="show-scrollbar overflow-x-auto">
			<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
				<thead class="bg-white/20">
					<tr class="text-white/90">
						<th class="whitespace-nowrap border border-white/20 p-2">系統來源</th>
						<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
						<th class="whitespace-nowrap border border-white/20 p-2">設備配置</th>
						<th class="whitespace-nowrap border border-white/20 p-2">記錄時間</th>
						<th class="whitespace-nowrap border border-white/20 p-2">CO2</th>
						<th class="whitespace-nowrap border border-white/20 p-2">HCHO</th>
						<th class="whitespace-nowrap border border-white/20 p-2">PM10</th>
						<th class="whitespace-nowrap border border-white/20 p-2">PM2.5</th>
						<th class="whitespace-nowrap border border-white/20 p-2">TVOC</th>
						<th class="whitespace-nowrap border border-white/20 p-2">風速</th>
						<th class="whitespace-nowrap border border-white/20 p-2">噪音值</th>
						<th class="whitespace-nowrap border border-white/20 p-2">濕度</th>
						<th class="whitespace-nowrap border border-white/20 p-2">溫度</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(row, index) in tableRows"
						:key="row.key"
						class="border-b border-white/10 text-white"
					>
						<td class="border border-white/20 p-2">{{ row.系統來源 }}</td>
						<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
						<td class="border border-white/20 p-2">{{ row.設備配置 }}</td>
						<td class="border border-white/20 p-2">{{ row.記錄時間 }}</td>
						<td class="border border-white/20 p-2">{{ row.CO2 }}</td>
						<td class="border border-white/20 p-2">{{ row.HCHO }}</td>
						<td class="border border-white/20 p-2">{{ row.PM10 }}</td>
						<td class="border border-white/20 p-2">{{ row["PM2.5"] }}</td>
						<td class="border border-white/20 p-2">{{ row.TVOC }}</td>
						<td class="border border-white/20 p-2">{{ row.風速 }}</td>
						<td class="border border-white/20 p-2">{{ row.噪音值 }}</td>
						<td class="border border-white/20 p-2">{{ row.濕度 }}</td>
						<td class="border border-white/20 p-2">{{ row.溫度 }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { SensorReading } from "~/types/environment"
import { formatDateTime, TIME_RANGE_PRESETS } from "~/utils/dateUtils"
import { exportCsv } from "~/utils/csvExport"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"

const props = defineProps<{
	readings: SensorReading[]
	zoneName: string
	locationName: string
	deviceConfig: string
	timeRange: { startDate: string; endDate: string; preset: string }
}>()

const emit = defineEmits<{
	"update:timeRange": [v: { startDate: string; endDate: string; preset: string }]
}>()

const timeRangeModel = computed({
	get: () => props.timeRange,
	set: (v) => emit("update:timeRange", v),
})

const zoneLocationLabel = computed(() => {
	const z = props.zoneName || ""
	const l = props.locationName || ""
	return [z, l].filter(Boolean).join("-") || "-"
})

const tableRows = computed(() => {
	return props.readings.map((r, index) => {
		const d = r.data || {}
		const recordTime = r.timestamp ? formatDateTime(r.timestamp, true) : ""
		return {
			key: `env-${index}-${r.timestamp || index}`,
			系統來源: "環境",
			"區域-地點": zoneLocationLabel.value,
			設備配置: props.deviceConfig || "",
			記錄時間: recordTime,
			CO2: d.co2 != null ? String(d.co2) : "",
			HCHO: d.hcho != null ? String(d.hcho) : "",
			PM10: d.pm10 != null ? String(d.pm10) : "",
			"PM2.5": d.pm25 != null ? String(d.pm25) : "",
			TVOC: d.tvoc != null ? String(d.tvoc) : "",
			風速: d.wind != null ? String(d.wind) : "",
			噪音值: d.noise != null ? String(d.noise) : "",
			濕度: d.humidity != null ? String(d.humidity) : "",
			溫度: d.temperature != null ? String(d.temperature) : "",
		}
	})
})

const CSV_HEADERS = [
	"系統來源",
	"區域-地點",
	"設備配置",
	"記錄時間",
	"CO2",
	"HCHO",
	"PM10",
	"PM2.5",
	"TVOC",
	"風速",
	"噪音值",
	"濕度",
	"溫度",
]

const handleExportCsv = () => {
	if (tableRows.value.length === 0) return
	const rows = tableRows.value.map(({ key: _k, ...row }) => row)
	const dateStr =
		props.readings.length > 0 && props.readings[0]?.timestamp
			? new Date(props.readings[0].timestamp).toISOString().slice(0, 10)
			: new Date().toISOString().slice(0, 10)
	exportCsv(CSV_HEADERS, rows, `environment_readings_${dateStr}.csv`, { backupStyle: true })
}
</script>
