import { useAlertApi } from "../composables/useAlertApi";
import { useToast } from "../composables/useToast";
import { useErrorHandler, ErrorPriority } from "../composables/useErrorHandler";
import {
	useWebSocket,
	type AlertNewEvent,
	type AlertUpdatedEvent,
	type AlertCountEvent
} from "../composables/useWebSocket";
import type { Alert, AlertFilters, AlertSource, AlertSeverity } from "../types/alert";
import { getSourceLabel, getSeverityLabel } from "../utils/alertUtils";

/**
 * 警示監聽器
 * 用於監聽新的警示並顯示通知
 * 整合 WebSocket 即時推送和輪詢後備機制
 * 參考後端設計：ba-backend/docs/WEBSOCKET_STRATEGY_AND_IMPLEMENTATION.md
 */
export const useAlertMonitor = () => {
	const alertApi = useAlertApi();
	const toast = useToast();
	const { currentPriority, handleError } = useErrorHandler();
	const { isConnected, connect, disconnect, on, off, cleanup } = useWebSocket();

	// 活躍的警報 Toast ID 映射（警報 ID -> Toast ID，用於持續顯示）
	const activeAlertToasts = ref<Map<number, string>>(new Map());

	// 警報嚴重程度映射（用於優先級管理）
	const alertSeverities = ref<Map<number, AlertSeverity>>(new Map());

	// 上次檢查時間（用於增量查詢）
	const lastCheckTime = ref<Date | null>(null);

	// 基礎輪詢間隔（毫秒）
	const BASE_POLLING_INTERVAL = 30000; // 30 秒

	// Toast 最大顯示數量（中優先級優化）
	const MAX_ALERT_TOASTS = 8; // 最大顯示 8 個警報 Toast

	// 輪詢計時器
	let pollingTimer: ReturnType<typeof setTimeout> | null = null;

	// 頁面可見性變化監聽器（用於清理）
	let visibilityChangeHandler: (() => void) | null = null;

	// 是否正在檢查
	const isChecking = ref(false);

	// 未解決警報數量（整合自 useAlertCount）
	const unresolvedAlertCount = ref(0);
	const isLoadingCount = ref(false);

	// WebSocket 模式標記（是否使用 WebSocket，可通過配置控制）
	const useWebSocketMode = computed(() => {
		const config = useRuntimeConfig();
		return config.public.websocketEnabled !== false;
	});

	// 未解決警報數量的 WebSocket 事件處理函數
	let handleAlertCount: ((data: AlertCountEvent) => void) | null = null;

	// 未解決警報數量的輪詢計時器
	let countPollingTimer: ReturnType<typeof setInterval> | null = null;

	// 未解決警報數量的 WebSocket 連接狀態監聽器
	let countWebsocketWatcher: ReturnType<typeof watch> | null = null;

	// 是否已設置 WebSocket 監聽器
	let websocketListenersSetup = false;

	// WebSocket 連接狀態監聽器（用於清理）
	let websocketStatusWatcher: ReturnType<typeof watch> | null = null;

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
	 * 檢查新的警示
	 */
	const checkNewAlerts = async () => {
		if (isChecking.value) {
			return;
		}

		isChecking.value = true;

		try {
			// 使用增量查詢優化：只獲取更新時間在最後檢查時間之後的警報
			// 如果沒有上次檢查時間，獲取所有 active 警報
			const filters: AlertFilters = {
				status: "active",
				limit: 50,
				offset: 0,
				orderBy: "created_at",
				order: "desc"
			};

			// 如果有上次檢查時間，使用增量查詢
			if (lastCheckTime.value) {
				filters.updated_after = lastCheckTime.value.toISOString();
			}

			const result = await alertApi.getAlerts(filters);

			// 追蹤當前活躍的警報 ID
			const currentActiveAlertIds = new Set<number>();

			// 處理所有未解決的警報（持續顯示）
			for (const alert of result.alerts) {
				// 優先級過濾：如果有連線錯誤，忽略數值錯誤
				if (!shouldProcessAlert(alert)) {
					continue;
				}

				currentActiveAlertIds.add(alert.id);

				// 檢查是否已有 Toast
				const existingToastId = activeAlertToasts.value.get(alert.id);
				if (existingToastId) {
					// 更新現有 Toast 的內容（severity 可能升級、message 可能變化）
					updateAlertToastContent(existingToastId, alert);
					// 更新嚴重程度映射（severity 可能升級）
					alertSeverities.value.set(alert.id, alert.severity);
				} else {
					// 如果這個警報還沒有顯示 Toast，顯示它
					showAlertNotification(alert);
				}
			}

			// 移除已解決或忽視的警報的 Toast
			for (const [alertId, toastId] of activeAlertToasts.value.entries()) {
				if (!currentActiveAlertIds.has(alertId)) {
					// 警報已解決或忽視，移除對應的 Toast
					toast.removeToast(toastId);
					activeAlertToasts.value.delete(alertId);
				}
			}

			// 更新最後檢查時間（用於下次增量查詢）
			lastCheckTime.value = new Date();
		} catch (error) {
			// 使用統一錯誤處理
			handleError(error, "檢查新警示失敗");
		} finally {
			isChecking.value = false;
		}
	};

	/**
	 * 構建警報 Toast 的類型和訊息（詳細格式）
	 * @param alert - 警報物件
	 * @returns Toast 類型和訊息
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
			if (alert.source === "environment" && alert.environment_floor_name) {
				locationInfo = `${alert.environment_floor_name} - ${locationInfo}`;
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
	 * @param toastId - Toast ID
	 * @param alert - 警報物件
	 */
	const updateAlertToastContent = (toastId: string, alert: Alert) => {
		const { type, message } = buildAlertToastContent(alert);
		toast.updateToast(toastId, { message, type });
	};

	/**
	 * 查找優先級最低的 Toast（用於替換）
	 * @returns 優先級最低的 alertId，如果沒有則返回 undefined
	 */
	const findLowestPriorityToast = (): number | undefined => {
		// 優先移除 warning 級別的 Toast
		for (const alertId of activeAlertToasts.value.keys()) {
			const severity = alertSeverities.value.get(alertId);
			if (severity === "warning") {
				return alertId;
			}
		}
		// 如果沒有 warning，移除 error 級別（critical 和 error 都映射為 error 類型）
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
	 * @param alert - 警報物件
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
					if (process.dev) {
						console.warn(`[AlertMonitor] 無法顯示警報 ${alert.id}，已達上限且無法替換`);
					}
					return;
				}
			} else {
				// 非 critical 警報，如果已達上限則跳過顯示
				if (process.dev) {
					console.log(
						`[AlertMonitor] 跳過顯示警報 ${alert.id}，已達上限 (${currentToastCount}/${MAX_ALERT_TOASTS})`
					);
				}
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
	 * 載入未解決警報數量
	 */
	const loadUnresolvedAlertCount = async (filters?: { source?: AlertSource }) => {
		if (isLoadingCount.value) return;

		isLoadingCount.value = true;
		try {
			const result = await alertApi.getUnresolvedAlertCount(filters);
			unresolvedAlertCount.value = result.count || 0;
		} catch (error) {
			unresolvedAlertCount.value = 0;
			if (process.dev) {
				console.warn("[AlertMonitor] 載入未解決警報數量失敗", error);
			}
		} finally {
			isLoadingCount.value = false;
		}
	};

	/**
	 * 處理警報數量變化事件（WebSocket）
	 */
	const handleAlertCountEvent = (data: AlertCountEvent) => {
		unresolvedAlertCount.value = data.count || 0;
		if (process.dev) {
			console.log("[AlertMonitor] 未解決警報數量變化:", data.count);
		}
	};

	/**
	 * 停止未解決警報數量的輪詢
	 */
	const stopCountPolling = () => {
		if (countPollingTimer) {
			clearInterval(countPollingTimer);
			countPollingTimer = null;
		}
	};

	/**
	 * 啟動未解決警報數量的輪詢（作為後備方案）
	 */
	const startCountPolling = () => {
		stopCountPolling();
		countPollingTimer = setInterval(() => {
			void loadUnresolvedAlertCount();
		}, 30000); // 30 秒
	};

	/**
	 * 開始監聽未解決警報數量（自動切換 WebSocket 和輪詢）
	 */
	const startAlertCountMonitoring = () => {
		// 清理現有的監聽器
		stopAlertCountMonitoring();

		// 設置 WebSocket 事件處理函數
		handleAlertCount = handleAlertCountEvent;

		// 監聽 WebSocket 連接狀態
		countWebsocketWatcher = watch(
			isConnected,
			connected => {
				if (connected) {
					// WebSocket 連接成功，使用即時更新
					if (handleAlertCount) {
						on("alert:count", handleAlertCount);
					}
					stopCountPolling();
				} else {
					// WebSocket 斷線，使用輪詢作為後備
					if (handleAlertCount) {
						off("alert:count", handleAlertCount);
					}
					startCountPolling();
				}
			},
			{ immediate: true }
		);
	};

	/**
	 * 停止監聽未解決警報數量（清理所有監聽器和計時器）
	 */
	const stopAlertCountMonitoring = () => {
		// 清理 WebSocket 狀態監聽器
		if (countWebsocketWatcher) {
			countWebsocketWatcher();
			countWebsocketWatcher = null;
		}

		// 移除 WebSocket 事件監聽器
		if (handleAlertCount) {
			off("alert:count", handleAlertCount);
			handleAlertCount = null;
		}

		// 停止輪詢
		stopCountPolling();
	};

	/**
	 * 設置 WebSocket 事件監聽器
	 */
	const setupWebSocketListeners = () => {
		if (websocketListenersSetup || !process.client) {
			return;
		}

		// 監聽新警報
		on("alert:new", handleAlertNew);

		// 監聽警報更新
		on("alert:updated", handleAlertUpdated);

		// 注意：alert:count 事件由 startAlertCountMonitoring 單獨處理

		websocketListenersSetup = true;

		if (process.dev) {
			console.log("[AlertMonitor] WebSocket 事件監聽器已設置");
		}
	};

	/**
	 * 移除 WebSocket 事件監聽器
	 */
	const removeWebSocketListeners = () => {
		if (!websocketListenersSetup) {
			return;
		}

		off("alert:new", handleAlertNew);
		off("alert:updated", handleAlertUpdated);
		// 注意：alert:count 事件由 stopAlertCountMonitoring 處理

		websocketListenersSetup = false;

		if (process.dev) {
			console.log("[AlertMonitor] WebSocket 事件監聽器已移除");
		}
	};

	/**
	 * 啟動輪詢（作為後備方案）
	 */
	const startPolling = () => {
		// 防止多實例運行
		if (pollingTimer) {
			return;
		}

		// 只在頁面可見時輪詢
		const poll = () => {
			if (document.visibilityState === "visible") {
				void checkNewAlerts();
			}
		};

		// 立即執行一次檢查
		poll();

		// 動態調整輪詢間隔
		const scheduleNext = () => {
			const interval = getPollingInterval();
			pollingTimer = setTimeout(() => {
				poll();
				scheduleNext(); // 遞迴調度下一次
			}, interval);
		};

		// 開始調度
		scheduleNext();

		// 監聽頁面可見性變化
		visibilityChangeHandler = poll;
		document.addEventListener("visibilitychange", visibilityChangeHandler);

		if (process.dev) {
			console.log("[AlertMonitor] 輪詢模式已啟動（後備方案）");
		}
	};

	/**
	 * 停止輪詢
	 */
	const stopPolling = () => {
		if (pollingTimer) {
			clearTimeout(pollingTimer);
			pollingTimer = null;
		}

		// 移除頁面可見性監聽器
		if (process.client && visibilityChangeHandler) {
			document.removeEventListener("visibilitychange", visibilityChangeHandler);
			visibilityChangeHandler = null;
		}

		if (process.dev) {
			console.log("[AlertMonitor] 輪詢模式已停止");
		}
	};

	/**
	 * 動態計算輪詢間隔
	 * 根據錯誤優先級和網路狀況調整
	 */
	const getPollingInterval = (): number => {
		// 離線時延長間隔
		if (typeof navigator !== "undefined" && !navigator.onLine) {
			return 60000; // 1 分鐘
		}

		// 高優先級錯誤時延長間隔（減少後端負擔）
		if (currentPriority.value >= ErrorPriority.HIGH) {
			return 60000; // 1 分鐘
		}

		// 正常情況
		return BASE_POLLING_INTERVAL; // 30 秒
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
		if (pollingTimer || websocketListenersSetup) {
			return;
		}

		// 1. 初始載入：使用 REST API 獲取當前警報列表
		void checkNewAlerts();

		// 2. 如果啟用 WebSocket 模式，嘗試建立連接
		if (useWebSocketMode.value) {
			// 建立 WebSocket 連接
			connect();

			// 清理現有的狀態監聽器（如果存在）
			if (websocketStatusWatcher) {
				websocketStatusWatcher();
				websocketStatusWatcher = null;
			}

			// 設置事件監聽器（連接成功後會自動設置）
			// 使用 watch 監聽連接狀態變化
			websocketStatusWatcher = watch(
				isConnected,
				connected => {
					if (connected) {
						// WebSocket 連接成功
						setupWebSocketListeners();
						stopPolling(); // 停止輪詢，使用 WebSocket
					} else {
						// WebSocket 斷線
						removeWebSocketListeners();
						// 如果沒有輪詢在運行，啟動輪詢作為後備
						if (!pollingTimer) {
							startPolling();
						}
					}
				},
				{ immediate: true }
			);
		} else {
			// 直接使用輪詢模式
			startPolling();
		}
	};

	/**
	 * 清除所有活躍的警報 Toast（共用函數）
	 */
	const clearAllToasts = () => {
		for (const toastId of activeAlertToasts.value.values()) {
			toast.removeToast(toastId);
		}
		activeAlertToasts.value.clear();
		alertSeverities.value.clear();
	};

	/**
	 * 停止監聽
	 */
	const stopMonitoring = () => {
		// 停止輪詢
		stopPolling();

		// 停止未解決警報數量監聽
		stopAlertCountMonitoring();

		// 清理 WebSocket 狀態監聽器
		if (websocketStatusWatcher) {
			websocketStatusWatcher();
			websocketStatusWatcher = null;
		}

		// 移除 WebSocket 監聽器
		removeWebSocketListeners();

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
		lastCheckTime.value = null;
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

	return {
		// 警報監聽功能
		startMonitoring,
		stopMonitoring,
		reset,
		checkNewAlerts,
		removeAlertToast,
		isChecking: readonly(isChecking),
		// WebSocket 狀態（用於調試或 UI 顯示）
		isWebSocketConnected: readonly(isConnected),
		useWebSocketMode: readonly(useWebSocketMode),
		// 未解決警報數量功能（整合自 useAlertCount）
		unresolvedAlertCount: readonly(unresolvedAlertCount),
		isLoadingCount: readonly(isLoadingCount),
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring
	};
};
