<template>
	<section class="min-h-[664px] rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<p class="text-base text-white/70 2xl:text-lg">共 {{ locationFilteredLogs.length }} 筆紀錄</p>
			<div class="flex flex-wrap items-center gap-3 2xl:gap-4">
				<div v-if="locationFilterOptions.length > 1" class="flex items-center gap-2">
					<label class="text-sm text-white/70 2xl:text-base">區域-地點：</label>
					<div class="min-w-[10rem]">
						<FilterDropdown
							v-model="filterLocationId"
							:options="locationFilterOptions"
							placeholder="全部"
							text-size="text-sm 2xl:text-base"
						/>
					</div>
				</div>
				<TimeRangePicker v-model="timeRangeModel" :presets="[...TIME_RANGE_PRESETS_FULL_REPORT]" />
				<button
					type="button"
					:disabled="locationFilteredLogs.length === 0"
					class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					aria-label="匯出 CSV"
					@click="handleExportCsv"
				>
					匯出 CSV
				</button>
			</div>
		</div>

		<div
			v-if="locationFilteredLogs.length === 0"
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
					<div class="flex items-center gap-2">
						<label for="people-counting-report-search" class="sr-only">搜尋工號或姓名</label>
						<div class="relative">
							<input
								id="people-counting-report-search"
								v-model="searchQuery"
								type="search"
								placeholder="工號或姓名"
								class="min-w-[10rem] rounded-xl border border-white/20 bg-white/10 py-2 pe-10 ps-3 text-sm text-white placeholder:text-white/50 focus:border-cyan-400/60 focus:outline-none 2xl:min-w-[12rem] 2xl:py-2.5 2xl:text-base"
								autocomplete="off"
								aria-label="搜尋工號或姓名"
							/>
							<button
								v-if="searchQuery.trim()"
								type="button"
								class="absolute inset-y-0 end-2 my-auto flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-white/10 2xl:h-8 2xl:w-8"
								aria-label="清除搜尋"
								@click="handleClearSearch"
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									class="h-4 w-4 2xl:h-5 2xl:w-5"
									aria-hidden="true"
								>
									<path
										d="M6 6l12 12M18 6L6 18"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</button>
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
								v-for="(cell, idx) in row.cells"
								:key="`${row.key}-${idx}`"
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
import { formatDate, TIME_RANGE_PRESETS_FULL_REPORT } from "~/utils/dateUtils"
import { buildCsvSection } from "~/utils/csvExport"
import {
	countingPersonKey,
	countEntryExitForDay,
	cumulativePresenceFromTotals,
	getEntryOnlyPersonsForDay,
	getUnitStatsForDay,
} from "~/utils/peopleCountingTransition"
import {
	DEFAULT_LOG_DISPLAY_COLUMNS,
	normalizeLogDisplayColumns,
	PEOPLE_COUNTING_LOG_COLUMN_LABELS,
	buildLogDetailRow,
} from "~/utils/peopleCountingLogColumns"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

export type PeopleCountingSimulationLocationOption = {
	locationId: number
	label: string
	zoneName: string
	locationName: string
	dataSource?: "yscp" | "access_control" | "isapi_camera"
}

export type PeopleCountingSimulationLocationSummary = {
	entryCount: number
	exitCount: number
	units?: Array<{
		name: string
		entryCount?: number
		exitCount?: number
		currentCount?: number
		[key: string]: unknown
	}>
	dataSource?: "yscp" | "access_control" | "isapi_camera"
}

const props = defineProps<{
	logs: PeopleCountingLog[]
	locationOptions: PeopleCountingSimulationLocationOption[]
	locationSummaries?: Record<number, PeopleCountingSimulationLocationSummary>
	locationDisplayColumns?: Record<number, string[] | null | undefined>
	timeRange: { startDate: string; endDate: string; preset: string }
}>()

const emit = defineEmits<{
	"update:timeRange": [v: { startDate: string; endDate: string; preset: string }]
}>()

const timeRangeModel = computed({
	get: () => props.timeRange,
	set: (v) => emit("update:timeRange", v),
})

const filterLocationId = ref("")
const searchQuery = ref("")

const locationLabelById = computed(() => {
	const map = new Map<number, string>()
	for (const opt of props.locationOptions) {
		map.set(opt.locationId, opt.label)
	}
	return map
})

const locationFilterOptions = computed(() => [
	{ value: "", label: "全部" },
	...props.locationOptions.map((opt) => ({
		value: String(opt.locationId),
		label: opt.label,
	})),
])

const getZoneLocationLabel = (log: PeopleCountingLog): string => {
	const fromMap = locationLabelById.value.get(log.locationId)
	if (fromMap) return fromMap
	return String(log.locationId)
}

const matchesSearch = (log: PeopleCountingLog, query: string): boolean => {
	const q = query.trim().toLowerCase()
	if (!q) return true
	const emp = log.employeeId != null ? String(log.employeeId).trim().toLowerCase() : ""
	const name = log.personName != null ? String(log.personName).trim().toLowerCase() : ""
	return emp.includes(q) || name.includes(q)
}

/** 地點篩選：影響全部區塊 */
const locationFilteredLogs = computed(() => {
	const locFilter = filterLocationId.value
	return props.logs.filter((log) => {
		if (locFilter && String(log.locationId) !== locFilter) return false
		return true
	})
})

/** 搜尋：僅影響進出紀錄 */
const detailFilteredLogs = computed(() => {
	const q = searchQuery.value
	return locationFilteredLogs.value.filter((log) => matchesSearch(log, q))
})

const selectedLocationIdNum = computed(() => {
	const v = filterLocationId.value
	if (!v) return null
	const n = Number(v)
	return Number.isFinite(n) ? n : null
})

