<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
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
					<select
						v-model="filterZoneLocation"
						class="filter-select rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none 2xl:py-2.5 2xl:text-base"
						aria-label="篩選區域-地點"
					>
						<option value="">全部</option>
						<option v-for="opt in zoneLocationOptions" :key="opt" :value="opt">
							{{ opt }}
						</option>
					</select>
				</div>
				<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
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
						<tr v-for="row in statsTableRows" :key="row.key" class="border-b border-white/10 text-white">
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
					<select
						v-model="filterZoneLocationUnit"
						class="filter-select rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none 2xl:py-2.5 2xl:text-base"
						aria-label="篩選區域-地點（單位統計）"
					>
						<option value="">全部</option>
						<option v-for="opt in zoneLocationOptions" :key="opt" :value="opt">
							{{ opt }}
						</option>
					</select>
				</div>
				<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
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
					<h3 class="w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">進出紀錄</h3>
					<div class="flex flex-wrap items-center gap-4">
						<div v-if="zoneLocationOptions.length >= 1" class="flex items-center gap-2">
							<label class="text-sm text-white/70 2xl:text-base">區域-地點：</label>
							<select
								v-model="filterZoneLocationDetail"
								class="filter-select rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none 2xl:py-2.5 2xl:text-base"
								aria-label="篩選區域-地點"
							>
								<option value="">全部</option>
								<option v-for="opt in zoneLocationOptions" :key="opt" :value="opt">
									{{ opt }}
								</option>
							</select>
						</div>
						<div class="flex items-center gap-2">
							<label class="text-sm text-white/70 2xl:text-base">單位名稱：</label>
							<select
								v-model="filterUnitName"
								class="filter-select rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none 2xl:py-2.5 2xl:text-base"
								aria-label="篩選單位名稱"
							>
								<option value="">全部</option>
								<option v-for="opt in unitNameOptions" :key="opt" :value="opt">
									{{ opt }}
								</option>
							</select>
						</div>
					</div>
				</div>
				<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">單位名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">人員姓名</th>
							<th class="whitespace-nowrap border border-white/20 p-2">出入口名稱</th>
							<th class="whitespace-nowrap border border-white/20 p-2">刷卡時間</th>
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
							<td class="border border-white/20 p-2">{{ row.單位名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.人員姓名 }}</td>
							<td class="border border-white/20 p-2">{{ row.出入口名稱 }}</td>
							<td class="border border-white/20 p-2">{{ row.刷卡時間 }}</td>
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
import type { PeopleCountingLog } from "~/types/peopleCounting";
import { formatDate, formatDateTime, TIME_RANGE_PRESETS_FULL_REPORT } from "~/utils/dateUtils";
import { buildCsvSection } from "~/utils/csvExport";
import {
	countEntryExitForDay,
	getEntryOnlyPersonsForDay,
	getUnitStatsForDay
} from "~/utils/peopleCountingAdapter";
import TimeRangePicker from "~/components/common/TimeRangePicker.vue";

const props = defineProps<{
	logs: PeopleCountingLog[];
	zoneName: string;
	locationName: string;
	timeRange: { startDate: string; endDate: string; preset: string };
}>();

const emit = defineEmits<{
	"update:timeRange": [v: { startDate: string; endDate: string; preset: string }];
}>();

const timeRangeModel = computed({
	get: () => props.timeRange,
	set: v => emit("update:timeRange", v)
});

const zoneLocationLabel = computed(() => {
	const z = props.zoneName || "";
	const l = props.locationName || "";
	return [z, l].filter(Boolean).join("-") || "-";
});

const filterZoneLocation = ref("");
const filterZoneLocationUnit = ref("");
const filterZoneLocationDetail = ref("");
const filterUnitName = ref("");

const zoneLocationOptions = computed(() =>
	zoneLocationLabel.value ? [zoneLocationLabel.value] : []
);

