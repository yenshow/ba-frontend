import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useWsFallbackPolling } from "~/composables/monitoring/useWsFallbackPolling"
import { useAuth } from "~/composables/core/useAuth"
import { FALLBACK_POLL_MS } from "~/utils/realtimeTiming"
import type {
	EnergyDashboardSummary,
	EnergyDistributionItem,
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
	state.value = {
		range,
		bucketType: payload.bucketType || "hour",
		series: payload.series || [],
		compareSeries: payload.compareSeries ?? null,
		compareLabel: payload.compareLabel ?? null,
	}
}

export const useEnergyDashboard = () => {
	const api = useEnergyApi()
	const { useHasPermission } = useAuth()

	const summary = ref<EnergyDashboardSummary | null>(null)
	const energyTrend = ref<EnergyTrendState>(emptyTrend())
	const waterTrend = ref<EnergyTrendState>(emptyTrend())
	const distribution = ref<EnergyDistributionItem[]>([])
	const distributionTotalKwh = ref(0)
	const ranking = ref<EnergyDistributionItem[]>([])
	const loading = ref(false)
	const errorMessage = ref<string | null>(null)

	const applyMockTrends = () => {
		const elec = buildMockTrendSeries(energyTrend.value.range)
		const water = buildMockTrendSeries(waterTrend.value.range)
		applyTrendResult(energyTrend, energyTrend.value.range, elec)
		applyTrendResult(waterTrend, waterTrend.value.range, water)
	}

	const refreshAll = async () => {
		loading.value = true
		errorMessage.value = null
		try {
			if (ENERGY_DASHBOARD_USE_MOCK) {
				await new Promise((r) => setTimeout(r, 200))
				summary.value = { ...MOCK_ENERGY_SUMMARY }
				applyMockTrends()
				distribution.value = [...MOCK_ENERGY_DISTRIBUTION.items]
				distributionTotalKwh.value = MOCK_ENERGY_DISTRIBUTION.totalEnergyKwh
				ranking.value = [...MOCK_ENERGY_RANKING]
				return
			}
			const [s, elecT, waterT, d, r] = await Promise.all([
				api.getSummary(),
				api.getTrends(energyTrend.value.range),
				api.getTrends(waterTrend.value.range),
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
			distribution.value = d.items || []
			distributionTotalKwh.value = d.totalEnergyKwh ?? 0
			ranking.value = r.items || []
		} catch (err: unknown) {
			errorMessage.value =
				err instanceof Error ? err.message : "載入能源儀表板失敗"
		} finally {
			loading.value = false
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
		callback: () => refreshAll(),
		interval: FALLBACK_POLL_MS,
	})

	const canReportFull = useHasPermission(PERM.energy.reportFull)

	return {
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
	}
}
