<script setup lang="ts">
import EnergyTrendChart from "~/components/energy/EnergyTrendChart.vue"
import EnergyDistributionDonut from "~/components/energy/EnergyDistributionDonut.vue"
import EnergyRankingList from "~/components/energy/EnergyRankingList.vue"
import EnergyAlertsPanel, { type EnergyAlertItem } from "~/components/energy/EnergyAlertsPanel.vue"
import EnergySettingsDialog from "~/components/energy/EnergySettingsDialog.vue"
import EnergySimulation from "~/components/energy/EnergySimulation.vue"
import SimulationFrame from "~/components/common/SimulationFrame.vue"
import PageTabs from "~/components/common/PageTabs.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useEnergyDashboard } from "~/composables/systems/energy/useEnergyDashboard"
import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useEnergyReadingSubscription } from "~/composables/systems/energy/useEnergyLive"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import { useAuth } from "~/composables/core/useAuth"
import { PERM } from "~/config/permissionCodes"
import type { EnergyReadingRow } from "~/types/energy"
import { ENERGY_DASHBOARD_USE_MOCK, MOCK_ENERGY_ALERTS } from "~/constants/energyDashboard.mock"

const {
	summary,
	energyTrend,
	waterTrend,
	distribution,
	distributionTotalKwh,
	ranking,
	loading,
	errorMessage,
	refreshAll,
	setEnergyTrendRange,
	setWaterTrendRange,
	canReportFull,
} = useEnergyDashboard()

const { useHasPermission } = useAuth()
const canManageEnergy = useHasPermission(PERM.energy.module)

const api = useEnergyApi()
const alertApi = useAlertApi()
const showSettings = ref(false)
const showSimulationFrame = ref(false)
const reportReadings = ref<EnergyReadingRow[]>([])
const reportLoading = ref(false)
const energyAlerts = ref<EnergyAlertItem[]>([])

const rangeTabs = [
	{ id: "day", label: "日" },
	{ id: "week", label: "週" },
	{ id: "month", label: "月" },
	{ id: "year", label: "年" },
] as const

const loadAlerts = async () => {
	if (ENERGY_DASHBOARD_USE_MOCK) {
		energyAlerts.value = [...MOCK_ENERGY_ALERTS]
		return
	}
	try {
		const res = await alertApi.getAlerts({
			source: "energy",
			status: "active",
			limit: 8,
		})
		energyAlerts.value = Array.isArray(res?.alerts) ? res.alerts : []
	} catch {
		energyAlerts.value = []
	}
}

const handleRefresh = async () => {
	await refreshAll()
	await loadAlerts()
}

useEnergyReadingSubscription(() => {
	void refreshAll()
	void loadAlerts()
})

/** 與環境／人流等監控頁相同：開啟 SimulationFrame 完整報表 */
const handleOpenSimulation = () => {
	showSimulationFrame.value = true
}

const handleReportTimeRange = async (payload: { startTime: string; endTime: string }) => {
	reportLoading.value = true
	try {
		const res = await api.getReadings({
			startTime: payload.startTime,
			endTime: payload.endTime,
			limit: 1000,
			reportScope: "full",
		})
		reportReadings.value = res.readings || []
	} catch {
		reportReadings.value = []
	} finally {
		reportLoading.value = false
	}
}

onMounted(async () => {
	await refreshAll()
	await loadAlerts()
})
</script>

