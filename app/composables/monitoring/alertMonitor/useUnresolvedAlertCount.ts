/**
 * 未解決警報數量：WebSocket alert:count + 斷線後備 REST（無連線校準）
 */

import type { AlertSource } from "~/types/alert"
import type { AlertCountEvent } from "~/types/websocket"
import { watch, toValue, onScopeDispose } from "vue"
import { logger } from "~/utils/logger"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import { useWebSocket } from "~/composables/websocket/useWebSocket"
import { useAccessGate } from "~/composables/core/useAccessGate"
import { useWsFallbackPolling } from "~/composables/monitoring/useWsFallbackPolling"
import { PERM } from "~/config/permissionCodes"
import { EVENT_COALESCE_MS } from "~/utils/realtimeTiming"

const countLogger = logger.createLogger("UnresolvedAlertCount")

export const useUnresolvedAlertCount = () => {
	const alertApi = useAlertApi()
	const { isConnected, on, off } = useWebSocket()
	const { canLoadFeature, useWsModuleGate } = useAccessGate()
	const alertGate = { permissionCode: PERM.alertLog.module } as const
	const canSubscribe = useWsModuleGate(null, alertGate)

	const unresolvedAlertCount = useState<number>("alert-monitor:unresolved-count", () => 0)
	const isLoadingCount = useState<boolean>("alert-monitor:unresolved-count-loading", () => false)
	const monitoringAllowed = useState<boolean>("alert-monitor:unresolved-count-monitoring", () => false)

	let handleAlertCount: ((data: AlertCountEvent) => void) | null = null
	let countDebounceTimer: ReturnType<typeof setTimeout> | null = null
	let latestCountPayload: AlertCountEvent | null = null

	const loadUnresolvedAlertCount = async (filters?: { source?: AlertSource }) => {
		if (!canLoadFeature(null, alertGate)) {
			unresolvedAlertCount.value = 0
			return
		}
		if (isLoadingCount.value) return

		isLoadingCount.value = true
		try {
			const result = await alertApi.getUnresolvedAlertCount({
				...filters,
			})
			unresolvedAlertCount.value = result.count || 0
		} catch (error) {
			unresolvedAlertCount.value = 0
			countLogger.warn("載入未解決警報數量失敗", { error })
		} finally {
			isLoadingCount.value = false
		}
	}

	const applyLatestCount = () => {
		if (latestCountPayload && typeof latestCountPayload.count === "number") {
			unresolvedAlertCount.value = latestCountPayload.count
		}
		latestCountPayload = null
		countDebounceTimer = null
	}

	const handleAlertCountEvent = (data: AlertCountEvent) => {
		latestCountPayload = data
		if (countDebounceTimer) clearTimeout(countDebounceTimer)
		countDebounceTimer = setTimeout(applyLatestCount, EVENT_COALESCE_MS)
	}

	useWsFallbackPolling({
		callback: () => void loadUnresolvedAlertCount(),
		active: () => monitoringAllowed.value && Boolean(toValue(canSubscribe)),
	})

	const syncAlertCountSubscription = () => {
		if (handleAlertCount) {
			off("alert:count", handleAlertCount)
		}
		if (!monitoringAllowed.value || !toValue(canSubscribe) || !isConnected.value) {
			return
		}
		if (handleAlertCount) {
			on("alert:count", handleAlertCount)
		}
	}

	const stopWatch = watch(
		[() => isConnected.value, canSubscribe, monitoringAllowed] as const,
		syncAlertCountSubscription,
		{ immediate: true },
	)

	const clearCountDebounce = () => {
		if (countDebounceTimer) {
			clearTimeout(countDebounceTimer)
			countDebounceTimer = null
		}
		latestCountPayload = null
	}

	const startAlertCountMonitoring = () => {
		if (!canLoadFeature(null, alertGate)) {
			unresolvedAlertCount.value = 0
			monitoringAllowed.value = false
			handleAlertCount = null
			return
		}

		handleAlertCount = handleAlertCountEvent
		monitoringAllowed.value = true
		syncAlertCountSubscription()
	}

	const stopAlertCountMonitoring = () => {
		monitoringAllowed.value = false
		if (handleAlertCount) {
			off("alert:count", handleAlertCount)
			handleAlertCount = null
		}
		clearCountDebounce()
	}

	onScopeDispose(() => {
		stopAlertCountMonitoring()
		stopWatch()
	})

	return {
		unresolvedAlertCount: readonly(unresolvedAlertCount),
		isLoadingCount: readonly(isLoadingCount),
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring,
	}
}
