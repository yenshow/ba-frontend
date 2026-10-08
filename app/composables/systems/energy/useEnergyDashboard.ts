import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useWsFallbackPolling } from "~/composables/monitoring/useWsFallbackPolling"
import { useAuth } from "~/composables/core/useAuth"
import { FALLBACK_POLL_MS } from "~/utils/realtimeTiming"
import type {
	EnergyDashboardSummary,
	EnergyMeterRankingItem,
	EnergySystemDistributionItem,
	EnergyTrendPoint,
} from "~/types/energy"
import { PERM } from "~/config/permissionCodes"
import {
	ENERGY_DASHBOARD_USE_MOCK,
	MOCK_ENERGY_DISTRIBUTION,
	MOCK_ENERGY_RANKING,
	MOCK_ENERGY_SUMMARY,
	buildMockTrendSeries,
} from "~/constants/energyDashboard.mock"
import { sameEnergyTrendSeries } from "~/utils/energyTrendSeries"

export type EnergyTrendState = {
	range: string
	bucketType: string
	series: EnergyTrendPoint[]
	compareSeries: EnergyTrendPoint[] | null
	compareLabel: string | null
}

const emptyTrend = (): EnergyTrendState => ({
	range: "day",
	bucketType: "hour",
	series: [],
	compareSeries: null,
	compareLabel: null,
})

const trendSig = (payload: {
	bucketType?: string
	series?: EnergyTrendPoint[]
	compareSeries?: EnergyTrendPoint[] | null
	compareLabel?: string | null
}) =>
	JSON.stringify({
		bucketType: payload.bucketType || "hour",
		series: payload.series || [],
		compareSeries: payload.compareSeries ?? null,
		compareLabel: payload.compareLabel ?? null,
	})

const applyTrendResult = (
	state: Ref<EnergyTrendState>,
	range: string,
	payload: {
		bucketType?: string
		series?: EnergyTrendPoint[]
		compareSeries?: EnergyTrendPoint[] | null
		compareLabel?: string | null
	}
) => {
	const next = {
		range,
		bucketType: payload.bucketType || "hour",
		series: payload.series || [],
		compareSeries: payload.compareSeries ?? null,
		compareLabel: payload.compareLabel ?? null,
	}
	// 背景刷新數值未變時不換 reference，避免圖表 deep watch
	if (
		state.value.range === next.range &&
		trendSig(state.value) === trendSig(next)
	) {
		return
	}
	state.value = next
}

export const useEnergyDashboard = () => {
	const api = useEnergyApi()
	const { useHasPermission } = useAuth()

	const summary = ref<EnergyDashboardSummary | null>(null)
	const energyTrend = ref<EnergyTrendState>(emptyTrend())
	const waterTrend = ref<EnergyTrendState>(emptyTrend())
	/** KPI 迷你圖：固定日（小時桶），不受下方趨勢 range 切換影響 */
	const kpiDaySeries = ref<EnergyTrendPoint[]>([])
	/** KPI 迷你圖：固定月（日桶），供本月參考電／水費 */
	const kpiMonthSeries = ref<EnergyTrendPoint[]>([])
	const distribution = ref<EnergySystemDistributionItem[]>([])
	const distributionTotalKwh = ref(0)
	const ranking = ref<EnergyMeterRankingItem[]>([])
	const loading = ref(false)
	const errorMessage = ref<string | null>(null)
	const hasLoadedOnce = ref(false)

	const applyMockTrends = () => {
		const elec = buildMockTrendSeries(energyTrend.value.range)
		const water = buildMockTrendSeries(waterTrend.value.range)
		applyTrendResult(energyTrend, energyTrend.value.range, elec)
		applyTrendResult(waterTrend, waterTrend.value.range, water)
	}

	const applyKpiSparkSeries = (day: EnergyTrendPoint[], month: EnergyTrendPoint[]) => {
		if (!sameEnergyTrendSeries(kpiDaySeries.value, day)) kpiDaySeries.value = day
		if (!sameEnergyTrendSeries(kpiMonthSeries.value, month)) kpiMonthSeries.value = month
	}

	/** silent：背景／WS 刷新不開 loading，避免整頁閃爍 */
	const refreshAll = async (opts?: { silent?: boolean }) => {
		const silent = opts?.silent === true || (opts?.silent !== false && hasLoadedOnce.value)
		if (!silent) loading.value = true
		errorMessage.value = null
		try {
			if (ENERGY_DASHBOARD_USE_MOCK) {
				await new Promise((r) => setTimeout(r, 200))
				summary.value = { ...MOCK_ENERGY_SUMMARY }
				applyMockTrends()
				applyKpiSparkSeries(
					buildMockTrendSeries("day").series,
					buildMockTrendSeries("month").series
				)
				distribution.value = [...MOCK_ENERGY_DISTRIBUTION.items]
				distributionTotalKwh.value = MOCK_ENERGY_DISTRIBUTION.totalEnergyKwh
				ranking.value = [...MOCK_ENERGY_RANKING]
				return
			}
			const [s, elecT, waterT, dayT, monthT, d, r] = await Promise.all([
				api.getSummary(),
				api.getTrends(energyTrend.value.range),
				api.getTrends(waterTrend.value.range),
				api.getTrends("day"),
				api.getTrends("month"),
				api.getDistribution(),
				api.getRanking(5),
			])
			summary.value = s
			applyTrendResult(energyTrend, energyTrend.value.range, {
				bucketType: elecT.bucketType,
				series: elecT.series,
			})
			applyTrendResult(waterTrend, waterTrend.value.range, {
				bucketType: waterT.bucketType,
				series: waterT.series,
			})
			applyKpiSparkSeries(dayT.series || [], monthT.series || [])
			const distItems = d.items || []
			const distTotal = d.totalEnergyKwh ?? 0
			if (JSON.stringify(distribution.value) !== JSON.stringify(distItems)) {
				distribution.value = distItems
			}
			if (distributionTotalKwh.value !== distTotal) {
				distributionTotalKwh.value = distTotal
			}
			const rankItems = r.items || []
			if (JSON.stringify(ranking.value) !== JSON.stringify(rankItems)) {
				ranking.value = rankItems
			}
		} catch (err: unknown) {
			errorMessage.value =
				err instanceof Error ? err.message : "載入能源儀表板失敗"
		} finally {
			loading.value = false
			hasLoadedOnce.value = true
		}
	}

	const loadTrend = async (which: "energy" | "water", range: string) => {
		const state = which === "energy" ? energyTrend : waterTrend
		state.value = { ...state.value, range }
		try {
			if (ENERGY_DASHBOARD_USE_MOCK) {
				applyTrendResult(state, range, buildMockTrendSeries(range))
				return
			}
			const t = await api.getTrends(range)
			applyTrendResult(state, range, {
				bucketType: t.bucketType,
				series: t.series,
			})
		} catch (err: unknown) {
			errorMessage.value =
				err instanceof Error ? err.message : "載入趨勢失敗"
		}
	}

	const setEnergyTrendRange = (range: string) => loadTrend("energy", range)
	const setWaterTrendRange = (range: string) => loadTrend("water", range)

	useWsFallbackPolling({
		callback: () => refreshAll({ silent: true }),
		interval: FALLBACK_POLL_MS,
	})

	const canReportFull = useHasPermission(PERM.energy.reportFull)

	return {
		summary,
		energyTrend,
		waterTrend,
		kpiDaySeries,
		kpiMonthSeries,
		distribution,
		distributionTotalKwh,
		ranking,
		loading,
		errorMessage,
		refreshAll,
		setEnergyTrendRange,
		setWaterTrendRange,
		canReportFull,
	}
}
