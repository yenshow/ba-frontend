<script setup lang="ts">
import EnergyTrendChart from "~/components/energy/EnergyTrendChart.vue"
import EnergyKpiSparkline from "~/components/energy/EnergyKpiSparkline.vue"
import EnergyDistributionDonut from "~/components/energy/EnergyDistributionDonut.vue"
import EnergyRankingList from "~/components/energy/EnergyRankingList.vue"
import EnergyAlertsPanel from "~/components/energy/EnergyAlertsPanel.vue"
import EnergyAlertsDialog from "~/components/energy/EnergyAlertsDialog.vue"
import EnergySettingsDialog from "~/components/energy/EnergySettingsDialog.vue"
import EnergySystemBreakdownDialog from "~/components/energy/EnergySystemBreakdownDialog.vue"
import EnergySimulation, {
	type EnergyTrendReportMode,
} from "~/components/energy/EnergySimulation.vue"
import SimulationFrame from "~/components/common/SimulationFrame.vue"
import PageTabs from "~/components/common/PageTabs.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useEnergyDashboard } from "~/composables/systems/energy/useEnergyDashboard"
import { useEnergyNotifications } from "~/composables/systems/energy/useEnergyNotifications"
import { useEnergyReadingSubscription } from "~/composables/systems/energy/useEnergyLive"
import { useAuth } from "~/composables/core/useAuth"
import { PERM } from "~/config/permissionCodes"

const {
	summary,
	energyTrend,
	waterTrend,
	kpiDaySeries,
	kpiMonthSeries,
	distribution,
	distributionTotalKwh,
	ranking,
	errorMessage,
	refreshAll,
	setEnergyTrendRange,
	setWaterTrendRange,
	canReportFull,
} = useEnergyDashboard()

const { useHasPermission } = useAuth()
const canManageEnergySettings = useHasPermission(PERM.energy.settingsUpdate)

const {
	items: energyAlerts,
	totalIncidents: energyIncidentCount,
	totalInsights: energyInsightCount,
	refreshNotifications,
} = useEnergyNotifications()
const showSettings = ref(false)

const openEnergySettings = () => {
	showSettings.value = true
}
const showBreakdown = ref(false)
const showTrendReport = ref(false)
const trendReportMode = ref<EnergyTrendReportMode>("energy")
const showAlertsDialog = ref(false)

const rangeTabs = [
	{ id: "day", label: "日" },
	{ id: "week", label: "週" },
	{ id: "month", label: "月" },
	{ id: "year", label: "年" },
] as const

const kpiValueClass =
	"min-w-[4.5rem] rounded-lg bg-black/10 px-2 py-1 text-2xl text-white 2xl:text-3xl dark:bg-black/30"

type KpiSpark = {
	values: Array<number | null>
	tone: "energy" | "water" | "cost"
	ariaLabel: string
}

const kpiCards = computed(() => {
	const s = summary.value
	const day = kpiDaySeries.value
	const month = kpiMonthSeries.value
	return [
		{
			key: "today-energy",
			label: "今日用電量",
			icon: "/energy/today-electricity.png",
			value: (s?.todayEnergyKwh ?? 0).toLocaleString(),
			unit: "kWh",
			spark: {
				values: day.map((p) => p.energyKwh),
				tone: "energy",
				ariaLabel: "今日用電趨勢",
			} satisfies KpiSpark,
		},
		{
			key: "today-water",
			label: "今日用水量",
			icon: "/energy/today-water.png",
			value: (s?.todayWaterM3 ?? 0).toLocaleString(),
			unit: "m³",
			spark: {
				values: day.map((p) => p.waterM3),
				tone: "water",
				ariaLabel: "今日用水趨勢",
			} satisfies KpiSpark,
		},
		{
			key: "contract",
			label: "契約容量",
			icon: "/energy/carbon-emission.png",
			iconClass: "mb-auto mt-1.5",
			value: (s?.contractCapacityKw ?? 0).toLocaleString(),
			unit: "kW",
			hint: `目前 ${(s?.currentDemandKw ?? 0).toLocaleString()} kW`,
			warn: Boolean(s?.overContract),
			spark: null as KpiSpark | null,
		},
		{
			key: "elec-cost",
			label: "本月參考電費",
			icon: "/energy/reference-cost.png",
			value: (s?.monthElectricityCost?.amount ?? 0).toLocaleString(),
			unit: "NT$",
			unitBefore: true,
			spark: {
				values: month.map((p) => p.energyKwh),
				tone: "cost",
				ariaLabel: "本月用電趨勢（參考電費）",
			} satisfies KpiSpark,
		},
		{
			key: "water-cost",
			label: "本月參考水費",
			icon: "/energy/reference-cost.png",
			value: (s?.monthWaterCost?.amount ?? 0).toLocaleString(),
			unit: "NT$",
			unitBefore: true,
			spark: {
				values: month.map((p) => p.waterM3),
				tone: "cost",
				ariaLabel: "本月用水趨勢（參考水費）",
			} satisfies KpiSpark,
		},
	]
})

const trendPanels = computed(() => [
	{
		key: "energy",
		title: "用電趨勢",
		mode: "energy" as const,
		...energyTrend.value,
		setRange: setEnergyTrendRange,
		idPrefix: "energy-trend-range-elec",
		ariaLabel: "用電趨勢時間範圍",
	},
	{
		key: "water",
		title: "用水趨勢",
		mode: "water" as const,
		...waterTrend.value,
		setRange: setWaterTrendRange,
		idPrefix: "energy-trend-range-water",
		ariaLabel: "用水趨勢時間範圍",
	},
])

