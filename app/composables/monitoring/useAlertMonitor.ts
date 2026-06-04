import type { Alert } from "~/types/alert"
import type { AlertNewEvent, AlertUpdatedEvent } from "~/types/websocket"
import { watch } from "vue"
import { useToast } from "~/composables/core/useToast"
import { useWebSocket } from "~/composables/websocket/useWebSocket"
import { useAlertPolling } from "~/composables/monitoring/alertMonitor/useAlertPolling"
import { useAlertEventBus } from "~/composables/monitoring/alertMonitor/useAlertEventBus"
import { useUnresolvedAlertCount } from "~/composables/monitoring/alertMonitor/useUnresolvedAlertCount"
import { useAuth } from "~/composables/core/useAuth"
import { PERM } from "~/config/permissionCodes"
import { getSourceLabel, getSeverityLabel } from "~/utils/alertUtils"

const MAX_ALERT_TOASTS = 5
export const SUMMARY_TOAST_KEY = "__alert-summary__"

const sourceRouteMap: Partial<Record<string, string>> = {
	device: "/core/device",
	environment: "/construction-monitoring/environment",
	drainage: "/infrastructure/drainage",
	power: "/infrastructure/power",
	air_circulation: "/infrastructure/air-circulation",
	fire: "/security/fire",
	smoke_alarm: "/security/smoke-alarm",
	emergency_rescue: "/security/emergency",
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

const formatZoneLocationLabel = (
	alert: Pick<Alert, "zone_name" | "source_name" | "source_display_name">
) =>
	[alert.zone_name, alert.source_display_name || alert.source_name].filter(Boolean).join("-").trim()

/**
 * 後端部分子系統（例如緊急求救）在 message 內仍可能回傳 `source: id` 的原始 label（如 `emergency_rescue: 140`）。
 * 前端 toast 需對齊「衛生排水」的顯示方式：以 `區域-地點` 呈現，避免顯示系統 key。
 */
const normalizeAlertMessageForToast = (alert: Alert): string => {
	const raw = String(alert.message ?? "").trim()
	if (!raw) return ""

	const zoneLocation = formatZoneLocationLabel(alert)
	if (!zoneLocation) return raw

	// 僅在訊息開頭是「source: id」時進行替換，避免誤傷其他自訂訊息
	const headPattern = new RegExp(
		`^\\s*${String(alert.source).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*:\\s*\\d+\\s*`,
		"i"
	)
	if (!headPattern.test(raw)) return raw

	return raw.replace(headPattern, `${zoneLocation} `).replace(/\s+/g, " ").trim()
}

export const useAlertMonitor = () => {
	const { warning, error, info, removeToast, updateToast, toasts } = useToast()
	const { connect, isConnected } = useWebSocket()
	const { checkNewAlerts, startPolling, stopPolling, reset } = useAlertPolling()
	const { hasPermission } = useAuth()

	let stopConnectionWatcher: (() => void) | null = null
	const setupConnectionWatcher = (onConnected: () => void, onDisconnected: () => void) => {
		if (stopConnectionWatcher) {
			stopConnectionWatcher()
			stopConnectionWatcher = null
		}
		stopConnectionWatcher = watch(
			isConnected,
			(connected) => {
				if (connected) onConnected()
				else onDisconnected()
			},
			{ immediate: true }
		)
	}
	const cleanupConnectionWatcher = () => {
		if (stopConnectionWatcher) {
			stopConnectionWatcher()
			stopConnectionWatcher = null
		}
	}

	const {
		setup: setupEventBus,
		teardown: teardownEventBus,
		onAlertNew: busOnAlertNew,
		onAlertUpdated: busOnAlertUpdated,
		onAlertDailyRollover: busOnAlertDailyRollover,
		clearAll: clearEventBusHandlers,
	} = useAlertEventBus()
	const {
		unresolvedAlertCount,
		isLoadingCount,
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring,
	} = useUnresolvedAlertCount()

	const isMonitoring = useState<boolean>("alert-monitor:is-monitoring", () => false)
	const alertToastIds = useState<Record<string, string>>("alert-monitor:toast-ids", () => ({}))
	const activeAlertKeys = useState<Set<string>>("alert-monitor:active-alert-keys", () => new Set())

	const shouldProcessAlert = (alert: Alert) => alert.status === "active"

	const addActiveAlertKey = (key: string) => {
		activeAlertKeys.value.add(key)
	}

	const removeActiveAlertKey = (key: string) => {
		activeAlertKeys.value.delete(key)
	}

	const removeAlertToast = (target: string | number, dimensionKey?: string) => {
		const key = parseAlertTargetKey(target, dimensionKey)
		const toastId = alertToastIds.value[key]

		if (toastId) {
			removeToast(toastId)
			delete alertToastIds.value[key]
		} else {
			const matchedToast = toasts.value.find(
				(t) => t.alertKey === key || (typeof target === "number" && t.alertId === target)
			)
			if (matchedToast) {
				removeToast(matchedToast.id)
			}
		}

		removeActiveAlertKey(key)
		upsertSummaryToast()
	}

	/**
	 * 取得目前持久警報 Toast 數量
	 */
	const getAlertToastCount = (): number => {
		return toasts.value.filter((t) => t.alertId != null && t.duration === 0).length
	}

	/**
	 * 移除最舊的警報 Toast（FIFO）
	 */
	const evictOldestAlertToast = () => {
		const alertToast = toasts.value.find((t) => t.alertId != null && t.duration === 0)
		if (alertToast) {
			removeToast(alertToast.id)
			if (alertToast.alertKey) {
				delete alertToastIds.value[alertToast.alertKey]
			}
		}
	}

	const getOverflowCount = (): number =>
		Math.max(0, activeAlertKeys.value.size - getAlertToastCount())

	const removeSummaryToast = () => {
		const toastId = alertToastIds.value[SUMMARY_TOAST_KEY]
		if (toastId) {
			removeToast(toastId)
			delete alertToastIds.value[SUMMARY_TOAST_KEY]
		}
	}

	const upsertSummaryToast = () => {
		const overflow = getOverflowCount()
		if (overflow <= 0) {
			removeSummaryToast()
			return
		}

		const message = `還有 ${overflow} 則未處理警報`
		const existingToastId = alertToastIds.value[SUMMARY_TOAST_KEY]

		if (existingToastId) {
			const stillExists = toasts.value.some((t) => t.id === existingToastId)
			if (stillExists) {
				updateToast(existingToastId, { message })
				return
			}
			delete alertToastIds.value[SUMMARY_TOAST_KEY]
		}

		const toastId = info(message, 0, {
			alertKey: SUMMARY_TOAST_KEY,
			alertRoute: "/core/alert-log",
		})
		if (toastId) {
			alertToastIds.value[SUMMARY_TOAST_KEY] = toastId
		}
	}

	const upsertAlertToast = (alert: Alert) => {
		if (!shouldProcessAlert(alert)) {
			removeAlertToast(alert.id, alert.dimension_key)
			return
		}

		const alertKey = getAlertKey(alert.id, alert.dimension_key)
		const messageBody = normalizeAlertMessageForToast(alert)
		const message = `[${getSourceLabel(alert.source)}][${getSeverityLabel(alert.severity)}] ${messageBody}`

		const show =
			alert.alert_type === "error" ? info : alert.severity === "warning" ? warning : error

		// 若已有同 key 的 Toast，直接更新不計入上限
		const existingToastId = alertToastIds.value[alertKey]
		if (!existingToastId && getAlertToastCount() >= MAX_ALERT_TOASTS) {
			evictOldestAlertToast()
		}

		const toastId = show(message, 0, {
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
		upsertSummaryToast()
	}

	const handleAlertNew = (alert: AlertNewEvent) => {
		upsertAlertToast(alert)
	}

	const handleAlertUpdated = (data: AlertUpdatedEvent) => {
		upsertAlertToast(data.alert)
	}

	/** 日界線批次結案：關閉持久警報 Toast（未逐筆 alert:updated） */
	const handleAlertDailyRollover = () => {
		const keys = [...activeAlertKeys.value]
		for (const key of keys) {
			removeAlertToast(key)
		}
		removeSummaryToast()
		void loadUnresolvedAlertCount()
	}

	const checkAlertsByPolling = async () => {
		await checkNewAlerts(
			shouldProcessAlert,
			(alert) => {
				upsertAlertToast(alert)
			},
			(currentActiveAlertIds) => {
				const toRemove = [...activeAlertKeys.value].filter((key) => {
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
		// 無警示紀錄權限：不要建立 websocket/polling，避免 403 噪音
		if (!hasPermission(PERM.alertLog.module)) {
			return
		}

		isMonitoring.value = true
		connect()

		// 設置 EventBus（唯一 WS 訂閱）並註冊 Toast handler
		setupEventBus()
		busOnAlertNew(handleAlertNew)
		busOnAlertUpdated(handleAlertUpdated)
		busOnAlertDailyRollover(handleAlertDailyRollover)

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
		clearEventBusHandlers()
		teardownEventBus()
		cleanupConnectionWatcher()
		stopAlertCountMonitoring()

		for (const toastId of Object.values(alertToastIds.value)) {
			removeToast(toastId)
		}
		alertToastIds.value = {}
		activeAlertKeys.value.clear()

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
