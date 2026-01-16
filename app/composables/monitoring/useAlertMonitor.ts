/**
 * 警示監聽器 Composable（主文件）
 * 
 * 此文件作為入口點，委派給專用的子 composables：
 * - useAlertPolling: 輪詢邏輯
 * - useAlertWebSocket: WebSocket 監聽
 * - useUnresolvedAlertCount: 未解決數量管理
 * 
 * 功能：
 * - 監聽新的警示並顯示通知
 * - 整合 WebSocket 即時推送和輪詢後備機制
 * - Toast 管理和優先級過濾
 * 
 * 參考後端設計：ba-backend/docs/WEBSOCKET_STRATEGY_AND_IMPLEMENTATION.md
 */

import type { Alert, AlertSeverity } from "~/types/alert";
import type { AlertNewEvent, AlertUpdatedEvent } from "~/composables/websocket/useWebSocket";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler, ErrorPriority } from "~/composables/core/useErrorHandler";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { getSourceLabel, getSeverityLabel } from "~/utils/alertUtils";
import { logger } from "~/utils/logger";
import { useAlertPolling } from "./alertMonitor/useAlertPolling";
import { useAlertWebSocket } from "./alertMonitor/useAlertWebSocket";
import { useUnresolvedAlertCount } from "./alertMonitor/useUnresolvedAlertCount";

const alertMonitorLogger = logger.createLogger("AlertMonitor");

/**
 * 警示監聽器（主入口）
 * 協調專用的子 composables
 */
