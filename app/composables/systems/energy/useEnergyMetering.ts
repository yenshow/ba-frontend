import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useAccessGate } from "~/composables/core/useAccessGate"
import { useWsFallbackPolling } from "~/composables/monitoring/useWsFallbackPolling"
import { setupDebouncedRefetchListeners } from "~/composables/websocket/useWebSocket"
import { PERM } from "~/config/permissionCodes"
import { EVENT_COALESCE_MS, FALLBACK_POLL_MS } from "~/utils/realtimeTiming"
import type { EnergyMeteringMeter } from "~/types/energy"

export const useEnergyMetering = () => {
	const api = useEnergyApi()
	const { useWsModuleGate } = useAccessGate()
	const canSubscribe = useWsModuleGate("energy", {
		permissionCode: PERM.energy.module,
	})

	const meters = ref<EnergyMeteringMeter[]>([])
	const generatedAt = ref<string | null>(null)
	const loading = ref(false)
	const errorMessage = ref<string | null>(null)
	const hasLoadedOnce = ref(false)

	const refresh = async (opts?: { silent?: boolean }) => {
		const silent = opts?.silent === true || (opts?.silent !== false && hasLoadedOnce.value)
		if (!silent) loading.value = true
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
			hasLoadedOnce.value = true
		}
	}

	const stopWsRefetch = setupDebouncedRefetchListeners(
		() => refresh({ silent: true }),
		[{ event: "energy:reading:new" }],
		EVENT_COALESCE_MS,
		"energy-metering",
		{ enabled: canSubscribe }
	)

	useWsFallbackPolling({
		callback: () => refresh({ silent: true }),
		interval: FALLBACK_POLL_MS,
	})

	onScopeDispose(stopWsRefetch)

	return {
		meters,
		generatedAt,
		loading,
		errorMessage,
		refresh,
	}
}
