import { ref, onMounted, onBeforeUnmount } from "vue"
import { usePolling } from "~/composables/monitoring/usePolling"
import { ENVIRONMENT_STALE_CHECK_INTERVAL_MS } from "~/utils/environmentLive"
import {
	useEnvironmentSensors,
	type EnvironmentSensorsOptions,
} from "~/composables/systems/environment/useEnvironmentLive"

const isDocumentVisible = () =>
	typeof document === "undefined" || document.visibilityState === "visible"

/**
 * 環境監控頁：統一 hydrate / reconcile / visibility 刷新
 */
export const useEnvironmentDataCoordinator = (options: EnvironmentSensorsOptions) => {
	const sensors = useEnvironmentSensors(options)
	const trendReloadKey = ref(0)
	const isHydrating = ref(false)

	const reconcileFromSnapshots = async () => {
		await sensors.reconcileStaleLocations()
		sensors.syncAllLocationsFromSnapshots()
	}

	const { start: startReconcilePolling, stop: stopReconcilePolling } = usePolling({
		callback: reconcileFromSnapshots,
		interval: ENVIRONMENT_STALE_CHECK_INTERVAL_MS,
		immediate: false,
		enabled: isDocumentVisible,
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
		if (!isDocumentVisible()) return
		void reconcileFromSnapshots()
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
