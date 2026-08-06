import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useWsFallbackPolling } from "~/composables/monitoring/useWsFallbackPolling"
import { FALLBACK_POLL_MS } from "~/utils/realtimeTiming"
import { ENERGY_DASHBOARD_USE_MOCK } from "~/constants/energyDashboard.mock"
import type { EnergyAlertDisplayItem } from "~/types/energy"

export const useEnergyNotifications = () => {
	const api = useEnergyApi()
	const items = ref<EnergyAlertDisplayItem[]>([])
	const totalIncidents = ref(0)
	const totalInsights = ref(0)

	const refreshNotifications = async () => {
		try {
			const res = await api.getNotifications({
				limit: 50,
				mock: ENERGY_DASHBOARD_USE_MOCK,
			})
			items.value = Array.isArray(res?.items) ? res.items : []
			totalIncidents.value = Number(res?.totalIncidents) || 0
			totalInsights.value = Number(res?.totalInsights) || 0
		} catch {
			items.value = []
			totalIncidents.value = 0
			totalInsights.value = 0
		}
	}

	useWsFallbackPolling({
		callback: () => refreshNotifications(),
		interval: FALLBACK_POLL_MS,
	})

	return {
		items,
		totalIncidents,
		totalInsights,
		refreshNotifications,
	}
}
