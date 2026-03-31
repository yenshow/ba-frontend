import type { Alert } from "~/types/alert"
import type { AlertNewEvent, AlertUpdatedEvent } from "~/types/websocket"
import { useToast } from "~/composables/core/useToast"
import { useWebSocket } from "~/composables/websocket/useWebSocket"
import { useAlertPolling } from "~/composables/monitoring/alertMonitor/useAlertPolling"
import { useAlertWebSocket } from "~/composables/monitoring/alertMonitor/useAlertWebSocket"
import { useUnresolvedAlertCount } from "~/composables/monitoring/alertMonitor/useUnresolvedAlertCount"
import { getSourceLabel, getSeverityLabel } from "~/utils/alertUtils"

const sourceRouteMap: Partial<Record<string, string>> = {
	device: "/core/equipment-management",
	environment: "/construction-monitoring/environment",
	people_counting: "/construction-monitoring/people-counting",
	surveillance: "/construction-monitoring/surveillance",
	vehicle_access: "/construction-monitoring/vehicle-access",
}

const getAlertKey = (alertId: number, dimensionKey?: string | null): string =>
	`${alertId}:${dimensionKey || "default"}`

const parseAlertTargetKey = (target: string | number, dimensionKey?: string): string => {
	if (typeof target === "number") {
		return getAlertKey(target, dimensionKey)
	}
	if (target.includes(":")) {
		return target
	}
	if (/^\d+$/.test(target)) {
		return getAlertKey(Number(target), dimensionKey)
	}
	return target
}

const getAlertRoute = (alert: Pick<Alert, "id" | "source">): string =>
	sourceRouteMap[alert.source] || `/core/alert-log?alertId=${alert.id}`

const isActiveAlert = (alert: Pick<Alert, "status">) => alert.status === "active"

export const useAlertMonitor = () => {
	const { warning, removeToast, toasts } = useToast()
	const { connect } = useWebSocket()
	const { checkNewAlerts, startPolling, stopPolling, reset } = useAlertPolling()
	const {
		setupWebSocketListeners,
		removeWebSocketListeners,
		setupConnectionWatcher,
		cleanupConnectionWatcher,
	} = useAlertWebSocket()
	const {
		unresolvedAlertCount,
		isLoadingCount,
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring,
	} = useUnresolvedAlertCount()

	const isMonitoring = useState<boolean>("alert-monitor:is-monitoring", () => false)
	const alertToastIds = useState<Record<string, string>>("alert-monitor:toast-ids", () => ({}))
	const activeAlertKeys = useState<string[]>("alert-monitor:active-alert-keys", () => [])

	const shouldProcessAlert = (alert: Alert) => isActiveAlert(alert)

	const addActiveAlertKey = (key: string) => {
		if (activeAlertKeys.value.includes(key)) return
		activeAlertKeys.value.push(key)
	}

	const removeActiveAlertKey = (key: string) => {
		const idx = activeAlertKeys.value.indexOf(key)
		if (idx === -1) return
		activeAlertKeys.value.splice(idx, 1)
	}

	const removeAlertToast = (target: string | number, dimensionKey?: string) => {
		const key = parseAlertTargetKey(target, dimensionKey)
		const toastId = alertToastIds.value[key]

		if (toastId) {
			removeToast(toastId)
			delete alertToastIds.value[key]
			removeActiveAlertKey(key)
			return
		}

		const matchedToast = toasts.value.find(
			(t) => t.alertKey === key || (typeof target === "number" && t.alertId === target)
		)
		if (matchedToast) {
			removeToast(matchedToast.id)
		}

		removeActiveAlertKey(key)
	}

	const upsertAlertToast = (alert: Alert) => {
		if (!shouldProcessAlert(alert)) {
			removeAlertToast(alert.id, alert.dimension_key)
			return
		}

		const alertKey = getAlertKey(alert.id, alert.dimension_key)
		const message = `[${getSourceLabel(alert.source)}][${getSeverityLabel(alert.severity)}] ${alert.message}`
		const toastId = warning(message, 0, {
			alertId: alert.id,
			alertKey,
			alertSource: alert.source,
			alertSourceId: alert.source_id,
			alertRoute: getAlertRoute(alert),
		})

		if (toastId) {
			alertToastIds.value[alertKey] = toastId
		}
		addActiveAlertKey(alertKey)
	}

	const handleAlertNew = (alert: AlertNewEvent) => {
		upsertAlertToast(alert)
	}

	const handleAlertUpdated = (data: AlertUpdatedEvent) => {
		upsertAlertToast(data.alert)
	}

	const checkAlertsByPolling = async () => {
		await checkNewAlerts(
			shouldProcessAlert,
			(alert) => {
				upsertAlertToast(alert)
			},
			(currentActiveAlertIds) => {
				const toRemove = activeAlertKeys.value.filter((key) => {
					const [idPart] = key.split(":")
					const alertId = Number(idPart)
					return Number.isFinite(alertId) && !currentActiveAlertIds.has(alertId)
				})

				for (const key of toRemove) {
					removeAlertToast(key)
				}
			}
		)
	}

	const startMonitoring = () => {
		if (!process.client || isMonitoring.value) return

		isMonitoring.value = true
		connect()

		setupWebSocketListeners(handleAlertNew, handleAlertUpdated)
		setupConnectionWatcher(
			() => {
				stopPolling()
			},
			() => {
				startPolling(() => {
					void checkAlertsByPolling()
				})
			}
		)

		void checkAlertsByPolling()
		void loadUnresolvedAlertCount()
		startAlertCountMonitoring()
	}

	const stopMonitoring = () => {
		if (!isMonitoring.value) return

		stopPolling()
		reset()
		removeWebSocketListeners()
		cleanupConnectionWatcher()
		stopAlertCountMonitoring()

		for (const key of activeAlertKeys.value.slice()) {
			removeAlertToast(key)
		}

		isMonitoring.value = false
	}

	return {
		isMonitoring: readonly(isMonitoring),
		unresolvedAlertCount,
		isLoadingCount,
		startMonitoring,
		stopMonitoring,
		removeAlertToast,
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring,
	}
}
