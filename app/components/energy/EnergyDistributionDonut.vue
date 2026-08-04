<script setup lang="ts">
import { Chart, registerables, type ChartConfiguration } from "chart.js"
import type { EnergySystemDistributionItem } from "~/types/energy"

Chart.register(...registerables)

const props = defineProps<{
	items: EnergySystemDistributionItem[]
	totalEnergyKwh?: number
}>()

const emit = defineEmits<{ "view-more": [] }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const DISTRIBUTION_COLORS = [
	"#2EE6D6",
	"#4BC8C8",
	"#3AA0FF",
	"#7AD3A0",
	"#F0C14A",
	"#E07A5F",
	"#9B8CFF",
]

const displayTotal = computed(() => {
	if (props.totalEnergyKwh != null) return props.totalEnergyKwh
	return props.items.reduce((sum, item) => sum + item.energyKwh, 0)
})

const colorAt = (idx: number) => DISTRIBUTION_COLORS[idx % DISTRIBUTION_COLORS.length]!

const buildChart = () => {
	if (!canvasRef.value) return
	chart?.destroy()
	const cfg: ChartConfiguration<"doughnut"> = {
		type: "doughnut",
		data: {
			labels: props.items.map((i) => i.systemName),
			datasets: [
				{
					data: props.items.map((i) => i.energyKwh),
					backgroundColor: props.items.map((_, idx) => colorAt(idx)),
					borderWidth: 0,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: "60%",
			plugins: { legend: { display: false } },
		},
	}
	chart = new Chart(canvasRef.value, cfg)
}

watch(
	() => props.items,
	() => buildChart(),
	{ deep: true }
)

onMounted(() => buildChart())
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
	<div>
		<h3 class="mb-4 text-center text-xl font-semibold tracking-[4px] 2xl:text-2xl">電量使用分佈</h3>
		<div class="flex items-center gap-4">
			<div class="relative h-40 w-40 shrink-0 2xl:h-[200px] 2xl:w-[200px]">
				<canvas ref="canvasRef" aria-label="用量分佈圖" />
				<div
					class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
				>
					<div class="text-sm tracking-wider text-white/60 2xl:text-base">總用電量</div>
					<div class="text-base font-semibold text-white 2xl:text-xl">
						{{ displayTotal.toLocaleString() }}
						<span class="text-xs font-normal text-white/80"> kWh</span>
					</div>
				</div>
			</div>
			<ul
				class="max-h-[200px] flex-1 space-y-3 overflow-y-auto text-sm text-white/80 2xl:text-base"
			>
				<li v-for="(item, idx) in items" :key="item.systemKey" class="flex items-center gap-2">
					<span
						class="h-3 w-3 shrink-0 rounded-sm"
						:style="{ backgroundColor: colorAt(idx) }"
						aria-hidden="true"
					/>
					<span class="min-w-0 flex-1 truncate">{{ item.systemName }}</span>
					<span class="shrink-0 tabular-nums text-white/70">
						{{ item.percent }}%
						<span class="text-white/45">({{ item.energyKwh.toLocaleString() }} kWh)</span>
					</span>
				</li>
				<li v-if="items.length === 0" class="py-6 text-center text-white/60">
					<p class="text-base 2xl:text-lg">尚無用量資料</p>
					<p class="mt-2 text-sm 2xl:text-base">請於設定納入表計設備</p>
				</li>
			</ul>
		</div>
		<div class="mt-4 text-right">
			<button
				type="button"
				class="text-sm text-white/70 transition-colors hover:text-white 2xl:text-base"
				aria-label="查看更多電量分佈明細"
				@click="emit('view-more')"
			>
				查看更多 &gt;
			</button>
		</div>
	</div>
</template>