const useIsapiSnapshotTotals = computed(() => {
	if (props.timeRange.preset !== "today") return false
	const locId = selectedLocationIdNum.value
	if (locId == null) return false
	const summary = props.locationSummaries?.[locId]
	return summary?.dataSource === "isapi_camera" && summary != null
})

const effectiveSnapshot = computed(() => {
	const locId = selectedLocationIdNum.value
	if (locId == null) return null
	return props.locationSummaries?.[locId] ?? null
})

const getDateKey = (log: PeopleCountingLog): string => {
	if (!log.timestamp) return ""
	const s = log.timestamp
	const i = s.indexOf(" ")
	return i !== -1 ? s.slice(0, i) : formatDate(s)
}

/** 依日期 + 地點分組 */
const groupsByDateAndLocation = computed(() => {
	const g = new Map<string, PeopleCountingLog[]>()
	for (const log of locationFilteredLogs.value) {
		const d = getDateKey(log)
		if (!d) continue
		const key = `${d}::${log.locationId}`
		if (!g.has(key)) g.set(key, [])
		g.get(key)!.push(log)
	}
	return g
})

const statsTableRows = computed(() => {
	const rows: Array<Record<string, string> & { key: string }> = []
	const keys = [...groupsByDateAndLocation.value.keys()].sort((a, b) => b.localeCompare(a))

	for (const groupKey of keys) {
		const dayLogs = groupsByDateAndLocation.value.get(groupKey)!
		const dateStr = groupKey.split("::")[0] ?? ""
		const zl = getZoneLocationLabel(dayLogs[0]!)
		let entry: number
		let exit: number
		let current: number

		if (
			useIsapiSnapshotTotals.value &&
			effectiveSnapshot.value &&
			keys.length === 1 &&
			selectedLocationIdNum.value === dayLogs[0]?.locationId
		) {
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
			key: `stats-${groupKey}`,
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
	const rows: UnitStatsRow[] = []
	const keys = [...groupsByDateAndLocation.value.keys()].sort((a, b) => b.localeCompare(a))

	for (const groupKey of keys) {
		const dayLogs = groupsByDateAndLocation.value.get(groupKey)!
		const dateStr = groupKey.split("::")[0] ?? ""
		const zl = getZoneLocationLabel(dayLogs[0]!)
		const locId = dayLogs[0]?.locationId

		if (
			useIsapiSnapshotTotals.value &&
			effectiveSnapshot.value?.units?.length &&
			keys.length === 1 &&
			selectedLocationIdNum.value === locId
		) {
			for (const u of effectiveSnapshot.value.units!) {
				rows.push({
					key: `unit-${groupKey}-${u.name}`,
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
					key: `unit-${groupKey}-${u.unitName}`,
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

type DetailRow = {
	key: string
	isEntryOnly: boolean
	cells: string[]
}

const effectiveDisplayColumns = computed(() => {
	const locId = selectedLocationIdNum.value
	const raw = locId == null ? null : (props.locationDisplayColumns?.[locId] ?? null)
	// 完整報表：不顯示「設備截圖」
	return normalizeLogDisplayColumns(raw).filter((k) => k !== "screenshot")
})

const detailHeaders = computed(() => {
	const fixed = ["區域-地點", "人員群組"]
	const dynamic = effectiveDisplayColumns.value.map((k) => PEOPLE_COUNTING_LOG_COLUMN_LABELS[k])
	return [...fixed, ...dynamic]
})

const detailTableRows = computed((): DetailRow[] => {
	const rows: DetailRow[] = []
	const byDate = new Map<string, PeopleCountingLog[]>()
	for (const log of detailFilteredLogs.value) {
		const d = getDateKey(log)
		if (!d) continue
		if (!byDate.has(d)) byDate.set(d, [])
		byDate.get(d)!.push(log)
	}
	const datesDesc = [...byDate.keys()].sort((a, b) => b.localeCompare(a))

	for (const dateStr of datesDesc) {
		const dayLogs = byDate.get(dateStr)!
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
			const unitName = (log.unit?.name ?? log.unitName ?? "").trim() || "—"
			const zl = getZoneLocationLabel(log)
			const labeled = buildLogDetailRow(log, effectiveDisplayColumns.value)
			const cells = detailHeaders.value.map((h) => {
				if (h === "區域-地點") return zl
				if (h === "人員群組") return unitName
				return labeled[h] ?? "—"
			})

			rows.push({
				key: `log-${log.id ?? dateStr}-${personKey}-${log.timestamp}`,
				isEntryOnly: isEntryOnly && lastEntryLog === log,
				cells,
			})
		}
	}
	const timeHeader = PEOPLE_COUNTING_LOG_COLUMN_LABELS.time
	const timeIdx = detailHeaders.value.indexOf(timeHeader)
	if (timeIdx < 0) return rows
	return rows.sort((a, b) => {
		const ta = a.cells[timeIdx] ?? ""
		const tb = b.cells[timeIdx] ?? ""
		return String(tb).localeCompare(String(ta))
	})
})

const DETAIL_PAGE_SIZE = 10
const detailPage = ref(1)

watch([filterLocationId, searchQuery], () => {
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

const firstDateStr = computed(() =>
	locationFilteredLogs.value.length > 0 ? getDateKey(locationFilteredLogs.value[0]!) : ""
)

const handleClearSearch = () => {
	searchQuery.value = ""
}

const handleExportCsv = () => {
	if (locationFilteredLogs.value.length === 0) return
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
	parts.push(
		buildCsvSection(
			detailHeaders.value,
			detailTableRows.value.map((r) =>
				Object.fromEntries(detailHeaders.value.map((h, i) => [h, r.cells[i] ?? ""]))
			),
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