export const useAlertMonitor = () => {
	const toast = useToast();
	const { currentPriority } = useErrorHandler();
	const { connect, disconnect } = useWebSocket();

	// 使用專用的子 composables
	const polling = useAlertPolling();
	const websocket = useAlertWebSocket();
	const alertCount = useUnresolvedAlertCount();

	// 活躍的警報 Toast ID 映射（警報 ID -> Toast ID，用於持續顯示）
	const activeAlertToasts = ref<Map<number, string>>(new Map());

	// 警報嚴重程度映射（用於優先級管理）
	const alertSeverities = ref<Map<number, AlertSeverity>>(new Map());

	// Toast 最大顯示數量（中優先級優化）
	const MAX_ALERT_TOASTS = 8; // 最大顯示 8 個警報 Toast

	// WebSocket 模式標記（是否使用 WebSocket，可通過配置控制）
	const useWebSocketMode = computed(() => {
		const config = useRuntimeConfig();
		return config.public.websocketEnabled !== false;
	});

	/**
	 * 判斷警報類型對應的優先級
	 */
	const getAlertPriority = (alert: Alert): ErrorPriority => {
		// 離線和錯誤類型為高優先級
		if (alert.alert_type === "offline" || alert.alert_type === "error") {
			return ErrorPriority.HIGH;
		}
		// 閾值類型為中優先級
		if (alert.alert_type === "threshold") {
			return ErrorPriority.MEDIUM;
		}
		return ErrorPriority.LOW;
	};

	/**
	 * 檢查是否應該處理此警報（優先級過濾）
	 */
	const shouldProcessAlert = (alert: Alert): boolean => {
		const alertPriority = getAlertPriority(alert);
		// 如果當前有更高優先級的錯誤，忽略低優先級警報
		// 特殊規則：連線錯誤時，不處理數值錯誤
		return (
			currentPriority.value <= alertPriority &&
			!(currentPriority.value >= ErrorPriority.HIGH && alertPriority <= ErrorPriority.MEDIUM)
		);
	};

	/**
	 * 構建警報 Toast 的類型和訊息（詳細格式）
	 */
	const buildAlertToastContent = (alert: Alert): { type: "warning" | "error"; message: string } => {
		const toastType: "warning" | "error" = alert.severity === "warning" ? "warning" : "error";
		const sourceLabel = getSourceLabel(alert.source);
		const severityLabel = getSeverityLabel(alert.severity);

		// 構建位置資訊
		let locationInfo = "";
		if (alert.source_name) {
			locationInfo = alert.source_name;
			// 如果有樓層資訊，添加到位置資訊中
			if (alert.floor_name) {
				locationInfo = `${alert.floor_name} - ${locationInfo}`;
			}
		} else if (alert.device_name) {
			locationInfo = alert.device_name;
		}

		// 格式化時間（HH:mm）
		const timeStr = new Date(alert.created_at).toLocaleTimeString("zh-TW", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		});

		// 構建詳細訊息格式：[嚴重程度] 來源系統 - 位置\n詳細訊息\n時間
		let message = `[${severityLabel}] ${sourceLabel}系統`;
		if (locationInfo) {
			message += ` - ${locationInfo}`;
		}
		message += `\n${alert.message}`;
		message += `\n${timeStr}`;

		return { type: toastType, message };
	};

	/**
	 * 更新現有警報 Toast 的內容
	 */
	const updateAlertToastContent = (toastId: string, alert: Alert) => {
		const { type, message } = buildAlertToastContent(alert);
		toast.updateToast(toastId, { message, type });
	};

	/**
	 * 查找優先級最低的 Toast（用於替換）
	 */
	const findLowestPriorityToast = (): number | undefined => {
		// 優先移除 warning 級別的 Toast
		for (const alertId of activeAlertToasts.value.keys()) {
			const severity = alertSeverities.value.get(alertId);
			if (severity === "warning") {
				return alertId;
			}
		}
		// 如果沒有 warning，移除 error 級別
		for (const alertId of activeAlertToasts.value.keys()) {
			const severity = alertSeverities.value.get(alertId);
			if (severity === "error") {
				return alertId;
			}
		}
		// 如果都沒有，返回第一個（FIFO）
		const firstEntry = activeAlertToasts.value.entries().next();
		return firstEntry.done ? undefined : firstEntry.value[0];
	};

	/**
	 * 顯示警示通知（警報 Toast 永遠是持久顯示）
	 */
	const showAlertNotification = (alert: Alert) => {
		// 檢查數量限制
		const currentToastCount = activeAlertToasts.value.size;
		if (currentToastCount >= MAX_ALERT_TOASTS) {
			// critical 級別警報可以替換低優先級警報
			if (alert.severity === "critical") {
				const lowestPriorityAlertId = findLowestPriorityToast();
				if (lowestPriorityAlertId) {
					removeAlertToast(lowestPriorityAlertId);
				} else {
					alertMonitorLogger.warn(`無法顯示警報 ${alert.id}，已達上限且無法替換`);
					return;
				}
			} else {
				// 非 critical 警報，如果已達上限則跳過顯示
				alertMonitorLogger.log(
					`跳過顯示警報 ${alert.id}，已達上限 (${currentToastCount}/${MAX_ALERT_TOASTS})`
				);
				return;
			}
		}

		const { type: toastType, message } = buildAlertToastContent(alert);

		// 警報 Toast 永遠是持久顯示（duration = 0）
		const toastId = toast.showToast(toastType, message, 0, {
			alertId: alert.id
		});

		if (toastId) {
			activeAlertToasts.value.set(alert.id, toastId);
			alertSeverities.value.set(alert.id, alert.severity);
		}
	};

	/**
	 * 移除特定警報的 Toast（當警報被解決或忽視時調用）
	 */
	const removeAlertToast = (alertId: number) => {
		const toastId = activeAlertToasts.value.get(alertId);
		if (toastId) {
			toast.removeToast(toastId);
			activeAlertToasts.value.delete(alertId);
			alertSeverities.value.delete(alertId);
		}
	};

	/**
	 * 清除所有活躍的警報 Toast
	 */
	const clearAllToasts = () => {
		for (const toastId of activeAlertToasts.value.values()) {
			toast.removeToast(toastId);
		}
		activeAlertToasts.value.clear();
		alertSeverities.value.clear();
	};

	/**
	 * 處理輪詢檢查結果
	 */
	const handlePollingCheck = async () => {
		await polling.checkNewAlerts(
			shouldProcessAlert,
			(alert: Alert) => {
				// 檢查是否已有 Toast
				const existingToastId = activeAlertToasts.value.get(alert.id);
				if (existingToastId) {
					// 更新現有 Toast 的內容
					updateAlertToastContent(existingToastId, alert);
					// 更新嚴重程度映射
					alertSeverities.value.set(alert.id, alert.severity);
				} else {
					// 如果這個警報還沒有顯示 Toast，顯示它
					showAlertNotification(alert);
				}
			},
			(activeIds: Set<number>) => {
				// 移除已解決或忽視的警報的 Toast
				for (const [alertId, toastId] of activeAlertToasts.value.entries()) {
					if (!activeIds.has(alertId)) {
						// 警報已解決或忽視，移除對應的 Toast
						toast.removeToast(toastId);
						activeAlertToasts.value.delete(alertId);
						alertSeverities.value.delete(alertId);
					}
				}
			}
		);
	};

	/**
	 * 處理新警報事件（WebSocket）
	 */
	const handleAlertNew = (alert: AlertNewEvent) => {
		// 優先級過濾：如果有連線錯誤，忽略數值錯誤
		if (!shouldProcessAlert(alert)) {
			return;
		}

		// 如果這個警報還沒有顯示 Toast，顯示它
		if (!activeAlertToasts.value.has(alert.id)) {
			showAlertNotification(alert);
		}
	};

	/**
	 * 處理警報更新事件（WebSocket）
	 */
	const handleAlertUpdated = (data: AlertUpdatedEvent) => {
		const { alert, oldStatus, newStatus } = data;

		// 如果從 active 變為 resolved/ignored，移除 Toast
		if (oldStatus === "active" && (newStatus === "resolved" || newStatus === "ignored")) {
			removeAlertToast(alert.id);
		}

		// 如果從 resolved/ignored 變為 active，顯示 Toast
		if ((oldStatus === "resolved" || oldStatus === "ignored") && newStatus === "active") {
			if (shouldProcessAlert(alert)) {
				showAlertNotification(alert);
			}
		}

		// 處理 active -> active 的內容更新（severity 升級、message 變化）
		if (oldStatus === "active" && newStatus === "active") {
			const existingToastId = activeAlertToasts.value.get(alert.id);
			if (existingToastId) {
				// 更新現有 Toast 的內容
				updateAlertToastContent(existingToastId, alert);
				// 更新嚴重程度映射（severity 可能升級）
				alertSeverities.value.set(alert.id, alert.severity);
			} else if (shouldProcessAlert(alert)) {
				// 如果沒有現有的 Toast，但應該處理此警報，則顯示新的 Toast
				showAlertNotification(alert);
			}
		}
	};

	/**
	 * 開始監聽
	 * 智能監聽：WebSocket 優先，斷線時自動切換到輪詢
	 */
	const startMonitoring = () => {
		// 只在客戶端執行
		if (!process.client) {
			return;
		}

		// 防止多實例運行
		if (polling.isChecking.value || websocket.websocketListenersSetup.value) {
			return;
		}

		// 1. 初始載入：使用 REST API 獲取當前警報列表
		void handlePollingCheck();

		// 2. 如果啟用 WebSocket 模式，嘗試建立連接
		if (useWebSocketMode.value) {
			// 建立 WebSocket 連接
			connect();

			// 設置 WebSocket 連接狀態監聽器
			websocket.setupConnectionWatcher(
				() => {
					// WebSocket 連接成功
					websocket.setupWebSocketListeners(handleAlertNew, handleAlertUpdated);
					polling.stopPolling(); // 停止輪詢，使用 WebSocket
				},
				() => {
					// WebSocket 斷線
					websocket.removeWebSocketListeners();
					// 如果沒有輪詢在運行，啟動輪詢作為後備
					polling.startPolling(handlePollingCheck);
				}
			);
		} else {
			// 直接使用輪詢模式
			polling.startPolling(handlePollingCheck);
		}
	};

	/**
	 * 停止監聽
	 */
	const stopMonitoring = () => {
		// 停止輪詢
		polling.stopPolling();

		// 停止未解決警報數量監聽
		alertCount.stopAlertCountMonitoring();

		// 清理 WebSocket 連接狀態監聽器
		websocket.cleanupConnectionWatcher();

		// 移除 WebSocket 監聽器
		websocket.removeWebSocketListeners();

		// 斷開 WebSocket 連接
		disconnect();

		// 清除所有 Toast
		clearAllToasts();
	};

	/**
	 * 重置監聽器（清除所有活躍的警報 Toast）
	 */
	const reset = () => {
		clearAllToasts();
		polling.reset();
	};

	return {
		// 警報監聽功能
		startMonitoring,
		stopMonitoring,
		reset,
		checkNewAlerts: handlePollingCheck,
		removeAlertToast,
		isChecking: polling.isChecking,
		// WebSocket 狀態（用於調試或 UI 顯示）
		isWebSocketConnected: websocket.isConnected,
		useWebSocketMode: readonly(useWebSocketMode),
		// 未解決警報數量功能
		unresolvedAlertCount: alertCount.unresolvedAlertCount,
		isLoadingCount: alertCount.isLoadingCount,
		loadUnresolvedAlertCount: alertCount.loadUnresolvedAlertCount,
		startAlertCountMonitoring: alertCount.startAlertCountMonitoring,
		stopAlertCountMonitoring: alertCount.stopAlertCountMonitoring
	};
};
