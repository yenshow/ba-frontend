import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useAccessGate } from "~/composables/core/useAccessGate"
import { useWsFallbackPolling } from "~/composables/monitoring/useWsFallbackPolling"
import { setupDebouncedRefetchListeners } from "~/composables/websocket/useWebSocket"
import { PERM } from "~/config/permissionCodes"
import { EVENT_COALESCE_MS } from "~/utils/realtimeTiming"
import type {
	EnergyDashboardSummary,
	EnergySystemDistributionItem,
	EnergyTrendPoint,
} from "~/types/energy"
import {
	ENERGY_DASHBOARD_USE_MOCK,
	MOCK_ENERGY_DISTRIBUTION,
	MOCK_ENERGY_SUMMARY,
	buildMockTrendSeries,
} from "~/constants/energyDashboard.mock"

export const useEnergyHomeSummary = () => {
	const api = useEnergyApi()
	const { useWsModuleGate } = useAccessGate()
	const canSubscribe = useWsModuleGate("energy", {
		permissionCode: PERM.energy.module,
	})

	const summary = ref<EnergyDashboardSummary | null>(null)
	const kpiDaySeries = ref<EnergyTrendPoint[]>([])
	const distribution = ref<EnergySystemDistributionItem[]>([])
	const distributionTotalKwh = ref(0)
	const errorMessage = ref<string | null>(null)

	const refresh = async () => {
		errorMessage.value = null
		try {
			if (ENERGY_DASHBOARD_USE_MOCK) {
				summary.value = { ...MOCK_ENERGY_SUMMARY }
				kpiDaySeries.value = buildMockTrendSeries("day").series
				distribution.value = [...MOCK_ENERGY_DISTRIBUTION.items]
				distributionTotalKwh.value = MOCK_ENERGY_DISTRIBUTION.totalEnergyKwh
				return
			}
			const [s, d, dayT] = await Promise.all([
				api.getSummary(),
				api.getDistribution(),
				api.getTrends("day"),
			])
			summary.value = s
			kpiDaySeries.value = dayT.series || []
			distribution.value = d.items || []
			distributionTotalKwh.value = d.totalEnergyKwh ?? 0
		} catch (err: unknown) {
			errorMessage.value = err instanceof Error ? err.message : "載入能源首頁資料失敗"
		}
	}

	const stopWsRefetch = setupDebouncedRefetchListeners(
		() => refresh(),
		[{ event: "energy:reading:new" }],
		EVENT_COALESCE_MS,
		"energy-home",
		{ enabled: canSubscribe }
	)

	useWsFallbackPolling({
		callback: () => refresh(),
	})

	onMounted(() => {
		void refresh()
	})

	onScopeDispose(stopWsRefetch)

	return {
		summary,
		kpiDaySeries,
		distribution,
		distributionTotalKwh,
		errorMessage,
	}
}
