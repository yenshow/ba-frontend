<template>
	<section class="min-h-[664px] rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<p class="text-base text-white/70 2xl:text-lg">共 {{ mergedDetailReadings.length }} 筆讀數</p>
			<div class="flex items-center gap-3 2xl:gap-4">
				<TimeRangePicker v-model="timeRangeModel" :presets="[...TIME_RANGE_PRESETS_FULL_REPORT]" />
				<button
					type="button"
					:disabled="summaryTableRows.length === 0 && detailTableRows.length === 0"
					class="rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					aria-label="匯出 CSV"
					@click="handleExportCsv"
				>
					匯出 CSV
				</button>
			</div>
		</div>

		<template v-if="hasSummaryTable && summaryTableRows.length > 0">
			<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
				{{ summaryTitle }}
			</h3>
			<div class="mb-6 overflow-x-auto">
				<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
					<thead class="bg-white/20">
						<tr class="text-white/90">
							<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
							<th class="whitespace-nowrap border border-white/20 p-2">區間起點</th>
							<th v-for="col in allCols" :key="col" class="whitespace-nowrap border border-white/20 p-2">
								{{ col }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(row, idx) in summaryTableRows"
							:key="'sum-' + row.key"
							class="border-b border-white/10 text-white"
						>
							<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
							<td class="border border-white/20 p-2">{{ row.區間起點 }}</td>
							<td
								v-for="col in allCols"
								:key="col"
								class="border border-white/20 p-2"
								:class="(row._cellClasses as Record<string, string>)?.[col] || ''"
							>
								{{ row[col] }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>

		<h3 class="mb-3 w-fit border-b-2 border-white/70 text-lg text-white/90 2xl:text-xl">
			{{ detailTitle }}
		</h3>
		<div
			v-if="detailTableRows.length === 0"
			class="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 text-white/60"
		>
			尚無詳細資料
		</div>
		<div v-else class="show-scrollbar overflow-x-auto">
			<table class="w-full border-collapse border border-white/20 text-left text-sm 2xl:text-base">
				<thead class="bg-white/20">
					<tr class="text-white/90">
						<th class="whitespace-nowrap border border-white/20 p-2">區域-地點</th>
						<th class="whitespace-nowrap border border-white/20 p-2">記錄時間</th>
						<th v-for="col in allCols" :key="col" class="whitespace-nowrap border border-white/20 p-2">
							{{ col }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(row, index) in detailTableRows"
						:key="row.key"
						class="border-b border-white/10 text-white"
					>
						<td class="border border-white/20 p-2">{{ row["區域-地點"] }}</td>
						<td class="border border-white/20 p-2">{{ row.記錄時間 }}</td>
						<td
							v-for="col in allCols"
							:key="col"
							class="border border-white/20 p-2"
							:class="(row._cellClasses as Record<string, string>)?.[col] || ''"
						>
							{{ row[col] }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { SensorReading, SensorParameterType } from "~/types/environment";
import { formatDateTime, TIME_RANGE_PRESETS_FULL_REPORT } from "~/utils/dateUtils";
import { buildCsvSection } from "~/utils/csvExport";
import { formatSensorValue } from "~/utils/sensorUtils";
import TimeRangePicker from "~/components/common/TimeRangePicker.vue";

const paramCols = [
	"CO2",
	"HCHO",
	"PM10",
	"PM2.5",
	"TVOC",
	"風速",
	"噪音值",
	"濕度",
	"溫度"
] as const;

const derivedCols = ["AQI", "體感溫度"] as const;
const allCols = [...paramCols, ...derivedCols] as const;

type EnvTableRow = {
	key: string;
	"區域-地點": string;
	區間起點?: string;
	記錄時間?: string;
	_cellClasses?: Record<string, string>;
} & Record<(typeof allCols)[number], string>;

const props = defineProps<{
	summaryReadings: SensorReading[];
	detailReadings: SensorReading[];
	preset: string;
	zoneName: string;
	locationName: string;
	timeRange: { startDate: string; endDate: string; preset: string };
	getCellClass?: (type: SensorParameterType, value: number | null) => string;
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

const hasSummaryTable = computed(() => {
	const p = props.preset;
	return p === "today" || p === "yesterday";
});

const summaryTitle = computed(() => {
	if (props.preset === "today" || props.preset === "yesterday") return "每小時平均";
	return "彙總";
});

const detailTitle = computed(() => {
	if (props.preset === "today" || props.preset === "yesterday") return "詳細資料";
	// 週／月：頁面已改為 aggregated day（每日平均）
	return "每日平均";
});

const formatValue = (type: SensorParameterType, value: number | null | undefined): string =>
	formatSensorValue(type, value ?? null, { fallback: "" });

const PARAM_KEYS = [
	"co2",
	"hcho",
	"pm10",
	"pm25",
	"tvoc",
	"wind",
	"noise",
	"humidity",
	"temperature"
] as const;

const DERIVED_KEYS = ["aqi", "heatIndex"] as const;

/**
 * 依時間區間合併多筆讀數（同一區間內多設備的資料合併為一筆，同一參數取平均）
 * @param bucketMinutes 區間分鐘數。詳細資料建議 5（與後端寫入週期一致），同一地點多設備會整合在同一列
 */
function mergeReadingsByTime(
	readings: SensorReading[],
	bucketMinutes: number = 1
): Array<{ timestamp: string; data: SensorReading["data"] }> {
	if (readings.length === 0) return [];
	const msPerBucket = bucketMinutes * 60 * 1000;
	const roundToBucket = (ts: string) =>
		Math.floor(new Date(ts).getTime() / msPerBucket) * msPerBucket;
	const groups = new Map<number, SensorReading[]>();
	for (const r of readings) {
		const key = roundToBucket(r.timestamp);
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(r);
	}
	const merged: Array<{ timestamp: string; data: SensorReading["data"] }> = [];
	for (const [timeMs, list] of groups) {
		const data: SensorReading["data"] = {};
		for (const key of PARAM_KEYS) {
			const values = list
				.map(r => r.data?.[key])
				.filter((v): v is number => v != null && typeof v === "number" && !Number.isNaN(v));
			if (values.length > 0) data[key] = values.reduce((a, b) => a + b, 0) / values.length;
		}
		for (const key of DERIVED_KEYS) {
			const values = list
				.map(r => r.data?.[key])
				.filter((v): v is number => v != null && typeof v === "number" && !Number.isNaN(v));
			if (values.length > 0) data[key] = values.reduce((a, b) => a + b, 0) / values.length;
		}
		merged.push({ timestamp: new Date(timeMs).toISOString(), data });
	}
	return merged;
}

const normalizeReadings = (
	readings: SensorReading[]
): Array<{ timestamp: string; data: SensorReading["data"] }> =>
	(readings || []).map(r => ({ timestamp: r.timestamp, data: r.data || {} }));

const mergedSummaryReadings = computed(() => {
	if (!hasSummaryTable.value) return [];
	const rows = normalizeReadings(props.summaryReadings);
	rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
	return rows;
});

const mergedDetailReadings = computed(() => {
	const isDayRange = props.preset === "today" || props.preset === "yesterday";
	if (isDayRange) {
		// raw：以 5 分鐘區間合併，與後端寫入週期一致，同一地點多設備的資料會整合在同一列
		const merged = mergeReadingsByTime(props.detailReadings, 5);
		merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
		return merged;
	}

	// aggregated（day）：不需要再做分鐘 bucket 合併，只需排序
	const rows = normalizeReadings(props.detailReadings);
	rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	return rows;
});

const paramTypeMap: Record<(typeof paramCols)[number], SensorParameterType> = {
	CO2: "co2",
	HCHO: "hcho",
	PM10: "pm10",
	"PM2.5": "pm25",
	TVOC: "tvoc",
	風速: "wind",
	噪音值: "noise",
	濕度: "humidity",
	溫度: "temperature"
};

const formatDerivedValue = (
	key: (typeof DERIVED_KEYS)[number],
	value: number | null | undefined
): string => {
	if (value == null || typeof value !== "number" || Number.isNaN(value)) return "";
	if (key === "aqi") return String(Math.round(value));
	return String(Math.round(value * 10) / 10);
};

function readingToRow(
	r: { timestamp: string; data: SensorReading["data"] },
	index: number,
	timeLabel: "區間起點" | "記錄時間"
): EnvTableRow {
	const d = r.data || {};
	const key = `env-${index}-${r.timestamp}`;
	const timeVal = r.timestamp ? formatDateTime(r.timestamp, true) : "";
	const row: EnvTableRow = {
		key,
		"區域-地點": zoneLocationLabel.value,
		[timeLabel]: timeVal,
		CO2: formatValue("co2", d.co2),
		HCHO: formatValue("hcho", d.hcho),
		PM10: formatValue("pm10", d.pm10),
		"PM2.5": formatValue("pm25", d.pm25),
		TVOC: formatValue("tvoc", d.tvoc),
		風速: formatValue("wind", d.wind),
		噪音值: formatValue("noise", d.noise),
		濕度: formatValue("humidity", d.humidity),
		溫度: formatValue("temperature", d.temperature),
		AQI: formatDerivedValue("aqi", d.aqi),
		體感溫度: formatDerivedValue("heatIndex", d.heatIndex)
	};
	if (props.getCellClass) {
		row._cellClasses = {};
		for (const col of paramCols) {
			row._cellClasses[col] = props.getCellClass(paramTypeMap[col], d[paramTypeMap[col]] ?? null);
		}
	}
	return row;
}

const summaryTableRows = computed(() =>
	mergedSummaryReadings.value.map((r, i) => readingToRow(r, i, "區間起點"))
);

const detailTableRows = computed(() =>
	mergedDetailReadings.value.map((r, i) => readingToRow(r, i, "記錄時間"))
);

const CSV_HEADERS_SUMMARY = ["區域-地點", "區間起點", ...allCols];
const CSV_HEADERS_DETAIL = ["區域-地點", "記錄時間", ...allCols];

const handleExportCsv = () => {
	const dateStr = props.timeRange.startDate.slice(0, 10);
	const opts = { backupStyle: true };
	const stripMeta = (row: Record<string, unknown>) => {
		const { key: _k, _cellClasses: _c, ...rest } = row;
		return rest as Record<string, string>;
	};
	const summaryRows = summaryTableRows.value.map(stripMeta);
	const detailRows = detailTableRows.value.map(stripMeta);
	const parts: string[] = [];
	parts.push(summaryTitle.value);
	parts.push(buildCsvSection(CSV_HEADERS_SUMMARY, summaryRows, opts));
	parts.push("");
	parts.push(detailTitle.value);
	parts.push(buildCsvSection(CSV_HEADERS_DETAIL, detailRows, opts));
	const csvContent = "\uFEFF" + parts.join("\n");
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `environment_readings_${dateStr}.csv`;
	link.setAttribute("aria-label", "下載 CSV");
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};
</script>
