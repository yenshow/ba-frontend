<script setup lang="ts">
import {
	Chart,
	Tooltip,
	registerables,
	type ActiveElement,
	type ChartDataset,
	type Plugin,
	type TooltipModel,
} from "chart.js"
import type { EnergyTrendPoint } from "~/types/energy"

Chart.register(...registerables)

const STROKE = "#00FFB5"
const COMPARE_STROKE = "#A6A6A6"
const STROKE_RGB = "0, 255, 181"
const HOUR_TICKS = new Set([0, 4, 8, 12, 16, 20, 24])

type TipRow = { label: string; value: string; color: string; dashed: boolean }
type TipState = { show: boolean; left: number; top: number; title: string; rows: TipRow[] }

/**
 * Chart.js positioner 參數是 ActiveElement[]（含 datasetIndex），不是 TooltipItem。
 * 今日系列固定為 datasets[0]。
 */
const positioners = Tooltip.positioners as unknown as Record<
	string,
	(els: readonly ActiveElement[]) => false | { x: number; y: number }
>
positioners.energyToday = (els) => {
	if (!els.length) return false
	const today = els.find((el) => el.datasetIndex === 0) ?? els[0]
	const pt = today?.element
	if (pt?.x == null || pt?.y == null) return false
	return { x: pt.x, y: pt.y }
}

/** hover：2px 上下漸層垂直光帶 */
const crosshairPlugin: Plugin<"line"> = {
	id: "energyTrendCrosshair",
	afterDraw: (c) => {
		const active = c.tooltip?.getActiveElements?.() ?? []
		if (active.length === 0) return
		const today = active.find((a) => a.datasetIndex === 0) ?? active[0]
		const x = today?.element?.x
		if (x == null) return
		const { top, bottom } = c.chartArea
		const ctx = c.ctx
		ctx.save()
		const grad = ctx.createLinearGradient(x, top, x, bottom)
		grad.addColorStop(0, `rgba(${STROKE_RGB}, 0)`)
		grad.addColorStop(0.2, `rgba(${STROKE_RGB}, 0.35)`)
		grad.addColorStop(0.5, `rgba(${STROKE_RGB}, 0.75)`)
		grad.addColorStop(0.8, `rgba(${STROKE_RGB}, 0.35)`)
		grad.addColorStop(1, `rgba(${STROKE_RGB}, 0)`)
		ctx.fillStyle = grad
		ctx.fillRect(x - 1, top, 2, bottom - top)
		ctx.restore()
	},
}

