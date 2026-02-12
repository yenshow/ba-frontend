<template>
	<section>
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<p class="text-base text-white/70 2xl:text-lg">共 {{ logs.length }} 筆紀錄</p>
			<div class="flex items-center gap-3 2xl:gap-4">
				<TimeRangePicker v-model="timeRangeModel" :presets="[...TIME_RANGE_PRESETS]" />
				<button
					type="button"
					:disabled="logs.length === 0"
					class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					aria-label="匯出 CSV"
					@click="handleExportCsv"
				>
					匯出 CSV
				</button>
			</div>
		</div>

		<div
			v-if="logs.length === 0"
			class="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-8 text-center"
		>
			<p class="text-base text-white/70 2xl:text-lg">尚無進出場紀錄</p>
		</div>

		<div v-else class="my-4 space-y-6">
			<!-- 總覽表：進場/出場人數 + 進場未出場人員（置於上方） -->
			<div class="show-scrollbar max-h-[50vh] overflow-y-auto">
				<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
					進出統計及未出場人員
				</h3>
				<table
					class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base"
				>
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">日期</th>
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">進場人數</th>
							<th class="whitespace-nowrap border border-white/20 p-2">出場人數</th>
							<th class="whitespace-nowrap border border-white/20 p-2">人員ID</th>
							<th class="whitespace-nowrap border border-white/20 p-2">人員姓名</th>
							<th class="whitespace-nowrap border border-white/20 p-2">單位名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">最後進場時間</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(row, index) in summaryTableRows"
							:key="row.key"
							class="border-b border-white/10 text-white"
						>
							<td class="border border-white/20 p-2">{{ row.日期 }}</td>
							<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
							<td class="border border-white/20 p-2">{{ row.進場人數 }}</td>
							<td class="border border-white/20 p-2">{{ row.出場人數 }}</td>
							<td class="border border-white/20 p-2">{{ row.人員ID }}</td>
							<td class="border border-white/20 p-2">{{ row.人員姓名 }}</td>
							<td class="border border-white/20 p-2">{{ row.單位名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.最後進場時間 }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- 進出紀錄明細（置於下方，不顯示日期與進出場人數欄位） -->
			<div class="show-scrollbar max-h-[75vh] overflow-y-auto">
				<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
					進出紀錄
				</h3>
				<table
					class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base"
				>
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">人員ID</th>
							<th class="whitespace-nowrap border border-white/20 p-2">刷卡時間</th>
							<th class="whitespace-nowrap border border-white/20 p-2">出入口設備名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">人員姓名</th>
							<th class="whitespace-nowrap border border-white/20 p-2">單位ID</th>
							<th class="whitespace-nowrap border border-white/20 p-2">單位名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">方向</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(row, index) in detailTableRows"
							:key="row.key"
							class="border-b border-white/10 text-white"
						>
							<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
							<td class="border border-white/20 p-2">{{ row.人員ID }}</td>
							<td class="border border-white/20 p-2">{{ row.刷卡時間 }}</td>
							<td class="border border-white/20 p-2">{{ row.出入口設備名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.人員姓名 }}</td>
							<td class="border border-white/20 p-2">{{ row.單位ID }}</td>
							<td class="border border-white/20 p-2">{{ row.單位名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.方向 }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { PeopleCountingLog } from "~/types/peopleCounting"
import { formatDate, formatDateTime, TIME_RANGE_PRESETS } from "~/utils/dateUtils"
import { buildCsvSection } from "~/utils/csvExport"
import { countEntryExitForDay, getEntryOnlyPersonsForDay } from "~/utils/peopleCountingAdapter"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"

// logs 已由後端依 timeRange 回傳，無需前端再篩選
const props = defineProps<{
	logs: PeopleCountingLog[]
	zoneName: string
	locationName: string
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

/** 從 log 的 timestamp 取得日期字串（YYYY/MM/DD）；支援 "YYYY/MM/DD HH:mm:ss" 與 ISO */
const getDateKey = (log: PeopleCountingLog): string => {
	if (!log.timestamp) return ""
	const s = log.timestamp
	const i = s.indexOf(" ")
	return i !== -1 ? s.slice(0, i) : formatDate(s)
}

/** 依日期分組（供表格與匯出共用） */
const groupsByDate = computed(() => {
	const g = new Map<string, PeopleCountingLog[]>()
	for (const log of props.logs) {
		const d = getDateKey(log)
		if (!d) continue
		if (!g.has(d)) g.set(d, [])
		g.get(d)!.push(log)
	}
	return g
})

const directionLabel = (log: PeopleCountingLog) =>
	log.eventType === "entry" ? "進場" : log.eventType === "exit" ? "出場" : "失敗"

/** 總覽表列型別（isSummary 為 boolean，其餘為顯示用字串） */
type SummaryTableRow = {
	key: string
	isSummary: boolean
	日期: string
	"區域-地點": string
	進場人數: string
	出場人數: string
	人員ID: string
	人員姓名: string
	單位名稱: string
	最後進場時間: string
}

/** 總覽表：進場/出場人數 + 進場未出場人員，同一表格；日期由新到舊，每日先一列統計再該日進場未出場列 */
const summaryTableRows = computed(() => {
	const zl = zoneLocationLabel.value
	const datesDesc = [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a))
	const rows: SummaryTableRow[] = []
	for (const dateStr of datesDesc) {
		const dayLogs = groupsByDate.value.get(dateStr)!
		const { entry, exit } = countEntryExitForDay(dayLogs)
		rows.push({
			key: `summary-${dateStr}`,
			isSummary: true,
			日期: dateStr,
			"區域-地點": zl,
			進場人數: String(entry),
			出場人數: String(exit),
			人員ID: "",
			人員姓名: "",
			單位名稱: "",
			最後進場時間: "",
		})
		const persons = getEntryOnlyPersonsForDay(dayLogs)
		persons.forEach((log, i) => {
			rows.push({
				key: `entry-only-${dateStr}-${log.personnelId ?? log.employeeId ?? ""}-${i}`,
				isSummary: false,
				日期: dateStr,
				"區域-地點": zl,
				進場人數: "",
				出場人數: "",
				人員ID: String(log.personnelId ?? log.employeeId ?? ""),
				人員姓名: log.personName ?? "",
				單位名稱: log.unit?.name ?? log.unitName ?? "",
				最後進場時間: log.timestamp ? formatDateTime(log.timestamp, true) : "",
			})
		})
	}
	return rows
})

/** 進出紀錄明細表：只含每筆刷卡紀錄，不含每日統計列 */
const detailTableRows = computed(() => {
	const zl = zoneLocationLabel.value
	const datesDesc = [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a))
	const rows: Array<Record<string, string> & { key: string }> = []
	for (const dateStr of datesDesc) {
		const dayLogs = groupsByDate.value.get(dateStr)!
		dayLogs.forEach((log, i) => {
			rows.push({
				key: `log-${log.id ?? dateStr}-${i}`,
				日期: "",
				"區域-地點": zl,
				進場人數: "",
				出場人數: "",
				人員ID: String(log.personnelId ?? log.employeeId ?? ""),
				刷卡時間: log.timestamp ? formatDateTime(log.timestamp, true) : "",
				出入口設備名稱: log.deviceName ?? "",
				人員姓名: log.personName ?? "",
				單位ID: String(log.unitId ?? ""),
				單位名稱: log.unit?.name ?? log.unitName ?? "",
				方向: directionLabel(log),
			})
		})
	}
	return rows
})

/** 匯出用：與頁面一致＝1. 進出統計（8 欄） 2. 進出紀錄（8 欄，無日期與進出場人數） */
const SUMMARY_EXPORT_HEADERS = [
	"日期",
	"區域-地點",
	"進場人數",
	"出場人數",
	"人員ID",
	"人員姓名",
	"單位名稱",
	"最後進場時間",
]
const DETAIL_EXPORT_HEADERS = [
	"區域-地點",
	"人員ID",
	"刷卡時間",
	"出入口設備名稱",
	"人員姓名",
	"單位ID",
	"單位名稱",
	"方向",
]

/** 進出統計匯出列（與 summaryTableRows 一致，僅取 8 欄） */
const summaryExportRows = computed(() =>
	summaryTableRows.value.map((row) => ({
		日期: row.日期,
		"區域-地點": row["區域-地點"],
		進場人數: row.進場人數,
		出場人數: row.出場人數,
		人員ID: row.人員ID,
		人員姓名: row.人員姓名,
		單位名稱: row.單位名稱,
		最後進場時間: row.最後進場時間,
	}))
)

/** 進出紀錄匯出列（與 detailTableRows 一致，僅 8 欄） */
const detailExportRows = computed(() =>
	detailTableRows.value.map((row) => ({
		"區域-地點": row["區域-地點"],
		人員ID: row.人員ID,
		刷卡時間: row.刷卡時間,
		出入口設備名稱: row.出入口設備名稱,
		人員姓名: row.人員姓名,
		單位ID: row.單位ID,
		單位名稱: row.單位名稱,
		方向: row.方向,
	}))
)

/** 匯出檔名用日期（第一筆紀錄的日期） */
const firstDateStr = computed(() => (props.logs.length > 0 ? getDateKey(props.logs[0]) : ""))

const handleExportCsv = () => {
	const summaryRows = summaryExportRows.value
	const detailRows = detailExportRows.value
	if (summaryRows.length === 0 && detailRows.length === 0) return
	const dateStr = firstDateStr.value.replace(/\//g, "-") || new Date().toISOString().slice(0, 10)
	const parts: string[] = []
	parts.push("進出統計")
	parts.push(buildCsvSection(SUMMARY_EXPORT_HEADERS, summaryRows, { backupStyle: true }))
	parts.push("")
	parts.push("進出紀錄")
	parts.push(buildCsvSection(DETAIL_EXPORT_HEADERS, detailRows, { backupStyle: true }))
	const csvContent = "\uFEFF" + parts.join("\n")
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.href = url
	link.download = `people_counting_logs_${dateStr}.csv`
	link.setAttribute("aria-label", "下載 CSV")
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}
</script>
