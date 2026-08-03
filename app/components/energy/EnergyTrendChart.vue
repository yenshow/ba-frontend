<script setup lang="ts">
import {
	Chart,
	Tooltip,
	registerables,
	type ActiveElement,
	type ChartDataset,
	type Plugin,
} from "chart.js"
import type { EnergyTrendPoint } from "~/types/energy"

Chart.register(...registerables)

const STROKE = "#2EE6D6"
const COMPARE_STROKE = "rgba(255,255,255,0.45)"
const HOUR_TICKS = new Set([0, 4, 8, 12, 16, 20, 24])

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
		const w = 2
		ctx.save()
		const grad = ctx.createLinearGradient(x, top, x, bottom)
		grad.addColorStop(0, "rgba(46, 230, 214, 0)")
		grad.addColorStop(0.2, "rgba(46, 230, 214, 0.35)")
		grad.addColorStop(0.5, "rgba(46, 230, 214, 0.75)")
		grad.addColorStop(0.8, "rgba(46, 230, 214, 0.35)")
		grad.addColorStop(1, "rgba(46, 230, 214, 0)")
		ctx.fillStyle = grad
		ctx.fillRect(x - w / 2, top, w, bottom - top)
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
let chart: Chart | null = null

const isEnergy = () => props.mode === "energy"
const unit = () => (isEnergy() ? "kWh" : "m³")

const formatValue = (v: number | null | undefined) => {
	if (v == null || !Number.isFinite(v)) return "—"
	return Number(v).toLocaleString()
}

const pickValues = (pts: EnergyTrendPoint[]) =>
	pts.map((p) => (isEnergy() ? p.energyKwh : p.waterM3))

const shouldShowDayTick = (index: number, total: number) => {
	if (total <= 8) return true
	if (index === 0 || index === total - 1) return true
	const step = Math.max(1, Math.ceil((total - 1) / 6))
	return index % step === 0
}

const formatAxisLabel = (iso: string, index: number, total: number) => {
	const d = new Date(iso)
	const bucket = props.bucketType || "hour"
	if (bucket === "month") {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
	}
	if (bucket === "day") {
		if (!shouldShowDayTick(index, total)) return ""
		return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
	}
	const hour = index === total - 1 && d.getHours() === 0 ? 24 : d.getHours()
	if (!HOUR_TICKS.has(hour) && index !== 0 && index !== total - 1) return ""
	return `${String(hour).padStart(2, "0")}:00`
}

const formatTooltipTitle = (index: number) => {
	const iso = props.series[index]?.timestamp
	if (!iso) return ""
	const d = new Date(iso)
	const bucket = props.bucketType || "hour"
	if (bucket === "hour") {
		const hour =
			index === props.series.length - 1 && d.getHours() === 0 ? 24 : d.getHours()
		return `${String(hour).padStart(2, "0")}:00`
	}
	if (bucket === "day") {
		return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
	}
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const buildChart = () => {
	if (!canvasRef.value) return
	chart?.destroy()

	const total = props.series.length
	const labels = props.series.map((p, i) => formatAxisLabel(p.timestamp, i, total))
	const values = pickValues(props.series)
	const denseDay = (props.bucketType || "hour") === "day" && total > 8
	const hasCompare = (props.compareSeries?.length ?? 0) > 0
	const u = unit()

	const datasets: ChartDataset<"line", (number | null)[]>[] = [
		{
			label: hasCompare
				? isEnergy()
					? "今日用電"
					: "今日用水"
				: isEnergy()
					? "用電"
					: "用水",
			data: values,
			borderColor: STROKE,
			backgroundColor: "transparent",
			tension: 0.35,
			fill: false,
			pointRadius: denseDay ? 2 : 3,
			pointHoverRadius: 6,
			pointBackgroundColor: STROKE,
			pointBorderColor: STROKE,
			pointHoverBackgroundColor: STROKE,
			pointHoverBorderColor: "#ffffff",
			pointHoverBorderWidth: 2,
			borderWidth: 2,
		},
	]

	if (hasCompare && props.compareSeries) {
		const compareVals = pickValues(props.compareSeries)
		const aligned =
			compareVals.length === values.length
				? compareVals
				: values.map((_, i) => compareVals[i] ?? null)
		datasets.push({
			label:
				props.compareLabel && props.compareLabel !== "昨天"
					? props.compareLabel
					: isEnergy()
						? "昨日用電"
						: "昨日用水",
			data: aligned,
			borderColor: COMPARE_STROKE,
			backgroundColor: "transparent",
			tension: 0.35,
			fill: false,
			pointRadius: 0,
			pointHoverRadius: 0,
			pointHitRadius: 8,
			borderWidth: 2,
			borderDash: [6, 4],
		})
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
					enabled: true,
					position: "energyToday" as "nearest",
					backgroundColor: "rgba(0, 0, 0, 0.88)",
					titleColor: "#ffffff",
					bodyColor: "#ffffff",
					titleFont: { size: 13, weight: "normal" },
					bodyFont: { size: 12 },
					padding: 10,
					cornerRadius: 8,
					caretPadding: 8,
					displayColors: true,
					boxWidth: 8,
					boxHeight: 8,
					boxPadding: 4,
					usePointStyle: true,
					callbacks: {
						title: (items) => formatTooltipTitle(items[0]?.dataIndex ?? 0),
						label: (item) =>
							` ${item.dataset.label || ""}：${formatValue(item.parsed.y)} ${u}`,
					},
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
	</div>
</template>
