<template>
	<section class="min-h-[664px] rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<p class="text-base text-white/70 2xl:text-lg">共 {{ logs.length }} 筆紀錄</p>
			<div class="flex items-center gap-3 2xl:gap-4">
				<TimeRangePicker v-model="timeRangeModel" :presets="[...TIME_RANGE_PRESETS_FULL_REPORT]" />
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

		<div v-else class="space-y-6">
			<!-- 1. 進出統計 -->
			<div class="show-scrollbar max-h-[40vh] overflow-y-auto">
				<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
					進出統計
				</h3>
				<div v-if="zoneLocationOptions.length > 1" class="mb-2 flex items-center gap-2">
					<label class="text-sm text-white/70 2xl:text-base">區域-地點：</label>
					<div class="min-w-[10rem]">
						<FilterDropdown
							v-model="filterZoneLocation"
							:options="zoneLocationFilterOptions"
							placeholder="全部"
							text-size="text-sm 2xl:text-base"
						/>
					</div>
				</div>
				<table
					class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base"
				>
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">日期</th>
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">進場人數</th>
							<th class="whitespace-nowrap border border-white/20 p-2">出場人數</th>
							<th class="whitespace-nowrap border border-white/20 p-2">在場人數</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in statsTableRows"
							:key="row.key"
							class="border-b border-white/10 text-white"
						>
							<td class="border border-white/20 p-2">{{ row.日期 }}</td>
							<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
							<td class="border border-white/20 p-2">{{ row.進場人數 }}</td>
							<td class="border border-white/20 p-2">{{ row.出場人數 }}</td>
							<td class="border border-white/20 p-2">{{ row.在場人數 }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- 2. 單位統計 -->
			<div class="show-scrollbar max-h-[40vh] overflow-y-auto">
				<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
					單位統計
				</h3>
				<div v-if="zoneLocationOptions.length > 1" class="mb-2 flex items-center gap-2">
					<label class="text-sm text-white/70 2xl:text-base">區域-地點：</label>
					<div class="min-w-[10rem]">
						<FilterDropdown
							v-model="filterZoneLocationUnit"
							:options="zoneLocationFilterOptions"
							placeholder="全部"
							text-size="text-sm 2xl:text-base"
						/>
					</div>
				</div>
				<table
					class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base"
				>
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">日期</th>
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">單位名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">進場人數</th>
							<th class="whitespace-nowrap border border-white/20 p-2">出場人數</th>
							<th class="whitespace-nowrap border border-white/20 p-2">在場人數</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in unitStatsTableRows"
							:key="row.key"
							class="border-b border-white/10 text-white"
						>
							<td class="border border-white/20 p-2">{{ row.日期 }}</td>
							<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
							<td class="border border-white/20 p-2">{{ row.單位名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.進場人數 }}</td>
							<td class="border border-white/20 p-2">{{ row.出場人數 }}</td>
							<td
								class="border border-white/20 p-2"
								:class="row.hasOnSite ? 'bg-red-500/80 font-semibold' : ''"
							>
								{{ row.在場人數 }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- 3. 進出紀錄 -->
			<div class="max-h-[75vh] overflow-y-auto">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h3 class="w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
						進出紀錄
					</h3>
					<div class="flex flex-wrap items-center gap-4">
						<div v-if="zoneLocationOptions.length >= 1" class="flex items-center gap-2">
							<label class="text-sm text-white/70 2xl:text-base">區域-地點：</label>
							<div class="min-w-[10rem]">
								<FilterDropdown
									v-model="filterZoneLocationDetail"
									:options="zoneLocationFilterOptions"
									placeholder="全部"
									text-size="text-sm 2xl:text-base"
								/>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<label class="text-sm text-white/70 2xl:text-base">單位名稱：</label>
							<div class="min-w-[10rem]">
								<FilterDropdown
									v-model="filterUnitName"
									:options="unitNameFilterOptions"
									placeholder="全部"
									text-size="text-sm 2xl:text-base"
								/>
							</div>
						</div>
					</div>
				</div>
				<table
					class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base"
				>
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th
								v-for="header in detailHeaders"
								:key="header"
								class="whitespace-nowrap border border-white/20 p-2"
							>
								{{ header }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in detailTableRowsPaginated"
							:key="row.key"
							class="border-b border-white/10 text-white"
							:class="row.isEntryOnly ? 'bg-red-500/80' : ''"
						>
							<td
								v-for="(cell, cellIdx) in row.cells"
								:key="`${row.key}-${cellIdx}`"
								class="border border-white/20 p-2"
							>
								{{ cell }}
							</td>
						</tr>
					</tbody>
				</table>
				<div
					v-if="detailTableRows.length > 0"
					class="mt-3 flex flex-wrap items-center justify-between gap-3"
				>
					<p class="text-sm text-white/70 2xl:text-base">
						第 {{ detailPage }} / {{ totalDetailPages }} 頁，共 {{ detailTableRows.length }} 筆
					</p>
					<div class="flex items-center gap-2">
						<button
							type="button"
							:disabled="detailPage <= 1"
							class="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-4 2xl:py-2 2xl:text-base"
							aria-label="上一頁"
							@click="handleDetailPrevPage"
						>
							上一頁
						</button>
						<button
							type="button"
							:disabled="detailPage >= totalDetailPages"
							class="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-4 2xl:py-2 2xl:text-base"
							aria-label="下一頁"
							@click="handleDetailNextPage"
						>
							下一頁
						</button>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { PeopleCountingLog } from "~/types/peopleCounting"
import { formatDate, formatDateTime, TIME_RANGE_PRESETS_FULL_REPORT } from "~/utils/dateUtils"
import { buildCsvSection } from "~/utils/csvExport"
import {
	countingPersonKey,
	countEntryExitForDay,
	cumulativePresenceFromTotals,
	getEntryOnlyPersonsForDay,
	getUnitStatsForDay,
} from "~/utils/peopleCountingTransition"
import {
	normalizeLogDisplayColumns,
	buildLogDetailRow,
	PEOPLE_COUNTING_LOG_COLUMN_LABELS,
	type PeopleCountingLogColumnKey,
} from "~/utils/peopleCountingLogColumns"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

const props = defineProps<{
	logs: PeopleCountingLog[]
	displayColumns?: PeopleCountingLogColumnKey[] | string[] | null
	dataSource?: "yscp" | "access_control" | "isapi_camera"
	siteSummary?: {
		entryCount: number
		exitCount: number
		units?: Array<{
			name: string
			entryCount?: number
			exitCount?: number
			currentCount?: number
			// 允許帶額外欄位（如 id/capacity 等），避免呼叫端型別不相容
			[key: string]: unknown
		}>
	} | null
	/** 相容：舊頁面用 site-summary 綁定 */
	siteSnapshot?: {
		entryCount: number
		exitCount: number
		units?: Array<{
			name: string
			entryCount?: number
			exitCount?: number
			currentCount?: number
			[key: string]: unknown
		}>
	} | null
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

const filterZoneLocation = ref("")
const filterZoneLocationUnit = ref("")
const filterZoneLocationDetail = ref("")
const filterUnitName = ref("")

const isIsapiCameraReport = computed(() => props.dataSource === "isapi_camera")

const effectiveSnapshot = computed(() => props.siteSnapshot ?? props.siteSummary ?? null)

const useIsapiSnapshotTotals = computed(
	() =>
		isIsapiCameraReport.value &&
		effectiveSnapshot.value != null &&
		props.timeRange.preset === "today"
)

const zoneLocationOptions = computed(() =>
	zoneLocationLabel.value ? [zoneLocationLabel.value] : []
)

const zoneLocationFilterOptions = computed(() => [
	{ value: "", label: "全部" },
	...zoneLocationOptions.value.map((value) => ({ value, label: value })),
])

const unitNameOptions = computed(() => {
	const set = new Set<string>()
	for (const log of props.logs) {
		const name = (log.unit?.name ?? log.unitName ?? "").trim()
		if (name) set.add(name)
	}
	return [...set].sort()
})

const unitNameFilterOptions = computed(() => [
	{ value: "", label: "全部" },
	...unitNameOptions.value.map((value) => ({ value, label: value })),
])

const getDateKey = (log: PeopleCountingLog): string => {
	if (!log.timestamp) return ""
	const s = log.timestamp
	const i = s.indexOf(" ")
	return i !== -1 ? s.slice(0, i) : formatDate(s)
}

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

const displayColumns = computed(() => normalizeLogDisplayColumns(props.displayColumns))
const detailHeaders = computed(() =>
	displayColumns.value.map((k) => PEOPLE_COUNTING_LOG_COLUMN_LABELS[k])
)

const statsTableRows = computed(() => {
	const zl = zoneLocationLabel.value
	if (filterZoneLocation.value && zl !== filterZoneLocation.value) return []
	const datesDesc = [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a))
	const rows: Array<Record<string, string> & { key: string }> = []
	for (const dateStr of datesDesc) {
		const dayLogs = groupsByDate.value.get(dateStr)!
		let entry: number
		let exit: number
		let current: number
		if (useIsapiSnapshotTotals.value && effectiveSnapshot.value && datesDesc.length === 1) {
			entry = effectiveSnapshot.value.entryCount
			exit = effectiveSnapshot.value.exitCount
			current = cumulativePresenceFromTotals(entry, exit)
		} else {
			const r = countEntryExitForDay(dayLogs)
			entry = r.entry
			exit = r.exit
			current = r.current
		}
		rows.push({
			key: `stats-${dateStr}-${zl}`,
			日期: dateStr,
			"區域-地點": zl,
			進場人數: String(entry),
			出場人數: String(exit),
			在場人數: String(current),
		})
	}
	return rows
})

type UnitStatsRow = {
	key: string
	日期: string
	"區域-地點": string
	單位名稱: string
	進場人數: string
	出場人數: string
	在場人數: string
	hasOnSite: boolean
}

const unitStatsTableRows = computed((): UnitStatsRow[] => {
	const zl = zoneLocationLabel.value
	if (filterZoneLocationUnit.value && zl !== filterZoneLocationUnit.value) return []
	const datesDesc = [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a))
	const rows: UnitStatsRow[] = []
	for (const dateStr of datesDesc) {
		const dayLogs = groupsByDate.value.get(dateStr)!
		if (
			useIsapiSnapshotTotals.value &&
			effectiveSnapshot.value?.units?.length &&
			datesDesc.length === 1
		) {
			for (const u of effectiveSnapshot.value.units!) {
				rows.push({
					key: `unit-${dateStr}-${u.name}`,
					日期: dateStr,
					"區域-地點": zl,
					單位名稱: u.name,
					進場人數: String(u.entryCount ?? 0),
					出場人數: String(u.exitCount ?? 0),
					在場人數: String(u.currentCount ?? 0),
					hasOnSite: (u.currentCount ?? 0) > 0,
				})
			}
		} else {
			const unitStats = getUnitStatsForDay(dayLogs)
			for (const u of unitStats) {
				rows.push({
					key: `unit-${dateStr}-${u.unitName}`,
					日期: dateStr,
					"區域-地點": zl,
					單位名稱: u.unitName,
					進場人數: String(u.entry),
					出場人數: String(u.exit),
					在場人數: String(u.current),
					hasOnSite: u.current > 0,
				})
			}
		}
	}
	return rows
})

const detailTableRows = computed(() => {
	const zl = zoneLocationLabel.value
	const cols = displayColumns.value
	const datesDesc = [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a))
	type DetailRow = { key: string; isEntryOnly: boolean; cells: string[] }
	const rows: DetailRow[] = []
	for (const dateStr of datesDesc) {
		const dayLogs = groupsByDate.value.get(dateStr)!
		const entryOnlyLastLogMap = new Map<string, PeopleCountingLog>()
		for (const log of getEntryOnlyPersonsForDay(dayLogs)) {
			entryOnlyLastLogMap.set(countingPersonKey(log), log)
		}
		const sorted = [...dayLogs].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		)
		for (const log of sorted) {
			const personKey = countingPersonKey(log)
			const isEntryOnly = entryOnlyLastLogMap.has(personKey)
			const lastEntryLog = entryOnlyLastLogMap.get(personKey)
			const unitName = (log.unit?.name ?? log.unitName ?? "").trim() || "－"
			if (filterZoneLocationDetail.value && zl !== filterZoneLocationDetail.value) continue
			if (filterUnitName.value && unitName !== filterUnitName.value) continue
			const labeled = buildLogDetailRow(log, cols)
			const cells = cols.map((col) => labeled[PEOPLE_COUNTING_LOG_COLUMN_LABELS[col]] ?? "—")
			rows.push({
				key: `log-${log.id ?? dateStr}-${personKey}-${log.timestamp}`,
				isEntryOnly: isEntryOnly && lastEntryLog === log,
				cells,
			})
		}
	}
	return rows.sort((a, b) => {
		const timeIdx = cols.indexOf("time")
		const ta = timeIdx >= 0 ? a.cells[timeIdx] || "" : ""
		const tb = timeIdx >= 0 ? b.cells[timeIdx] || "" : ""
		return tb.localeCompare(ta)
	})
})

