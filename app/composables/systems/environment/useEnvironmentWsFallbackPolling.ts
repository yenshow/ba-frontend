import { onScopeDispose } from "vue"
import type { Ref, ComputedRef } from "vue"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useWebSocket } from "~/composables/websocket/useWebSocket"
import { ENVIRONMENT_STALE_CHECK_INTERVAL_MS } from "~/utils/environmentLive"

const isDocumentVisible = () =>
	typeof document === "undefined" || document.visibilityState === "visible"

type UseEnvironmentWsFallbackPollingOptions = {
	callback: () => void | Promise<void>
	interval?: number | Ref<number> | ComputedRef<number>
}

/**
 * 環境即時資料：WS 連線時依 push 更新；斷線時才啟動 stale reconcile 輪詢。
 * 生命週期隨呼叫 scope 自動清理，無需手動 stop。
 */
export const useEnvironmentWsFallbackPolling = (
	options: UseEnvironmentWsFallbackPollingOptions
) => {
	const { isConnected } = useWebSocket()

	const polling = usePolling({
		callback: options.callback,
		interval: options.interval ?? ENVIRONMENT_STALE_CHECK_INTERVAL_MS,
		immediate: false,
		enabled: () => isDocumentVisible() && !isConnected.value,
	})

	const syncPolling = () => {
		if (isConnected.value) polling.stop()
		else polling.start()
	}

	const stopConnectionWatch = watch(isConnected, syncPolling, { immediate: true })

	onScopeDispose(() => {
		stopConnectionWatch()
		polling.stop()
	})
}
