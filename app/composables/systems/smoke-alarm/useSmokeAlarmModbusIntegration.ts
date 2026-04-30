import { computed, ref, watch, type Ref } from "vue"
import type { SmokeAlarmZone, SmokeAlarmStatusItem } from "~/types/smoke-alarm"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useModbusPollingPolicy } from "~/composables/monitoring/useModbusPollingPolicy"
import { useSmokeAlarmApi } from "~/composables/systems/smoke-alarm/useSmokeAlarmApi"

export const useSmokeAlarmModbusIntegration = (zones: Ref<SmokeAlarmZone[]>) => {
	const smokeAlarmApi = useSmokeAlarmApi()
	const { handleError } = useErrorHandler()

	const statusItems = ref<SmokeAlarmStatusItem[]>([])
	let inflightSnapshot: Promise<void> | null = null
	const pollingPolicy = useModbusPollingPolicy()

	// 保留同名 API：頁面初始化流程仍會先呼叫（但 smoke-alarm 現在只依賴後端 /status 快照）
	const preloadDeviceInfos = async () => {}

	const loadStatusSnapshot = async (options?: { syncAlerts?: boolean }) => {
		if (inflightSnapshot) {
			await inflightSnapshot
			return
		}

		inflightSnapshot = (async () => {
			try {
				const syncAlerts = options?.syncAlerts ?? true
				const { items } = await smokeAlarmApi.getStatus({ syncAlerts })
				statusItems.value = items || []
				pollingPolicy.recordSuccess()
			} catch (error) {
				pollingPolicy.recordFailure()
				handleError(error, "載入 smoke-alarm 狀態失敗")
			}
		})()
			.catch((error) => {
				pollingPolicy.recordFailure()
				throw error
			})
			.finally(() => {
				inflightSnapshot = null
			})

		await inflightSnapshot
	}

	const { start: startPolling, stop: stopPolling } = usePolling({
		callback: async () => {
			if (typeof document === "undefined") return
			if (document.visibilityState !== "visible") return
			await loadStatusSnapshot()
		},
		interval: pollingPolicy.pollIntervalMs,
		immediate: true,
		enabled: () => typeof document !== "undefined" && document.visibilityState === "visible",
		onError: (err) => {
			handleError(err, "載入 smoke-alarm 狀態失敗")
		},
	})

	const handleVisibilityChange = () => {
		if (typeof document === "undefined") return
		if (document.visibilityState === "visible") {
			void loadStatusSnapshot()
		}
	}

	watch(
		() => zones.value,
		async () => {
			await preloadDeviceInfos()
			void loadStatusSnapshot()
		},
		{ deep: true }
	)

	return {
		statusItems: computed(() => statusItems.value),
		preloadDeviceInfos,
		loadStatusSnapshot,
		startAutoRefresh: () => startPolling(),
		stopAutoRefresh: () => {
			stopPolling()
		},
		handleVisibilityChange,
	}
}