const unitNameOptions = computed(() => {
	const set = new Set<string>();
	for (const log of props.logs) {
		const name = (log.unit?.name ?? log.unitName ?? "").trim();
		if (name) set.add(name);
	}
	return [...set].sort();
});

const getDateKey = (log: PeopleCountingLog): string => {
	if (!log.timestamp) return "";
	const s = log.timestamp;
	const i = s.indexOf(" ");
	return i !== -1 ? s.slice(0, i) : formatDate(s);
};

const groupsByDate = computed(() => {
	const g = new Map<string, PeopleCountingLog[]>();
	for (const log of props.logs) {
		const d = getDateKey(log);
		if (!d) continue;
		if (!g.has(d)) g.set(d, []);
		g.get(d)!.push(log);
	}
	return g;
});

const directionLabel = (log: PeopleCountingLog) =>
	log.eventType === "entry" ? "進場" : log.eventType === "exit" ? "出場" : "失敗";

const statsTableRows = computed(() => {
	const zl = zoneLocationLabel.value;
	if (filterZoneLocation.value && zl !== filterZoneLocation.value) return [];
	const datesDesc = [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a));
	const rows: Array<Record<string, string> & { key: string }> = [];
	for (const dateStr of datesDesc) {
		const dayLogs = groupsByDate.value.get(dateStr)!;
		const { entry, exit } = countEntryExitForDay(dayLogs);
		const current = Math.max(0, entry - exit);
		rows.push({
			key: `stats-${dateStr}-${zl}`,
			日期: dateStr,
			"區域-地點": zl,
			進場人數: String(entry),
			出場人數: String(exit),
			在場人數: String(current)
		});
	}
	return rows;
});

type UnitStatsRow = {
	key: string;
	日期: string;
	"區域-地點": string;
	單位名稱: string;
	進場人數: string;
	出場人數: string;
	在場人數: string;
	hasOnSite: boolean;
};

const unitStatsTableRows = computed((): UnitStatsRow[] => {
	const zl = zoneLocationLabel.value;
	if (filterZoneLocationUnit.value && zl !== filterZoneLocationUnit.value) return [];
	const datesDesc = [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a));
	const rows: UnitStatsRow[] = [];
	for (const dateStr of datesDesc) {
		const dayLogs = groupsByDate.value.get(dateStr)!;
		const unitStats = getUnitStatsForDay(dayLogs);
		for (const u of unitStats) {
			rows.push({
				key: `unit-${dateStr}-${u.unitName}`,
				日期: dateStr,
				"區域-地點": zl,
				單位名稱: u.unitName,
				進場人數: String(u.entry),
				出場人數: String(u.exit),
				在場人數: String(u.current),
				hasOnSite: u.current > 0
			});
		}
	}
	return rows;
});

const detailTableRows = computed(() => {
	const zl = zoneLocationLabel.value;
	const datesDesc = [...groupsByDate.value.keys()].sort((a, b) => b.localeCompare(a));
	type DetailRow = {
		key: string;
		isEntryOnly: boolean;
		"區域-地點": string;
		單位名稱: string;
		人員姓名: string;
		出入口名稱: string;
		刷卡時間: string;
		方向: string;
	};
	const rows: DetailRow[] = [];
	for (const dateStr of datesDesc) {
		const dayLogs = groupsByDate.value.get(dateStr)!;
		const entryOnlyLastLogMap = new Map<string, PeopleCountingLog>();
		for (const log of getEntryOnlyPersonsForDay(dayLogs)) {
			entryOnlyLastLogMap.set(String(log.personnelId ?? log.employeeId ?? log.id ?? ""), log);
		}
		const sorted = [...dayLogs].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);
		for (const log of sorted) {
			const personKey = String(log.personnelId ?? log.employeeId ?? log.id ?? "");
			const isEntryOnly = entryOnlyLastLogMap.has(personKey);
			const lastEntryLog = entryOnlyLastLogMap.get(personKey);
			const unitName = (log.unit?.name ?? log.unitName ?? "").trim() || "－";
			if (filterZoneLocationDetail.value && zl !== filterZoneLocationDetail.value) continue;
			if (filterUnitName.value && unitName !== filterUnitName.value) continue;
			rows.push({
				key: `log-${log.id ?? dateStr}-${personKey}-${log.timestamp}`,
				isEntryOnly: isEntryOnly && lastEntryLog === log,
				"區域-地點": zl,
				單位名稱: unitName,
				人員姓名: log.personName ?? "",
				出入口名稱: log.deviceName ?? "",
				刷卡時間: log.timestamp ? formatDateTime(log.timestamp, true) : "",
				方向: directionLabel(log)
			});
		}
	}
	return rows.sort((a, b) => (b.刷卡時間 || "").localeCompare(a.刷卡時間 || ""));
});

