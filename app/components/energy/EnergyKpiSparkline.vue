<script setup lang="ts">
import { Chart, registerables, type ChartDataset, type ScriptableContext } from "chart.js"

Chart.register(...registerables)

type SparkTone = "energy" | "water" | "cost"

const TONE_RGB: Record<SparkTone, string> = {
	energy: "0, 255, 181",
	water: "230, 230, 0",
	cost: "0, 255, 181",
}

const props = defineProps<{
	values: Array<number | null>
	tone?: SparkTone
	ariaLabel?: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const toneKey = computed<SparkTone>(() => props.tone || "energy")
const rgb = computed(() => TONE_RGB[toneKey.value])

const buildChart = () => {
	if (!canvasRef.value) return
	chart?.destroy()

	const data = props.values.map((v) => (v != null && Number.isFinite(v) ? v : null))
	if (data.every((v) => v == null)) {
		chart = null
		return
	}

	const stroke = `rgb(${rgb.value})`
	const dataset: ChartDataset<"line", (number | null)[]> = {
		data,
		borderColor: stroke,
		borderWidth: 2,
		tension: 0.4,
		fill: true,
		pointRadius: 0,
		pointHoverRadius: 0,
		pointHitRadius: 0,
		backgroundColor: (ctx: ScriptableContext<"line">) => {
			const { chart: c } = ctx
			const { top, bottom } = c.chartArea || {}
			if (top == null || bottom == null) return `rgba(${rgb.value}, 0.25)`
			const g = c.ctx.createLinearGradient(0, top, 0, bottom)
			g.addColorStop(0, `rgba(${rgb.value}, 0.55)`)
			g.addColorStop(0.55, `rgba(${rgb.value}, 0.18)`)
			g.addColorStop(1, `rgba(${rgb.value}, 0)`)
			return g
		},
	}

	chart = new Chart(canvasRef.value, {
		type: "line",
		data: {
			labels: data.map((_, i) => String(i)),
			datasets: [dataset],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			events: [],
			plugins: {
				legend: { display: false },
				tooltip: { enabled: false },
			},
			scales: {
				x: { display: false },
				y: {
					display: false,
					beginAtZero: false,
					grace: "12%",
				},
			},
			layout: { padding: 0 },
			elements: {
				line: { borderJoinStyle: "round", borderCapStyle: "round" },
			},
		},
	})
}

watch(
	() => [props.values, props.tone] as const,
	() => buildChart(),
	{ deep: true }
)

onMounted(() => buildChart())
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
	<div class="h-12 w-full 2xl:h-14" aria-hidden="true">
		<canvas ref="canvasRef" :aria-label="ariaLabel || '數值趨勢'" />
	</div>
</template>
