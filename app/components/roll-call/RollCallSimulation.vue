<template>
	<section class="section-card min-h-[664px]">
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
				<TimeRangePicker v-model="timeRangeModel" :presets="[...TIME_RANGE_PRESETS_FULL_REPORT]" />
				<button
					type="button"
					:disabled="filteredSessions.length === 0"
					class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					aria-label="匯出 Excel"
					@click="handleExportXlsx"
				>
					匯出 Excel
				</button>
			</div>
		</div>

		<div
			v-if="loading"
			class="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-8 text-center"
		>
			<p class="text-base text-white/70 2xl:text-lg">載入報表中…</p>
		</div>
		<div
			v-else-if="filteredSessions.length === 0"
			class="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-8 text-center"
		>
			<p class="text-base text-white/70 2xl:text-lg">尚無簽到場次</p>
		</div>

		<div v-else class="space-y-6">
			<div class="show-scrollbar max-h-[40vh] overflow-y-auto">
				<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
					簽到統計
				</h3>
				<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
					<thead class="monitoring-chip-bg">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">日期</th>
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">規則</th>
							<th class="whitespace-nowrap border border-white/20 p-2">{{ reportLabels.expected }}</th>
							<th class="whitespace-nowrap border border-white/20 p-2">{{ reportLabels.present }}</th>
							<th class="whitespace-nowrap border border-white/20 p-2">{{ reportLabels.absent }}</th>
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
							<td class="border border-white/20 p-2">{{ row.規則 }}</td>
							<td class="border border-white/20 p-2">{{ row.expectedCount }}</td>
							<td class="border border-white/20 p-2">{{ row.presentCount }}</td>
							<td class="border border-white/20 p-2">{{ row.absentCount }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="show-scrollbar max-h-[40vh] overflow-y-auto">
				<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
					群組統計
				</h3>
				<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
					<thead class="monitoring-chip-bg">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">日期</th>
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">群組</th>
							<th class="whitespace-nowrap border border-white/20 p-2">{{ reportLabels.expected }}</th>
							<th class="whitespace-nowrap border border-white/20 p-2">{{ reportLabels.present }}</th>
							<th class="whitespace-nowrap border border-white/20 p-2">{{ reportLabels.absent }}</th>
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
							<td class="border border-white/20 p-2">{{ row.群組 }}</td>
							<td class="border border-white/20 p-2">{{ row.expectedCount }}</td>
							<td class="border border-white/20 p-2">{{ row.presentCount }}</td>
							<td
								class="border border-white/20 p-2"
								:class="row.hasAbsent ? 'bg-red-500/80 font-semibold' : ''"
							>
								{{ row.absentCount }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="max-h-[75vh] overflow-y-auto">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h3 class="w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
						簽到名單
					</h3>
					<SearchInput
						v-model="searchQuery"
						input-id="roll-call-report-search"
						label="搜尋工號或姓名"
						placeholder="搜尋 ID / 姓名"
						aria-label="搜尋工號或姓名"
						type="search"
					/>
				</div>
				<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
					<thead class="monitoring-chip-bg">
						<tr class="text-white/90">
							<th
								v-for="header in DETAIL_HEADERS"
								:key="header"
								class="whitespace-nowrap border border-white/20 p-2"
							>
								{{ header }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in detailRowsPaginated"
							:key="row.key"
							class="border-b border-white/10 text-white"
							:class="row.isAbsent ? 'bg-red-500/40' : ''"
						>
							<td
								v-for="(cell, idx) in row.cells"
								:key="`${row.key}-${idx}`"
								class="border border-white/20 p-2"
							>
								<button
									v-if="isNameColumn(idx) && canPreviewPhoto(row.record)"
									type="button"
									class="text-left text-cyan-300 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400"
									:aria-label="`檢視 ${cell} 圖片`"
									@click="handleOpenPhotoLightbox(row.record)"
								>
									{{ cell }}
								</button>
								<template v-else>{{ cell }}</template>
							</td>
						</tr>
					</tbody>
				</table>
				<Pagination
					:total="detailRows.length"
					:offset="detailOffset"
					:limit="DETAIL_PAGE_SIZE"
					:show="detailRows.length > DETAIL_PAGE_SIZE"
					@previous="handleDetailPrevious"
					@next="handleDetailNext"
				/>
			</div>
		</div>
	</section>

	<MediaLightbox
		:image-url="lightboxImageUrl"
		alt="簽到圖片"
		aria-label="簽到圖片放大檢視"
		@close="closeLightbox"
	/>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import MediaLightbox from "~/components/common/MediaLightbox.vue"
import Pagination from "~/components/common/Pagination.vue"
import SearchInput from "~/components/common/SearchInput.vue"
import TimeRangePicker from "~/components/common/TimeRangePicker.vue"
import { canResolveMedia, useResolvedMediaList } from "~/composables/core/useImageCenter"
import { useMediaLightbox } from "~/composables/core/useMediaLightbox"
import { downloadReportWorkbook } from "~/utils/xlsxExport"
import { TIME_RANGE_PRESETS_FULL_REPORT } from "~/utils/dateUtils"
import type { RollCallReportAttendanceRow, RollCallReportSession } from "~/types/rollCall"
import {
	normalizeRollCallStatLabels,
	resolveSharedRollCallStatLabels,
	type RollCallStatLabels,
} from "~/utils/statLabels"

export type RollCallReportLocationOption = {
	locationId: number
	label: string
	zoneName: string
	locationName: string
	statLabels?: Partial<RollCallStatLabels> | null
}

const DETAIL_HEADERS = ["日期", "區域-地點", "群組", "姓名", "狀態", "簽到時間"] as const
const NAME_COLUMN_INDEX = DETAIL_HEADERS.indexOf("姓名")
const DETAIL_PAGE_SIZE = 10

const props = defineProps<{
	sessions: RollCallReportSession[]
	attendance: RollCallReportAttendanceRow[]
	locationOptions: RollCallReportLocationOption[]
	timeRange: { startDate: string; endDate: string; preset: string }
	loading?: boolean
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
const detailOffset = ref(0)

const locationFilterOptions = computed(() => [
	{ value: "", label: "全部" },
	...props.locationOptions.map((opt) => ({
		value: String(opt.locationId),
		label: opt.label,
	})),
])

const zoneLocationLabel = (zoneName: string, locationName: string, locationId: number) => {
	const label = [zoneName, locationName].filter(Boolean).join("-")
	return label || String(locationId)
}

const filteredSessions = computed(() => {
	const loc = filterLocationId.value
	if (!loc) return props.sessions
	return props.sessions.filter((s) => String(s.locationId) === loc)
})

const filteredSessionIdSet = computed(() => new Set(filteredSessions.value.map((s) => s.id)))

const filteredAttendance = computed(() => {
	const ids = filteredSessionIdSet.value
	return props.attendance.filter((row) => ids.has(row.sessionId))
})

const reportRowKey = (row: RollCallReportAttendanceRow) => `${row.sessionId}-${row.personId}`

/** 僅簽到當次門禁事件抓拍；不使用平台人臉大頭照 */
const reportPhotoRaw = (row: RollCallReportAttendanceRow) =>
	(row.eventPhotoUrl || "").trim() || null

const { urls: imageUrls, errors: imageErrors } = useResolvedMediaList(
	toRef(props, "attendance"),
	{
		getRaw: (row) => reportPhotoRaw(row),
		getId: (row) => reportRowKey(row),
	},
)
const { lightboxImageUrl, openLightbox, closeLightbox } = useMediaLightbox()

const canPreviewPhoto = (row: RollCallReportAttendanceRow) =>
	canResolveMedia(reportRowKey(row), reportPhotoRaw(row), imageUrls.value, imageErrors.value)

const handleOpenPhotoLightbox = (row: RollCallReportAttendanceRow) => {
	if (!canPreviewPhoto(row)) return
	openLightbox(imageUrls.value[reportRowKey(row)])
}

const isNameColumn = (idx: number) => idx === NAME_COLUMN_INDEX

const statusLabel = (status: string) => {
	if (status === "present") return "已簽到"
	if (status === "absent") return "未到"
	return "尚未簽到"
}

const formatCheckedInTime = (checkedInAt: string | null | undefined) => {
	if (!checkedInAt) return "—"
	const d = new Date(checkedInAt)
	if (Number.isNaN(d.getTime())) return "—"
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const formatDisplayDate = (ymd: string) => {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || "")
	if (!m) return ymd || "—"
	return `${m[1]}/${m[2]}/${m[3]}`
}

const reportLabels = computed(() => {
	const locFilter = filterLocationId.value
	const opts = props.locationOptions
	const scoped = locFilter
		? opts.filter((o) => String(o.locationId) === locFilter)
		: opts
	return resolveSharedRollCallStatLabels(
		scoped.map((o) => normalizeRollCallStatLabels(o.statLabels)),
	)
})

const statsHeaders = computed(() => [
	"日期",
	"區域-地點",
	"規則",
	reportLabels.value.expected,
	reportLabels.value.present,
	reportLabels.value.absent,
])

const groupStatsHeaders = computed(() => [
	"日期",
	"區域-地點",
	"群組",
	reportLabels.value.expected,
	reportLabels.value.present,
	reportLabels.value.absent,
])

const statsTableRows = computed(() =>
	filteredSessions.value.map((s) => ({
		key: `session-${s.id}`,
		日期: formatDisplayDate(s.sessionDate),
		"區域-地點": zoneLocationLabel(s.zoneName, s.locationName, s.locationId),
		規則: s.ruleName || "—",
		expectedCount: String(s.expectedCount ?? 0),
		presentCount: String(s.presentCount ?? 0),
		absentCount: String(s.absentCount ?? 0),
	})),
)

const groupStatsTableRows = computed(() => {
	const map = new Map<
		string,
		{ 日期: string; "區域-地點": string; 群組: string; expected: number; present: number }
	>()
	for (const row of filteredAttendance.value) {
		const date = formatDisplayDate(row.sessionDate)
		const zl = zoneLocationLabel(row.zoneName, row.locationName, row.locationId)
		const groupName = row.groupName || "未分組"
		const key = `${row.sessionDate}::${row.locationId}::${row.groupId}`
		const cur = map.get(key) || {
			日期: date,
			"區域-地點": zl,
			群組: groupName,
			expected: 0,
			present: 0,
		}
		cur.expected += 1
		if (row.status === "present") cur.present += 1
		map.set(key, cur)
	}
	return [...map.entries()].map(([key, cur]) => {
		const absent = Math.max(0, cur.expected - cur.present)
		return {
			key,
			日期: cur.日期,
			"區域-地點": cur["區域-地點"],
			群組: cur.群組,
			expectedCount: String(cur.expected),
			presentCount: String(cur.present),
			absentCount: String(absent),
			hasAbsent: absent > 0,
		}
	})
})

const detailRows = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	const rows = filteredAttendance.value.filter((row) => {
		if (!q) return true
		const emp = String(row.employeeNo || "").toLowerCase()
		const name = String(row.fullName || "").toLowerCase()
		return emp.includes(q) || name.includes(q)
	})
	return rows.map((row) => ({
		key: reportRowKey(row),
		isAbsent: row.status !== "present",
		record: row,
		cells: [
			formatDisplayDate(row.sessionDate),
			zoneLocationLabel(row.zoneName, row.locationName, row.locationId),
			row.groupName || "未分組",
			row.fullName || row.employeeNo || "—",
			statusLabel(row.status),
			formatCheckedInTime(row.checkedInAt),
		],
	}))
})

const detailRowsPaginated = computed(() =>
	detailRows.value.slice(detailOffset.value, detailOffset.value + DETAIL_PAGE_SIZE),
)

watch([filterLocationId, searchQuery], () => {
	detailOffset.value = 0
})

watch(
	() => props.attendance.length,
	() => {
		detailOffset.value = 0
	},
)

const handleDetailPrevious = () => {
	detailOffset.value = Math.max(0, detailOffset.value - DETAIL_PAGE_SIZE)
}

const handleDetailNext = () => {
	if (detailOffset.value + DETAIL_PAGE_SIZE < detailRows.value.length) {
		detailOffset.value += DETAIL_PAGE_SIZE
	}
}

const handleExportXlsx = () => {
	if (filteredSessions.value.length === 0) return
	const dateStr =
		filteredSessions.value[0]?.sessionDate?.replace(/\//g, "-") ||
		new Date().toISOString().slice(0, 10)
	const labels = reportLabels.value
	const mapStatsExport = (row: {
		日期: string
		"區域-地點": string
		規則?: string
		群組?: string
		expectedCount: string
		presentCount: string
		absentCount: string
	}) => {
		const base: Record<string, string> = {
			日期: row.日期,
			"區域-地點": row["區域-地點"],
			[labels.expected]: row.expectedCount,
			[labels.present]: row.presentCount,
			[labels.absent]: row.absentCount,
		}
		if (row.規則 != null) base["規則"] = row.規則
		if (row.群組 != null) base["群組"] = row.群組
		return base
	}
	downloadReportWorkbook(
		[
			{
				title: "簽到統計",
				headers: statsHeaders.value,
				rows: statsTableRows.value.map(mapStatsExport),
			},
			{
				title: "群組統計",
				headers: groupStatsHeaders.value,
				rows: groupStatsTableRows.value.map(mapStatsExport),
			},
		],
		{
			title: "簽到名單",
			headers: [...DETAIL_HEADERS],
			rows: detailRows.value.map((r) =>
				Object.fromEntries(DETAIL_HEADERS.map((h, i) => [h, r.cells[i] ?? ""])),
			),
		},
		`時段簽到報表_${dateStr}.xlsx`,
	)
}
</script>
