import { useAlertApi } from "../composables/useAlertApi";
import { useToast } from "../composables/useToast";
import { useErrorHandler, ErrorPriority } from "../composables/useErrorHandler";
import type { Alert } from "../types/alert";
import { getSourceLabel } from "../utils/alertUtils";

/**
 * 警示監聽器
 * 用於監聽新的警示並顯示通知
 * 整合優先級判斷和動態輪詢間隔
 */
export const useAlertMonitor = () => {
	const alertApi = useAlertApi();
	const toast = useToast();
	const { currentPriority, handleError } = useErrorHandler();

	// 活躍的警報 Toast ID 映射（警報 ID -> Toast ID，用於持續顯示）
	const activeAlertToasts = ref<Map<number, string>>(new Map());

	// 上次檢查時間（用於增量查詢）
	const lastCheckTime = ref<Date | null>(null);

	// 基礎輪詢間隔（毫秒）
	const BASE_POLLING_INTERVAL = 30000; // 30 秒

	// 輪詢計時器
	let pollingTimer: ReturnType<typeof setTimeout> | null = null;

	// 頁面可見性變化監聽器（用於清理）
	let visibilityChangeHandler: (() => void) | null = null;

	// 是否正在檢查
	const isChecking = ref(false);

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
		return currentPriority.value <= alertPriority && 
		       !(currentPriority.value >= ErrorPriority.HIGH && alertPriority <= ErrorPriority.MEDIUM);
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
			const filters: any = {
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

				// 如果這個警報還沒有顯示 Toast，顯示它
				if (!activeAlertToasts.value.has(alert.id)) {
					showAlertNotification(alert, true);
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
	 * 顯示警示通知
	 * @param alert - 警報物件
	 * @param persistent - 是否持久顯示（直到用戶處理）
	 */
	const showAlertNotification = (alert: Alert, persistent = false) => {
		// 根據嚴重程度選擇 Toast 類型
		const toastType: "warning" | "error" = alert.severity === "warning" ? "warning" : "error";
		// 持久顯示時 duration 為 0，非持久顯示時根據嚴重程度設置
		const duration = persistent ? 0 : (alert.severity === "critical" ? 10000 : 5000);

		// 構建通知訊息
		const sourceLabel = getSourceLabel(alert.source);
		const message = `${sourceLabel}: ${alert.message}`;

		// 顯示 Toast
		const toastId = toast.showToast(toastType, message, duration, { persistent });

		// 如果是持久顯示，記錄 Toast ID
		if (persistent && toastId) {
			activeAlertToasts.value.set(alert.id, toastId);
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
	 */
	const startMonitoring = () => {
		// 只在客戶端執行
		if (!process.client) {
			return;
		}

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
	};

	/**
	 * 清除所有活躍的警報 Toast（共用函數）
	 */
	const clearAllToasts = () => {
		for (const toastId of activeAlertToasts.value.values()) {
			toast.removeToast(toastId);
		}
		activeAlertToasts.value.clear();
	};

	/**
	 * 停止監聽
	 */
	const stopMonitoring = () => {
		if (pollingTimer) {
			clearTimeout(pollingTimer);
			pollingTimer = null;
		}

		// 移除頁面可見性監聽器
		if (process.client && visibilityChangeHandler) {
			document.removeEventListener("visibilitychange", visibilityChangeHandler);
			visibilityChangeHandler = null;
		}

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
		}
	};

	return {
		startMonitoring,
		stopMonitoring,
		reset,
		checkNewAlerts,
		removeAlertToast,
		isChecking: readonly(isChecking)
	};
};
