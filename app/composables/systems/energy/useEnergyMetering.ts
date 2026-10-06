import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useEnergyReadingSubscription } from "~/composables/systems/energy/useEnergyLive"
import { useWsFallbackPolling } from "~/composables/monitoring/useWsFallbackPolling"
import { FALLBACK_POLL_MS } from "~/utils/realtimeTiming"
import type { EnergyMeteringMeter } from "~/types/energy"

export const useEnergyMetering = () => {
	const api = useEnergyApi()
	const meters = ref<EnergyMeteringMeter[]>([])
	const generatedAt = ref<string | null>(null)
	const loading = ref(false)
	const errorMessage = ref<string | null>(null)

	const refresh = async () => {
		loading.value = true
		errorMessage.value = null
		try {
			const res = await api.getMetering()
			meters.value = res.meters || []
			generatedAt.value = res.generatedAt || null
		} catch (err: unknown) {
			errorMessage.value =
				err instanceof Error ? err.message : "載入即時量測失敗"
		} finally {
			loading.value = false
		}
	}

	useEnergyReadingSubscription(() => {
		void refresh()
	})

	useWsFallbackPolling({
		callback: () => refresh(),
		interval: FALLBACK_POLL_MS,
	})

	return {
		meters,
		generatedAt,
		loading,
		errorMessage,
		refresh,
	}
}
