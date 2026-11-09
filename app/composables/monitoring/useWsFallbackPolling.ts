import {
	onScopeDispose,
	watch,
	toValue,
	type MaybeRefOrGetter,
	type Ref,
	type ComputedRef,
} from "vue"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useWebSocket } from "~/composables/websocket/useWebSocket"
import { isApiRateLimitedNow } from "~/utils/apiRateLimitGate"
import { FALLBACK_POLL_MS } from "~/utils/realtimeTiming"

const isDocumentVisible = () =>
	typeof document === "undefined" || document.visibilityState === "visible"

type UseWsFallbackPollingOptions = {
	callback: () => void | Promise<void>
	interval?: number | Ref<number> | ComputedRef<number>
	/** 額外門檻（預設 true）；與 WS 斷線 AND 後才輪詢 */
	active?: MaybeRefOrGetter<boolean>
}

/**
 * WS 連線時依 push；斷線且分頁可見（且 active）時才 REST 後備。
 * 全站 429 期間略過 callback，避免後備輪詢灌爆限流。
 */
export const useWsFallbackPolling = (options: UseWsFallbackPollingOptions) => {
	const { isConnected } = useWebSocket()

	const isActiveGate = () => toValue(options.active ?? true)

	const polling = usePolling({
		// 429 閘非響應式；僅在 tick 內略過即可（enabled 無法自動因 until 變化重算）
		callback: async () => {
			if (isApiRateLimitedNow()) return
			await options.callback()
		},
		interval: options.interval ?? FALLBACK_POLL_MS,
		immediate: false,
		enabled: () => isDocumentVisible() && !isConnected.value && isActiveGate(),
	})

	const syncPolling = () => {
		if (!isConnected.value && isActiveGate()) polling.start()
		else polling.stop()
	}

	const stopWatch = watch(
		[isConnected, () => isActiveGate()],
		syncPolling,
		{ immediate: true },
	)

	onScopeDispose(() => {
		stopWatch()
		polling.stop()
	})

	return {
		isActive: polling.isActive,
		start: polling.start,
		stop: polling.stop,
		sync: syncPolling,
	}
}
