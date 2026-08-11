<template>
	<div
		class="energy-dashboard flex h-full min-w-0 w-full flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-4 2xl:gap-6"
	>
		<article
			v-for="card in kpiCards"
			:key="card.key"
			class="monitoring-panel flex min-w-0 flex-1 flex-col pt-4 my-8"
		>
			<div class="flex items-center gap-3 p-4">
				<img
					:src="card.icon"
					alt=""
					class="h-14 w-14 shrink-0 object-contain 2xl:h-16 2xl:w-16"
					width="64"
					height="64"
				/>
				<div class="min-w-0 tracking-[3px]">
					<div class="mb-1 text-base font-medium tracking-widest 2xl:text-lg">
						{{ card.label }}
					</div>
					<div class="flex items-baseline gap-2">
						<div :class="kpiValueClass">{{ card.value }}</div>
						<span class="text-2xl text-white/80 2xl:text-3xl">{{ card.unit }}</span>
					</div>
				</div>
			</div>
			<EnergyKpiSparkline
				:values="card.spark.values"
				:tone="card.spark.tone"
				:aria-label="card.spark.ariaLabel"
			/>
		</article>

		<div class="flex min-h-0 min-w-0 flex-col justify-center">
			<p
				v-if="errorMessage"
				class="mb-2 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs text-red-200 2xl:text-sm"
				role="alert"
			>
				{{ errorMessage }}
			</p>
			<EnergyDistributionDonut
				fill
				:items="distribution"
				:total-energy-kwh="distributionTotalKwh"
				:show-title="false"
				:show-view-more="false"
				:show-legend-values="false"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import EnergyDistributionDonut from "~/components/energy/EnergyDistributionDonut.vue"
import EnergyKpiSparkline from "~/components/energy/EnergyKpiSparkline.vue"
import { useEnergyHomeSummary } from "~/composables/systems/energy/useEnergyHomeSummary"

const kpiValueClass =
	"min-w-[4.5rem] rounded-lg bg-black/10 px-2 py-1 text-2xl text-white 2xl:text-3xl dark:bg-black/30"

const { summary, kpiDaySeries, distribution, distributionTotalKwh, errorMessage } =
	useEnergyHomeSummary()

const kpiCards = computed(() => {
	const s = summary.value
	const day = kpiDaySeries.value
	return [
		{
			key: "today-energy",
			label: "今日用電量",
			icon: "/energy/today-electricity.png",
			value: (s?.todayEnergyKwh ?? 0).toLocaleString(),
			unit: "kWh",
			spark: {
				values: day.map((p) => p.energyKwh),
				tone: "energy" as const,
				ariaLabel: "今日用電趨勢",
			},
		},
		{
			key: "today-water",
			label: "今日用水量",
			icon: "/energy/today-water.png",
			value: (s?.todayWaterM3 ?? 0).toLocaleString(),
			unit: "m³",
			spark: {
				values: day.map((p) => p.waterM3),
				tone: "water" as const,
				ariaLabel: "今日用水趨勢",
			},
		},
	]
})
</script>
