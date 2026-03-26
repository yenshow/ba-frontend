/**
 * 未解決警報數量管理 Composable
 * 負責未解決警報數量的監聽和管理（WebSocket + 輪詢後備）
 */

import type { AlertSource } from "~/types/alert";
import type { AlertCountEvent } from "~/types/websocket";
import { logger } from "~/utils/logger";
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { getTodayDateRangeUTC } from "~/utils/dateUtils";
import { watch } from "vue";

const countLogger = logger.createLogger("UnresolvedAlertCount");

/**
 * 未解決警報數量管理
 */
export const useUnresolvedAlertCount = () => {
	const alertApi = useAlertApi();
	const { isConnected, on, off } = useWebSocket();

	// 未解決警報數量
	const unresolvedAlertCount = ref(0);
	const isLoadingCount = ref(false);

	// 未解決警報數量的 WebSocket 事件處理函數
	let handleAlertCount: ((data: AlertCountEvent) => void) | null = null;

	// 未解決警報數量的輪詢計時器
	let countPollingTimer: ReturnType<typeof setInterval> | null = null;

	// 未解決警報數量的 WebSocket 連接狀態監聽器
	let countWebsocketWatcher: ReturnType<typeof watch> | null = null;

	/**
	 * 載入未解決警報數量
	 * 只計算今日創建的警報（與後端按天分組邏輯一致）
	 */
	const loadUnresolvedAlertCount = async (filters?: { source?: AlertSource }) => {
		if (isLoadingCount.value) return;

		isLoadingCount.value = true;
		try {
			// 只計算今日創建的警報
			const { start: todayStart, end: todayEnd } = getTodayDateRangeUTC();
			const result = await alertApi.getUnresolvedAlertCount({
				...filters,
				start_date: todayStart.toISOString(),
				end_date: todayEnd.toISOString()
			});
			unresolvedAlertCount.value = result.count || 0;
		} catch (error) {
			unresolvedAlertCount.value = 0;
			countLogger.warn("載入未解決警報數量失敗", { error });
		} finally {
			isLoadingCount.value = false;
		}
	};

	/**
	 * 處理警報數量變化事件（WebSocket）
	 * 後端推送的數量可能包含所有未解決警報，前端需要重新計算今日的數量
	 */
	const handleAlertCountEvent = async (data: AlertCountEvent) => {
		// 後端推送的數量可能包含非今日的警報，需要重新載入今日的數量以確保準確性
		await loadUnresolvedAlertCount();
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

	return {
		// 狀態
		unresolvedAlertCount: readonly(unresolvedAlertCount),
		isLoadingCount: readonly(isLoadingCount),

		// 方法
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring
	};
};

