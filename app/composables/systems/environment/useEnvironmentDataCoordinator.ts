import { ref, onMounted, onBeforeUnmount } from "vue"
import {
	useEnvironmentSensors,
	type EnvironmentSensorsOptions,
} from "~/composables/systems/environment/useEnvironmentLive"
import { useWsFallbackPolling } from "~/composables/monitoring/useWsFallbackPolling"

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

	useWsFallbackPolling({ callback: reconcileFromSnapshots })

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
		if (typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", handleVisibilityChange)
		}
	})

	return {
		...sensors,
		isHydrating,
		trendReloadKey,
		hydrateAllLocations,
	}
}
