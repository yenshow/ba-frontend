/**
 * 警報輪詢邏輯 Composable
 * 負責警報的輪詢檢查和增量查詢
 */

import type { Alert, AlertFilters } from "~/types/alert";
import { logger } from "~/utils/logger";
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
const pollingLogger = logger.createLogger("AlertPolling");

/**
 * 警報輪詢邏輯
 */
export const useAlertPolling = () => {
	const alertApi = useAlertApi();
	const { currentSeverity, handleError } = useErrorHandler();

	// 上次檢查時間（用於增量查詢）
	const lastCheckTime = ref<Date | null>(null);

	// 基礎輪詢間隔（毫秒）
	const BASE_POLLING_INTERVAL = 30000; // 30 秒

	// 是否正在檢查
	const isChecking = ref(false);

	// 輪詢計時器
	let pollingTimer: ReturnType<typeof setTimeout> | null = null;

	// 頁面可見性變化監聽器（用於清理）
	let visibilityChangeHandler: (() => void) | null = null;

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
		if (currentSeverity.value === "error" || currentSeverity.value === "critical") {
			return 60000; // 1 分鐘
		}

		// 正常情況
		return BASE_POLLING_INTERVAL; // 30 秒
	};

	/**
	 * 檢查新的警示
	 * @param shouldProcessAlert - 優先級過濾函數
	 * @param onAlertFound - 當發現警報時的回調函數
	 * @param onStillActiveIds - 本輪 API 仍為 active 的警報 id 集合（供對照並移除本地已結案 Toast）
	 */
	const checkNewAlerts = async (
		shouldProcessAlert: (alert: Alert) => boolean,
		onAlertFound: (alert: Alert) => void,
		onStillActiveIds: (activeIds: Set<number>) => void
	) => {
		if (isChecking.value) {
			return;
		}

		isChecking.value = true;

		try {
			const filters: AlertFilters = {
				status: "active",
				limit: 50,
				offset: 0,
				orderBy: "updated_at",
				order: "desc"
			};

			if (lastCheckTime.value) {
				filters.updated_after = lastCheckTime.value.toISOString();
			}

			const result = await alertApi.getAlerts(filters);

			// 追蹤當前活躍的警報 ID
			const currentActiveAlertIds = new Set<number>();

			// 處理所有未解決的警報
			for (const alert of result.alerts) {
				// 優先級過濾
				if (!shouldProcessAlert(alert)) {
					continue;
				}

				currentActiveAlertIds.add(alert.id);
				onAlertFound(alert);
			}

			onStillActiveIds(currentActiveAlertIds);

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
	 * 啟動輪詢（作為後備方案）
	 * @param checkCallback - 檢查回調函數
	 */
	const startPolling = (checkCallback: () => void) => {
		// 防止多實例運行
		if (pollingTimer) {
			return;
		}

		// 只在頁面可見時輪詢
		const poll = () => {
			if (document.visibilityState === "visible") {
				checkCallback();
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

		pollingLogger.log("輪詢模式已啟動（後備方案）");
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

		pollingLogger.log("輪詢模式已停止");
	};

	/**
	 * 重置輪詢狀態
	 */
	const reset = () => {
		lastCheckTime.value = null;
	};

	return {
		// 狀態
		isChecking: readonly(isChecking),
		lastCheckTime: readonly(lastCheckTime),

		// 方法
		checkNewAlerts,
		startPolling,
		stopPolling,
		getPollingInterval,
		reset
	};
};