const DETAIL_PAGE_SIZE = 10;
const detailPage = ref(1);

watch([filterZoneLocationDetail, filterUnitName], () => {
	detailPage.value = 1;
});

const totalDetailPages = computed(() =>
	Math.max(1, Math.ceil(detailTableRows.value.length / DETAIL_PAGE_SIZE))
);

const detailTableRowsPaginated = computed(() => {
	const rows = detailTableRows.value;
	const start = (detailPage.value - 1) * DETAIL_PAGE_SIZE;
	return rows.slice(start, start + DETAIL_PAGE_SIZE);
});

watch(totalDetailPages, total => {
	if (detailPage.value > total) detailPage.value = Math.max(1, total);
});

const handleDetailPrevPage = () => {
	if (detailPage.value > 1) detailPage.value -= 1;
};

const handleDetailNextPage = () => {
	if (detailPage.value < totalDetailPages.value) detailPage.value += 1;
};

const STATS_HEADERS = ["日期", "區域-地點", "進場人數", "出場人數", "在場人數"];
const UNIT_STATS_HEADERS = ["日期", "區域-地點", "單位名稱", "進場人數", "出場人數", "在場人數"];
const DETAIL_HEADERS = ["區域-地點", "單位名稱", "人員姓名", "出入口名稱", "刷卡時間", "方向"];

const firstDateStr = computed(() => (props.logs.length > 0 ? getDateKey(props.logs[0]) : ""));

const handleExportCsv = () => {
	if (props.logs.length === 0) return;
	const dateStr = firstDateStr.value.replace(/\//g, "-") || new Date().toISOString().slice(0, 10);
	const parts: string[] = [];
	parts.push("進出統計");
	parts.push(buildCsvSection(STATS_HEADERS, statsTableRows.value, { backupStyle: true }));
	parts.push("");
	parts.push("單位統計");
	parts.push(
		buildCsvSection(
			UNIT_STATS_HEADERS,
			unitStatsTableRows.value.map(r => ({
				日期: r.日期,
				"區域-地點": r["區域-地點"],
				單位名稱: r.單位名稱,
				進場人數: r.進場人數,
				出場人數: r.出場人數,
				在場人數: r.在場人數
			})),
			{ backupStyle: true }
		)
	);
	parts.push("");
	parts.push("進出紀錄");
	parts.push(
		buildCsvSection(
			DETAIL_HEADERS,
			detailTableRows.value.map(r => ({
				"區域-地點": r["區域-地點"],
				單位名稱: r.單位名稱,
				人員姓名: r.人員姓名,
				出入口名稱: r.出入口名稱,
				刷卡時間: r.刷卡時間,
				方向: r.方向
			})),
			{ backupStyle: true }
		)
	);
	const csvContent = "\uFEFF" + parts.join("\n");
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `people_counting_logs_${dateStr}.csv`;
	link.setAttribute("aria-label", "下載 CSV");
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};
</script>

<style scoped>
.filter-select option {
	background: rgb(30 41 59);
	color: rgb(248 250 252);
}
</style>