useEnergyReadingSubscription(() => {
	void refreshAll()
	void refreshNotifications()
})

/** 用電／用水趨勢各自開啟完整報表 */
const handleOpenTrendReport = (mode: EnergyTrendReportMode) => {
	trendReportMode.value = mode
	showTrendReport.value = true
}

const trendReportTitle = computed(() =>
	trendReportMode.value === "energy" ? "用電趨勢 - 完整報表" : "用水趨勢 - 完整報表"
)

onMounted(async () => {
	await refreshAll()
	await refreshNotifications()
})
</script>

<template>
	<div class="page-shell energy-dashboard">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
			<header class="flex flex-col gap-1 2xl:gap-2">
				<h1 class="page-title">能源管理</h1>
				<p class="page-subtitle">用電／用水趨勢、契約容量與參考費用總覽</p>
			</header>

			<div class="flex shrink-0 flex-wrap items-center gap-3 2xl:gap-4">
				<PermissionActionButton
					:allowed="canManageEnergySettings"
					aria-label="開啟設定"
					class="btn-monitoring-overlay"
					@click="openEnergySettings"
				>
					參數設定
				</PermissionActionButton>
			</div>
		</div>

		<p
			v-if="errorMessage"
			class="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200 2xl:text-base"
			role="alert"
		>
			{{ errorMessage }}
		</p>

		<!-- KPI -->
		<section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 2xl:gap-4">
			<article
				v-for="card in kpiCards"
				:key="card.key"
				class="monitoring-panel flex flex-col overflow-hidden rounded-2xl pt-4 text-white"
				:class="card.warn ? 'ring-2 ring-amber-400/70' : ''"
			>
				<div class="flex items-center gap-3 px-4">
					<img
						:src="card.icon"
						alt=""
						class="h-14 w-14 flex-shrink-0 object-contain 2xl:h-16 2xl:w-16"
						:class="card.iconClass"
						width="64"
						height="64"
					/>
					<div class="min-w-0 tracking-[3px]">
						<div class="mb-1 text-base font-medium tracking-widest text-white 2xl:text-lg">
							{{ card.label }}
						</div>
						<div class="flex items-baseline gap-2">
							<span v-if="card.unitBefore" class="text-2xl text-white/80 2xl:text-3xl">{{
								card.unit
							}}</span>
							<div :class="kpiValueClass">{{ card.value }}</div>
							<span v-if="!card.unitBefore" class="text-2xl text-white/80 2xl:text-3xl">{{
								card.unit
							}}</span>
						</div>
						<p
							v-if="card.hint"
							class="mt-1 text-sm tracking-wider text-white/50 2xl:text-base"
							:class="card.warn ? '!text-amber-300' : ''"
						>
							{{ card.hint }}
							<span v-if="card.warn"> · 超限</span>
						</p>
					</div>
				</div>
				<EnergyKpiSparkline
					v-if="card.spark"
					class="mt-auto"
					:values="card.spark.values"
					:tone="card.spark.tone"
					:aria-label="card.spark.ariaLabel"
				/>
				<div v-else class="pb-4" aria-hidden="true" />
			</article>
		</section>

		<!-- 趨勢 -->
		<section class="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:gap-6">
			<div
				v-for="panel in trendPanels"
				:key="panel.key"
				class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6"
			>
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-xl font-semibold tracking-[4px] 2xl:text-2xl">{{ panel.title }}</h2>
					<div class="flex flex-wrap items-center gap-3">
						<PageTabs
							:model-value="panel.range"
							:tabs="[...rangeTabs]"
							:panels="false"
							:aria-label="panel.ariaLabel"
							:id-prefix="panel.idPrefix"
							button-class="!px-2.5 !py-1 !text-sm 2xl:!text-base"
							@update:model-value="panel.setRange"
						/>
						<button
							v-if="canReportFull"
							type="button"
							class="text-sm text-white/70 transition-colors hover:text-white 2xl:text-base"
							:aria-label="`查看${panel.title}完整報表`"
							@click="handleOpenTrendReport(panel.mode)"
						>
							查看全部
						</button>
					</div>
				</div>
				<EnergyTrendChart
					:mode="panel.mode"
					:series="panel.series"
					:compare-series="panel.compareSeries"
					:compare-label="panel.compareLabel"
					:bucket-type="panel.bucketType"
				/>
			</div>
		</section>

		<!-- 分佈／排行／告警 -->
		<section class="grid grid-cols-1 gap-4 xl:grid-cols-3 2xl:gap-6">
			<div class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6">
				<EnergyDistributionDonut
					:items="distribution"
					:total-energy-kwh="distributionTotalKwh"
					@view-more="showBreakdown = true"
				/>
			</div>
			<div class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6">
				<EnergyRankingList :items="ranking" @view-more="showBreakdown = true" />
			</div>
			<div class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6">
				<EnergyAlertsPanel :alerts="energyAlerts" @show-all="showAlertsDialog = true" />
			</div>
		</section>

		<EnergyAlertsDialog
			v-model="showAlertsDialog"
			:alerts="energyAlerts"
			:total-incidents="energyIncidentCount"
			:total-insights="energyInsightCount"
		/>
		<EnergySettingsDialog
			v-model="showSettings"
			@saved="
				() => {
					void refreshAll()
					void refreshNotifications()
				}
			"
		/>
		<EnergySystemBreakdownDialog v-model="showBreakdown" />
		<SimulationFrame v-model="showTrendReport" :title="trendReportTitle">
			<EnergySimulation :mode="trendReportMode" />
		</SimulationFrame>
	</div>
</template>