<template>
	<div class="page-shell">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
			<header class="flex flex-col gap-1 2xl:gap-2">
				<h1 class="page-title">能源管理</h1>
				<p class="page-subtitle">用電／用水趨勢、契約容量與參考費用總覽</p>
			</header>

			<div class="flex shrink-0 flex-wrap items-center gap-3 2xl:gap-4">
				<PermissionActionButton
					:allowed="canManageEnergy"
					aria-label="開啟設定"
					class="btn-monitoring-overlay"
					@click="showSettings = true"
				>
					參數設定
				</PermissionActionButton>
				<PermissionActionButton
					:allowed="canReportFull"
					aria-label="開啟完整報表"
					class="btn-monitoring-overlay"
					@click="handleOpenSimulation"
				>
					完整報表
				</PermissionActionButton>
				<button
					type="button"
					:disabled="loading"
					aria-label="重新整理"
					class="btn-monitoring-overlay disabled:cursor-not-allowed disabled:opacity-60"
					@click="handleRefresh"
				>
					重新整理
				</button>
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
			<article class="monitoring-panel flex flex-col overflow-hidden rounded-2xl p-4 text-white">
				<div class="flex items-center gap-3">
					<img
						src="/energy/today-electricity.png"
						alt=""
						class="h-14 w-14 flex-shrink-0 object-contain 2xl:h-16 2xl:w-16"
						width="64"
						height="64"
					/>
					<div class="min-w-0 tracking-[3px]">
						<div class="mb-1 text-base font-medium tracking-widest text-white 2xl:text-lg">
							今日用電量
						</div>
						<div class="flex items-baseline gap-2">
							<div
								class="min-w-[4.5rem] rounded-lg bg-white/10 px-2 py-1 text-2xl text-white 2xl:text-3xl"
							>
								{{ (summary?.todayEnergyKwh ?? 0).toLocaleString() }}
							</div>
							<span class="text-2xl text-white/80 2xl:text-3xl">kWh</span>
						</div>
					</div>
				</div>
			</article>

			<article class="monitoring-panel flex flex-col overflow-hidden rounded-2xl p-4 text-white">
				<div class="flex items-center gap-3">
					<img
						src="/energy/today-water.png"
						alt=""
						class="h-14 w-14 flex-shrink-0 object-contain 2xl:h-16 2xl:w-16"
						width="64"
						height="64"
					/>
					<div class="min-w-0 tracking-[3px]">
						<div class="mb-1 text-base font-medium tracking-widest text-white 2xl:text-lg">
							今日用水量
						</div>
						<div class="flex items-baseline gap-2">
							<div
								class="min-w-[4.5rem] rounded-lg bg-white/10 px-2 py-1 text-2xl text-white 2xl:text-3xl"
							>
								{{ (summary?.todayWaterM3 ?? 0).toLocaleString() }}
							</div>
							<span class="text-2xl text-white/80 2xl:text-3xl">m³</span>
						</div>
					</div>
				</div>
			</article>

			<article
				class="monitoring-panel flex flex-col overflow-hidden rounded-2xl p-4 text-white"
				:class="summary?.overContract ? 'ring-2 ring-amber-400/70' : ''"
			>
				<div class="flex items-center gap-3">
					<img
						src="/energy/carbon-emission.png"
						alt=""
						class="h-14 w-14 flex-shrink-0 object-contain 2xl:h-16 2xl:w-16 mb-auto mt-1.5"
						width="64"
						height="64"
					/>
					<div class="min-w-0 tracking-[3px]">
						<div class="mb-1 text-base font-medium tracking-widest text-white 2xl:text-lg">
							契約容量
						</div>
						<div class="flex items-baseline gap-2">
							<div
								class="min-w-[4.5rem] rounded-lg bg-white/10 px-2 py-1 text-2xl text-white 2xl:text-3xl"
							>
								{{ (summary?.contractCapacityKw ?? 0).toLocaleString() }}
							</div>
							<span class="text-2xl text-white/80 2xl:text-3xl">kW</span>
						</div>
						<p
							class="mt-1 text-sm tracking-wider text-white/50 2xl:text-base"
							:class="summary?.overContract ? '!text-amber-300' : ''"
						>
							目前 {{ (summary?.currentDemandKw ?? 0).toLocaleString() }} kW
							<span v-if="summary?.overContract"> · 超限</span>
						</p>
					</div>
				</div>
			</article>

			<article class="monitoring-panel flex flex-col overflow-hidden rounded-2xl p-4 text-white">
				<div class="flex items-center gap-3">
					<img
						src="/energy/reference-cost.png"
						alt=""
						class="h-14 w-14 flex-shrink-0 object-contain 2xl:h-16 2xl:w-16"
						width="64"
						height="64"
					/>
					<div class="min-w-0 tracking-[3px]">
						<div class="mb-1 text-base font-medium tracking-widest text-white 2xl:text-lg">
							本月參考電費
						</div>
						<div class="flex items-baseline gap-2">
							<span class="text-2xl text-white/80 2xl:text-3xl">NT$</span>
							<div
								class="min-w-[4.5rem] rounded-lg bg-white/10 px-2 py-1 text-2xl text-white 2xl:text-3xl"
							>
								{{ (summary?.monthElectricityCost?.amount ?? 0).toLocaleString() }}
							</div>
						</div>
					</div>
				</div>
			</article>

			<article class="monitoring-panel flex flex-col overflow-hidden rounded-2xl p-4 text-white">
				<div class="flex items-center gap-3">
					<img
						src="/energy/reference-cost.png"
						alt=""
						class="h-14 w-14 flex-shrink-0 object-contain 2xl:h-16 2xl:w-16"
						width="64"
						height="64"
					/>
					<div class="min-w-0 tracking-[3px]">
						<div class="mb-1 text-base font-medium tracking-widest text-white 2xl:text-lg">
							本月參考水費
						</div>
						<div class="flex items-baseline gap-2">
							<span class="text-2xl text-white/80 2xl:text-3xl">NT$</span>
							<div
								class="min-w-[4.5rem] rounded-lg bg-white/10 px-2 py-1 text-2xl text-white 2xl:text-3xl"
							>
								{{ (summary?.monthWaterCost?.amount ?? 0).toLocaleString() }}
							</div>
						</div>
					</div>
				</div>
			</article>
		</section>

		<!-- 趨勢 -->
		<section class="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:gap-6">
			<div class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-xl font-semibold tracking-[4px] 2xl:text-2xl">用電趨勢</h2>
					<div class="flex flex-wrap items-center gap-3">
						<PageTabs
							:model-value="energyTrend.range"
							:tabs="[...rangeTabs]"
							:panels="false"
							aria-label="用電趨勢時間範圍"
							id-prefix="energy-trend-range-elec"
							button-class="!px-2.5 !py-1 !text-sm 2xl:!text-base"
							@update:model-value="setEnergyTrendRange"
						/>
						<button
							v-if="canReportFull"
							type="button"
							class="text-sm text-white/70 transition-colors hover:text-white 2xl:text-base"
							@click="handleOpenSimulation"
						>
							查看全部
						</button>
					</div>
				</div>
				<EnergyTrendChart
					mode="energy"
					:series="energyTrend.series"
					:compare-series="energyTrend.compareSeries"
					:compare-label="energyTrend.compareLabel"
					:bucket-type="energyTrend.bucketType"
				/>
			</div>

			<div class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-xl font-semibold tracking-[4px] 2xl:text-2xl">用水趨勢</h2>
					<div class="flex flex-wrap items-center gap-3">
						<PageTabs
							:model-value="waterTrend.range"
							:tabs="[...rangeTabs]"
							:panels="false"
							aria-label="用水趨勢時間範圍"
							id-prefix="energy-trend-range-water"
							button-class="!px-2.5 !py-1 !text-sm 2xl:!text-base"
							@update:model-value="setWaterTrendRange"
						/>
						<button
							v-if="canReportFull"
							type="button"
							class="text-sm text-white/70 transition-colors hover:text-white 2xl:text-base"
							@click="handleOpenSimulation"
						>
							查看全部
						</button>
					</div>
				</div>
				<EnergyTrendChart
					mode="water"
					:series="waterTrend.series"
					:compare-series="waterTrend.compareSeries"
					:compare-label="waterTrend.compareLabel"
					:bucket-type="waterTrend.bucketType"
				/>
			</div>
		</section>

		<!-- 分佈／排行／告警 -->
		<section class="grid grid-cols-1 gap-4 xl:grid-cols-3 2xl:gap-6">
			<div class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6">
				<EnergyDistributionDonut :items="distribution" :total-energy-kwh="distributionTotalKwh" />
			</div>
			<div class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6">
				<EnergyRankingList :items="ranking" />
			</div>
			<div class="monitoring-panel overflow-hidden rounded-2xl p-4 text-white 2xl:p-6">
				<EnergyAlertsPanel :alerts="energyAlerts" />
			</div>
		</section>

		<EnergySettingsDialog v-model="showSettings" @saved="refreshAll" />
		<SimulationFrame v-model="showSimulationFrame" title="能源管理 - 完整報表">
			<EnergySimulation
				:readings="reportReadings"
				:loading="reportLoading"
				@update:time-range="handleReportTimeRange"
			/>
		</SimulationFrame>
	</div>
</template>
