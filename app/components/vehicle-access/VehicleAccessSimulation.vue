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
			class="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-8 text-center"
		>
			<p class="text-base text-white/70 2xl:text-lg">尚無過車紀錄</p>
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
							<th class="whitespace-nowrap border border-white/20 p-2">進場車輛</th>
							<th class="whitespace-nowrap border border-white/20 p-2">出場車輛</th>
							<th class="whitespace-nowrap border border-white/20 p-2">在場車輛</th>
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
							<td class="border border-white/20 p-2">{{ row.進場車輛 }}</td>
							<td class="border border-white/20 p-2">{{ row.出場車輛 }}</td>
							<td class="border border-white/20 p-2">{{ row.在場車輛 }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- 2. 群組統計 -->
			<div class="show-scrollbar max-h-[40vh] overflow-y-auto">
				<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
					群組統計
				</h3>
				<table
					class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base"
				>
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">日期</th>
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">群組名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">進場車輛</th>
							<th class="whitespace-nowrap border border-white/20 p-2">出場車輛</th>
							<th class="whitespace-nowrap border border-white/20 p-2">在場車輛</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in groupStatsTableRows"
							:key="row.key"
							class="border-b border-white/10 text-white"
						>
							<td class="border border-white/20 p-2">{{ row.日期 }}</td>
							<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
							<td class="border border-white/20 p-2">{{ row.群組名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.進場車輛 }}</td>
							<td class="border border-white/20 p-2">{{ row.出場車輛 }}</td>
							<td
								class="border border-white/20 p-2"
								:class="row.hasOnSite ? 'bg-red-500/80 font-semibold' : ''"
							>
								{{ row.在場車輛 }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- 3. 過車紀錄 -->
			<div class="max-h-[75vh] overflow-y-auto">
				<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
					過車紀錄
				</h3>
				<table
					class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base"
				>
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">車牌</th>
							<th class="whitespace-nowrap border border-white/20 p-2">過車時間</th>
							<th class="whitespace-nowrap border border-white/20 p-2">車道名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">車主名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">車輛群組</th>
							<th class="whitespace-nowrap border border-white/20 p-2">放行結果</th>
							<th class="whitespace-nowrap border border-white/20 p-2">方向</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in detailTableRowsPaginated"
							:key="row.key"
							class="border-b border-white/10 text-white"
							:class="row.isEntryOnly ? 'bg-red-500/80' : ''"
						>
							<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
							<td class="border border-white/20 p-2">{{ row.車牌 }}</td>
							<td class="border border-white/20 p-2">{{ row.過車時間 }}</td>
							<td class="border border-white/20 p-2">{{ row.車道名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.車主名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.車輛群組 }}</td>
							<td class="border border-white/20 p-2">{{ row.放行結果 }}</td>
							<td class="border border-white/20 p-2">{{ row.方向 }}</td>
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
import type { VehicleDataLog } from "~/types/vehicleAccess"
import { formatDate, formatDateTime, TIME_RANGE_PRESETS_FULL_REPORT } from "~/utils/dateUtils"
import { buildCsvSection } from "~/utils/csvExport"
import { getOnSitePassageLogIds, passageTransitionTotals } from "~/utils/vehicleAccessPassageStats"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"

const props = defineProps<{
	logs: VehicleDataLog[]
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

const getDateKey = (log: VehicleDataLog): string => {
	if (!log.trigger_time) return ""
	return formatDate(log.trigger_time)
}

const groupsByDate = computed(() => {
	const g = new Map<string, VehicleDataLog[]>()
	for (const log of props.logs) {
		const d = getDateKey(log)
		if (!d) continue
		if (!g.has(d)) g.set(d, [])
		g.get(d)!.push(log)
	}
	return g
})

const datesDesc = computed(() => [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a)))

/** 放行紀錄 transition 統計（與後端 entryExit 一致） */
const passageStats = passageTransitionTotals

const statsTableRows = computed(() => {
	const zl = zoneLocationLabel.value
	const rows: Array<Record<string, string> & { key: string }> = []
	for (const dateStr of datesDesc.value) {
		const dayLogs = groupsByDate.value.get(dateStr)!
		const { entry, exit, current } = passageStats(dayLogs)
		rows.push({
			key: `stats-${dateStr}-${zl}`,
			日期: dateStr,
			"區域-地點": zl,
			進場車輛: String(entry),
			出場車輛: String(exit),
			在場車輛: String(current),
		})
	}
	return rows
})

const getGroupName = (log: VehicleDataLog): string =>
	log.vehicle_list_name?.trim() || log.person_group_name?.trim() || "" || "(未指定群組)"

type GroupStatsRow = {
	key: string
	日期: string
	"區域-地點": string
	群組名稱: string
	進場車輛: string
	出場車輛: string
	在場車輛: string
	hasOnSite: boolean
}

const groupStatsTableRows = computed((): GroupStatsRow[] => {
	const zl = zoneLocationLabel.value
	const rows: GroupStatsRow[] = []
	for (const dateStr of datesDesc.value) {
		const dayLogs = groupsByDate.value.get(dateStr)!
		const byGroup = new Map<string, VehicleDataLog[]>()
		for (const log of dayLogs) {
			const name = getGroupName(log)
			if (!byGroup.has(name)) byGroup.set(name, [])
			byGroup.get(name)!.push(log)
		}
		for (const groupName of [...byGroup.keys()].sort()) {
			const { entry, exit, current } = passageStats(byGroup.get(groupName)!)
			rows.push({
				key: `group-${dateStr}-${groupName}`,
				日期: dateStr,
				"區域-地點": zl,
				群組名稱: groupName,
				進場車輛: String(entry),
				出場車輛: String(exit),
				在場車輛: String(current),
				hasOnSite: current > 0,
			})
		}
	}
	return rows
})

const allowResultLabel = (log: VehicleDataLog): string =>
	log.allow_result === 1 ? "放行" : "未放行"

const directionLabel = (log: VehicleDataLog): string =>
	log.lane_type === 1 ? "進場" : log.lane_type === 2 ? "出場" : "-"

/** 進場未出場的紀錄 ID 集合（用於表格背景凸顯） */
const onSiteLogIds = computed(() => getOnSitePassageLogIds(props.logs))

type DetailRow = {
	key: string
	isEntryOnly: boolean
	"區域-地點": string
	車牌: string
	過車時間: string
	車道名稱: string
	車主名稱: string
	車輛群組: string
	放行結果: string
	方向: string
}

const detailTableRows = computed((): DetailRow[] => {
	const zl = zoneLocationLabel.value
	const ids = onSiteLogIds.value
	const rows: DetailRow[] = []
	for (const dateStr of datesDesc.value) {
		const dayLogs = groupsByDate.value.get(dateStr)!
		const sorted = [...dayLogs].sort(
			(a, b) => new Date(b.trigger_time || 0).getTime() - new Date(a.trigger_time || 0).getTime()
		)
		for (const log of sorted) {
			rows.push({
				key: `log-${log.id}-${log.trigger_time}`,
				isEntryOnly: ids.has(log.id),
				"區域-地點": zl,
				車牌: log.license_plate?.trim() ?? "",
				過車時間: log.trigger_time ? formatDateTime(log.trigger_time, true) : "",
				車道名稱: log.lane_name?.trim() ?? "",
				車主名稱: log.owner_name?.trim() ?? "",
				車輛群組: log.vehicle_list_name?.trim() ?? "",
				放行結果: allowResultLabel(log),
				方向: directionLabel(log),
			})
		}
	}
	return rows
})

const DETAIL_PAGE_SIZE = 10
const detailPage = ref(1)

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

const STATS_HEADERS = ["日期", "區域-地點", "進場車輛", "出場車輛", "在場車輛"]
const GROUP_STATS_HEADERS = ["日期", "區域-地點", "群組名稱", "進場車輛", "出場車輛", "在場車輛"]
const DETAIL_HEADERS = [
	"區域-地點",
	"車牌",
	"過車時間",
	"車道名稱",
	"車主名稱",
	"車輛群組",
	"放行結果",
	"方向",
]

const firstDateStr = computed(() => statsTableRows.value[0]?.日期?.replace(/\//g, "-") ?? "")

const handleExportCsv = () => {
	if (props.logs.length === 0) return
	const dateStr = firstDateStr.value || new Date().toISOString().slice(0, 10)
	const parts: string[] = []
	parts.push("進出統計")
	parts.push(buildCsvSection(STATS_HEADERS, statsTableRows.value, { backupStyle: true }))
	parts.push("")
	parts.push("群組統計")
	parts.push(
		buildCsvSection(
			GROUP_STATS_HEADERS,
			groupStatsTableRows.value.map((r) => ({
				日期: r.日期,
				"區域-地點": r["區域-地點"],
				群組名稱: r.群組名稱,
				進場車輛: r.進場車輛,
				出場車輛: r.出場車輛,
				在場車輛: r.在場車輛,
			})),
			{ backupStyle: true }
		)
	)
	parts.push("")
	parts.push("過車紀錄")
	parts.push(
		buildCsvSection(
			DETAIL_HEADERS,
			detailTableRows.value.map((r) => ({
				"區域-地點": r["區域-地點"],
				車牌: r.車牌,
				過車時間: r.過車時間,
				車道名稱: r.車道名稱,
				車主名稱: r.車主名稱,
				車輛群組: r.車輛群組,
				放行結果: r.放行結果,
				方向: r.方向,
			})),
			{ backupStyle: true }
		)
	)
	const csvContent = "\uFEFF" + parts.join("\n")
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.href = url
	link.download = `vehicle_access_logs_${dateStr}.csv`
	link.setAttribute("aria-label", "下載 CSV")
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}
</script>
