import { ref, onMounted, onBeforeUnmount } from "vue"
import { usePolling } from "~/composables/monitoring/usePolling"
import { ENVIRONMENT_STALE_CHECK_INTERVAL_MS } from "~/utils/environmentLive"
import {
	useEnvironmentSensors,
	type EnvironmentSensorsOptions,
} from "~/composables/systems/environment/useEnvironmentLive"

/**
 * 環境監控頁：統一 hydrate / reconcile / visibility 刷新
 */
export const useEnvironmentDataCoordinator = (options: EnvironmentSensorsOptions) => {
	const sensors = useEnvironmentSensors(options)
	const trendReloadKey = ref(0)
	const isHydrating = ref(false)

	const { start: startReconcilePolling, stop: stopReconcilePolling } = usePolling({
		callback: async () => {
			await sensors.reconcileStaleLocations()
			sensors.syncAllLocationsFromSnapshots()
		},
		interval: ENVIRONMENT_STALE_CHECK_INTERVAL_MS,
		immediate: false,
	})

	const hydrateAllLocations = async (force = true) => {
		isHydrating.value = true
		try {
			await sensors.bootstrapAllLocations(force)
			sensors.syncAllLocationsFromSnapshots()
			trendReloadKey.value += 1
		} finally {
			isHydrating.value = false
		}
	}

	const handleVisibilityChange = () => {
		if (typeof document === "undefined" || document.visibilityState !== "visible") return
		void hydrateAllLocations(true)
	}

	onMounted(() => {
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange)
		}
	})

	onBeforeUnmount(() => {
		stopReconcilePolling()
		if (typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", handleVisibilityChange)
		}
	})

	return {
		...sensors,
		isHydrating,
		trendReloadKey,
		hydrateAllLocations,
		startReconcilePolling,
		stopReconcilePolling,
	}
}