const DETAIL_PAGE_SIZE = 10
const detailPage = ref(1)

watch([filterZoneLocationDetail, filterUnitName], () => {
	detailPage.value = 1
})

const totalDetailPages = computed(() =>
	Math.max(1, Math.ceil(detailTableRows.value.length / DETAIL_PAGE_SIZE))
)

const detailTableRowsPaginated = computed(() => {
	const rows = detailTableRows.value
	const start = (detailPage.value - 1) * DETAIL_PAGE_SIZE
	return rows.slice(start, start + DETAIL_PAGE_SIZE)
})

watch(totalDetailPages, (total) => {
	if (detailPage.value > total) detailPage.value = Math.max(1, total)
})

const handleDetailPrevPage = () => {
	if (detailPage.value > 1) detailPage.value -= 1
}

const handleDetailNextPage = () => {
	if (detailPage.value < totalDetailPages.value) detailPage.value += 1
}

const STATS_HEADERS = ["日期", "區域-地點", "進場人數", "出場人數", "在場人數"]
const UNIT_STATS_HEADERS = ["日期", "區域-地點", "單位名稱", "進場人數", "出場人數", "在場人數"]

const firstDateStr = computed(() => (props.logs.length > 0 ? getDateKey(props.logs[0]) : ""))

const handleExportCsv = () => {
	if (props.logs.length === 0) return
	const dateStr = firstDateStr.value.replace(/\//g, "-") || new Date().toISOString().slice(0, 10)
	const parts: string[] = []
	parts.push("進出統計")
	parts.push(buildCsvSection(STATS_HEADERS, statsTableRows.value, { backupStyle: true }))
	parts.push("")
	parts.push("單位統計")
	parts.push(
		buildCsvSection(
			UNIT_STATS_HEADERS,
			unitStatsTableRows.value.map((r) => ({
				日期: r.日期,
				"區域-地點": r["區域-地點"],
				單位名稱: r.單位名稱,
				進場人數: r.進場人數,
				出場人數: r.出場人數,
				在場人數: r.在場人數,
			})),
			{ backupStyle: true }
		)
	)
	parts.push("")
	parts.push("進出紀錄")
	const detailHeadersCsv = detailHeaders.value
	parts.push(
		buildCsvSection(
			detailHeadersCsv,
			detailTableRows.value.map((r) => {
				const obj: Record<string, string> = {}
				detailHeadersCsv.forEach((h, i) => {
					obj[h] = r.cells[i] ?? ""
				})
				return obj
			}),
			{ backupStyle: true }
		)
	)
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
