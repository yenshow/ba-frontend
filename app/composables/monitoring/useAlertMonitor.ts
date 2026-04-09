import type { Alert } from "~/types/alert";
import type { AlertNewEvent, AlertUpdatedEvent } from "~/types/websocket";
import { watch } from "vue";
import { useToast } from "~/composables/core/useToast";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useAlertPolling } from "~/composables/monitoring/alertMonitor/useAlertPolling";
import { useAlertEventBus } from "~/composables/monitoring/alertMonitor/useAlertEventBus";
import { useUnresolvedAlertCount } from "~/composables/monitoring/alertMonitor/useUnresolvedAlertCount";
import { getSourceLabel, getSeverityLabel } from "~/utils/alertUtils";

const MAX_ALERT_TOASTS = 5;
export const SUMMARY_TOAST_KEY = "__alert-summary__";

/**
 * Construction 並沒有 Central 的各子系統監控頁（照明/空調/排水/消防/電力/緊急等）。
 * 因此警報一律導回 `/core/alert-log`（可帶 alertId），僅 device 例外導至設備管理。
 */
const sourceRouteMap: Partial<Record<string, string>> = {
	device: "/core/equipment-management",
};

const getAlertKey = (alertId: number, dimensionKey?: string | null): string =>
	`${alertId}:${dimensionKey || "default"}`;

const parseAlertTargetKey = (target: string | number, dimensionKey?: string): string => {
	if (typeof target === "number") {
		return getAlertKey(target, dimensionKey);
	}
	if (target.includes(":")) {
		return target;
	}
	if (/^\d+$/.test(target)) {
		return getAlertKey(Number(target), dimensionKey);
	}
	return target;
};

const getAlertRoute = (alert: Pick<Alert, "id" | "source">): string =>
	sourceRouteMap[alert.source] || `/core/alert-log?alertId=${alert.id}`;