const props = defineProps<{
	series: EnergyTrendPoint[]
	mode: "energy" | "water"
	/** hour | day | month — 影響 X 軸標籤 */
	bucketType?: string
	/** 比對系列（日：昨天） */
	compareSeries?: EnergyTrendPoint[] | null
	compareLabel?: string | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tip = ref<TipState>({ show: false, left: 0, top: 0, title: "", rows: [] })
let chart: Chart | null = null

const isEnergy = computed(() => props.mode === "energy")
const unit = computed(() => (isEnergy.value ? "kWh" : "m³"))
const bucket = computed(() => props.bucketType || "hour")

const formatValue = (v: number | null | undefined) => {
	if (v == null || !Number.isFinite(v)) return "—"
	return Number(v).toLocaleString()
}

const pickValues = (pts: EnergyTrendPoint[]) =>
	pts.map((p) => (isEnergy.value ? p.energyKwh : p.waterM3))

const shouldShowDayTick = (index: number, total: number) => {
	if (total <= 8 || index === 0 || index === total - 1) return true
	const step = Math.max(1, Math.ceil((total - 1) / 6))
	return index % step === 0
}

const resolveHour = (d: Date, index: number, total: number) =>
	index === total - 1 && d.getHours() === 0 ? 24 : d.getHours()

const formatAxisLabel = (iso: string, index: number, total: number) => {
	const d = new Date(iso)
	if (bucket.value === "month") {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
	}
	if (bucket.value === "day") {
		if (!shouldShowDayTick(index, total)) return ""
		return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
	}
	const hour = resolveHour(d, index, total)
	if (!HOUR_TICKS.has(hour) && index !== 0 && index !== total - 1) return ""
	return `${String(hour).padStart(2, "0")}:00`
}

const formatTooltipTitle = (index: number) => {
	const iso = props.series[index]?.timestamp
	if (!iso) return ""
	const d = new Date(iso)
	if (bucket.value === "hour") {
		return `${String(resolveHour(d, index, props.series.length)).padStart(2, "0")}:00`
	}
	if (bucket.value === "day") {
		return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
	}
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const seriesLabel = (kind: "today" | "compare" | "single") => {
	const energy = isEnergy.value
	if (kind === "single") return energy ? "用電" : "用水"
	if (kind === "today") return energy ? "今日用電" : "今日用水"
	if (props.compareLabel && props.compareLabel !== "昨天") return props.compareLabel
	return energy ? "昨日用電" : "昨日用水"
}

const lineDataset = (
	label: string,
	data: (number | null)[],
	opts: { color: string; dashed?: boolean; dense?: boolean }
): ChartDataset<"line", (number | null)[]> => ({
	label,
	data,
	borderColor: opts.color,
	backgroundColor: "transparent",
	tension: 0.35,
	fill: false,
	borderWidth: 2,
	...(opts.dashed
		? {
				pointRadius: 0,
				pointHoverRadius: 0,
				pointHitRadius: 8,
				borderDash: [6, 4],
			}
		: {
				pointRadius: opts.dense ? 2 : 3,
				pointHoverRadius: 6,
				pointBackgroundColor: opts.color,
				pointBorderColor: opts.color,
				pointHoverBackgroundColor: opts.color,
				pointHoverBorderColor: "#ffffff",
				pointHoverBorderWidth: 2,
			}),
})

/** HTML tooltip：可自訂較長的實線／虛線圖示（Chart.js 內建受 min(boxW,boxH) 限制） */
const renderExternalTooltip = (context: { tooltip: TooltipModel<"line"> }) => {
	const { tooltip: t } = context
	if (t.opacity === 0 || !t.dataPoints?.length) {
		tip.value.show = false
		return
	}

	tip.value = {
		show: true,
		left: t.caretX,
		top: t.caretY,
		title: formatTooltipTitle(t.dataPoints[0]?.dataIndex ?? 0),
		rows: t.dataPoints.map((dp) => ({
			label: String(dp.dataset.label || ""),
			value: formatValue(dp.parsed.y),
			color: String(dp.dataset.borderColor || STROKE),
			dashed: dp.datasetIndex === 1,
		})),
	}
}

const buildChart = () => {
	if (!canvasRef.value) return
	chart?.destroy()
	tip.value.show = false

	const total = props.series.length
	const labels = props.series.map((p, i) => formatAxisLabel(p.timestamp, i, total))
	const values = pickValues(props.series)
	const dense = bucket.value === "day" && total > 8
	const hasCompare = (props.compareSeries?.length ?? 0) > 0

	const datasets: ChartDataset<"line", (number | null)[]>[] = [
		lineDataset(seriesLabel(hasCompare ? "today" : "single"), values, {
			color: STROKE,
			dense,
		}),
	]

	if (hasCompare && props.compareSeries) {
		const compareVals = pickValues(props.compareSeries)
		const aligned =
			compareVals.length === values.length
				? compareVals
				: values.map((_, i) => compareVals[i] ?? null)
		datasets.push(
			lineDataset(seriesLabel("compare"), aligned, {
				color: COMPARE_STROKE,
				dashed: true,
			})
		)
	}

	chart = new Chart(canvasRef.value, {
		type: "line",
		data: { labels, datasets },
		plugins: [crosshairPlugin],
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: { mode: "index", intersect: false },
			plugins: {
				legend: { display: false },
				tooltip: {
					enabled: false,
					position: "energyToday" as "nearest",
					external: renderExternalTooltip,
				},
			},
			scales: {
				x: {
					ticks: {
						color: "rgba(255,255,255,0.55)",
						autoSkip: false,
						maxRotation: 0,
						callback: (_val, index) => labels[index] || undefined,
					},
					grid: { color: "rgba(255,255,255,0.06)" },
				},
				y: {
					ticks: { color: "rgba(255,255,255,0.55)" },
					grid: { color: "rgba(255,255,255,0.08)" },
					beginAtZero: true,
				},
			},
		},
	})
}

watch(
	() =>
		[props.series, props.compareSeries, props.bucketType, props.mode, props.compareLabel] as const,
	() => buildChart(),
	{ deep: true }
)

onMounted(() => buildChart())
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
	<div class="relative h-64 min-h-0">
		<canvas ref="canvasRef" aria-label="趨勢圖" />
		<div
			v-show="tip.show"
			class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-black/90 px-3 py-2.5 text-white shadow-lg"
			:style="{ left: `${tip.left}px`, top: `${tip.top}px` }"
			role="tooltip"
		>
			<div class="mb-1.5 text-base font-medium tracking-wide">{{ tip.title }}</div>
			<div
				v-for="row in tip.rows"
				:key="row.label"
				class="flex items-center gap-2.5 text-[15px] leading-7"
			>
				<span
					class="w-9 shrink-0 border-t-[3px]"
					:class="row.dashed ? 'border-dashed' : 'border-solid'"
					:style="{ borderColor: row.color }"
					aria-hidden="true"
				/>
				<span>{{ row.label }}：{{ row.value }} {{ unit }}</span>
			</div>
		</div>
	</div>
</template>