export const useAlertMonitor = () => {
	const { warning, error, info, removeToast, updateToast, toasts } = useToast();
	const { connect, isConnected } = useWebSocket();
	const { checkNewAlerts, startPolling, stopPolling, reset } = useAlertPolling();

	let stopConnectionWatcher: (() => void) | null = null;
	const setupConnectionWatcher = (onConnected: () => void, onDisconnected: () => void) => {
		if (stopConnectionWatcher) {
			stopConnectionWatcher();
			stopConnectionWatcher = null;
		}
		stopConnectionWatcher = watch(
			isConnected,
			connected => {
				if (connected) onConnected();
				else onDisconnected();
			},
			{ immediate: true }
		);
	};
	const cleanupConnectionWatcher = () => {
		if (stopConnectionWatcher) {
			stopConnectionWatcher();
			stopConnectionWatcher = null;
		}
	};

	const {
		setup: setupEventBus,
		teardown: teardownEventBus,
		onAlertNew: busOnAlertNew,
		onAlertUpdated: busOnAlertUpdated,
		clearAll: clearEventBusHandlers
	} = useAlertEventBus();
	const {
		unresolvedAlertCount,
		isLoadingCount,
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring
	} = useUnresolvedAlertCount();

	const isMonitoring = useState<boolean>("alert-monitor:is-monitoring", () => false);
	const alertToastIds = useState<Record<string, string>>("alert-monitor:toast-ids", () => ({}));
	const activeAlertKeys = useState<Set<string>>("alert-monitor:active-alert-keys", () => new Set());

	const shouldProcessAlert = (alert: Alert) => alert.status === "active";

	const addActiveAlertKey = (key: string) => {
		activeAlertKeys.value.add(key);
	};

	const removeActiveAlertKey = (key: string) => {
		activeAlertKeys.value.delete(key);
	};

	const removeAlertToast = (target: string | number, dimensionKey?: string) => {
		const key = parseAlertTargetKey(target, dimensionKey);
		const toastId = alertToastIds.value[key];

		if (toastId) {
			removeToast(toastId);
			delete alertToastIds.value[key];
		} else {
			const matchedToast = toasts.value.find(
				t => t.alertKey === key || (typeof target === "number" && t.alertId === target)
			);
			if (matchedToast) {
				removeToast(matchedToast.id);
			}
		}

		removeActiveAlertKey(key);
		upsertSummaryToast();
	};

	const getAlertToastCount = (): number =>
		toasts.value.filter(t => t.alertId != null && t.duration === 0).length;

	const evictOldestAlertToast = () => {
		const alertToast = toasts.value.find(t => t.alertId != null && t.duration === 0);
		if (alertToast) {
			removeToast(alertToast.id);
			if (alertToast.alertKey) {
				delete alertToastIds.value[alertToast.alertKey];
			}
		}
	};

	const getOverflowCount = (): number =>
		Math.max(0, activeAlertKeys.value.size - getAlertToastCount());

	const removeSummaryToast = () => {
		const toastId = alertToastIds.value[SUMMARY_TOAST_KEY];
		if (toastId) {
			removeToast(toastId);
			delete alertToastIds.value[SUMMARY_TOAST_KEY];
		}
	};

	const upsertSummaryToast = () => {
		const overflow = getOverflowCount();
		if (overflow <= 0) {
			removeSummaryToast();
			return;
		}

		const message = `還有 ${overflow} 則未處理警報`;
		const existingToastId = alertToastIds.value[SUMMARY_TOAST_KEY];

		if (existingToastId) {
			const stillExists = toasts.value.some(t => t.id === existingToastId);
			if (stillExists) {
				updateToast(existingToastId, { message });
				return;
			}
			delete alertToastIds.value[SUMMARY_TOAST_KEY];
		}

		const toastId = info(message, 0, {
			alertKey: SUMMARY_TOAST_KEY,
			alertRoute: "/core/alert-log"
		});
		if (toastId) {
			alertToastIds.value[SUMMARY_TOAST_KEY] = toastId;
		}
	};

	const upsertAlertToast = (alert: Alert) => {
		if (!shouldProcessAlert(alert)) {
			removeAlertToast(alert.id, alert.dimension_key);
			return;
		}

		const alertKey = getAlertKey(alert.id, alert.dimension_key);
		const message = `[${getSourceLabel(alert.source)}][${getSeverityLabel(alert.severity)}] ${alert.message}`;

		const show = alert.alert_type === "error" ? info : alert.severity === "warning" ? warning : error;

		const existingToastId = alertToastIds.value[alertKey];
		if (!existingToastId && getAlertToastCount() >= MAX_ALERT_TOASTS) {
			evictOldestAlertToast();
		}

		const toastId = show(message, 0, {
			alertId: alert.id,
			alertKey,
			alertSource: alert.source,
			alertSourceId: alert.source_id,
			alertRoute: getAlertRoute(alert)
		});

		if (toastId) {
			alertToastIds.value[alertKey] = toastId;
		}
		addActiveAlertKey(alertKey);
		upsertSummaryToast();
	};

	const handleAlertNew = (alert: AlertNewEvent) => {
		upsertAlertToast(alert);
	};

	const handleAlertUpdated = (data: AlertUpdatedEvent) => {
		upsertAlertToast(data.alert);
	};

	const checkAlertsByPolling = async () => {
		await checkNewAlerts(
			shouldProcessAlert,
			alert => {
				upsertAlertToast(alert);
			},
			currentActiveAlertIds => {
				const toRemove = [...activeAlertKeys.value].filter(key => {
					const [idPart] = key.split(":");
					const alertId = Number(idPart);
					return Number.isFinite(alertId) && !currentActiveAlertIds.has(alertId);
				});

				for (const key of toRemove) {
					removeAlertToast(key);
				}
			}
		);
	};

	const startMonitoring = () => {
		if (!process.client || isMonitoring.value) return;

		isMonitoring.value = true;
		connect();

		setupEventBus();
		busOnAlertNew(handleAlertNew);
		busOnAlertUpdated(handleAlertUpdated);

		setupConnectionWatcher(
			() => {
				stopPolling();
			},
			() => {
				startPolling(() => {
					void checkAlertsByPolling();
				});
			}
		);

		void checkAlertsByPolling();
		void loadUnresolvedAlertCount();
		startAlertCountMonitoring();
	};

	const stopMonitoring = () => {
		if (!isMonitoring.value) return;

		stopPolling();
		reset();
		clearEventBusHandlers();
		teardownEventBus();
		cleanupConnectionWatcher();
		stopAlertCountMonitoring();

		for (const toastId of Object.values(alertToastIds.value)) {
			removeToast(toastId);
		}
		alertToastIds.value = {};
		activeAlertKeys.value.clear();

		isMonitoring.value = false;
	};

	return {
		isMonitoring: readonly(isMonitoring),
		unresolvedAlertCount,
		isLoadingCount,
		startMonitoring,
		stopMonitoring,
		removeAlertToast,
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring
	};
};


