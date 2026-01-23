/**
 * 人流統計 WebSocket 事件處理 Composable
 * 負責監聽 YSCP 事件並觸發資料重新載入
 */

import type { YscpEventAlarm, YscpEventGeneric } from "~/composables/websocket/useWebSocket";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { logger } from "~/utils/logger";
import { ref } from "vue";

const wsLogger = logger.createLogger("PeopleCounting WebSocket");

/**
 * 人流統計 WebSocket 事件處理
 */
export const usePeopleCountingWebSocket = () => {
	const { isConnected, on, off } = useWebSocket();

	/**
	 * 設置 WebSocket 事件監聽器（帶防抖優化）
	 * @param onYscpEvent YSCP 事件回調函數（收到事件後重新載入資料）
	 * @param debounceMs 防抖延遲時間（毫秒），預設 500ms
	 */
	const setupEventListeners = (
		onYscpEvent: (event: YscpEventAlarm | YscpEventGeneric) => void,
		debounceMs: number = 500
	) => {
		// 防抖計時器
		let debounceTimer: ReturnType<typeof setTimeout> | null = null;
		// 追蹤是否正在載入
		const isLoading = ref(false);

		// 統一的 YSCP 事件處理函數（帶防抖）
		const handleYscpEvent = (data: YscpEventAlarm | YscpEventGeneric) => {
			// 如果正在載入，跳過本次事件（避免重複載入）
			if (isLoading.value) {
			if (process.dev) {
					wsLogger.log("資料載入中，跳過本次 YSCP 事件", { type: data.type });
				}
				return;
			}

			// 清除之前的計時器
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}

			// 設置新的防抖計時器
			debounceTimer = setTimeout(() => {
				if (process.dev) {
					wsLogger.log("觸發資料重新載入（防抖後）", { type: data.type });
				}
				isLoading.value = true;
				// 執行回調並等待完成
				Promise.resolve(onYscpEvent(data)).finally(() => {
					isLoading.value = false;
				});
			}, debounceMs);
		};

		// 監聽 WebSocket 連接狀態
		watch(
			isConnected,
			connected => {
				if (connected) {
					// 監聽 YSCP 事件（主要觸發機制）
					on("yscp:event:alarm", handleYscpEvent);
					on("yscp:event:generic", handleYscpEvent);
				} else {
					off("yscp:event:alarm", handleYscpEvent);
					off("yscp:event:generic", handleYscpEvent);
					// 清除防抖計時器
					if (debounceTimer) {
						clearTimeout(debounceTimer);
						debounceTimer = null;
					}
				}
			},
			{ immediate: true }
		);

		// 返回清理函數
		return () => {
			off("yscp:event:alarm", handleYscpEvent);
			off("yscp:event:generic", handleYscpEvent);
			// 清除防抖計時器
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
		};
	};

	return {
		setupEventListeners
	};
};

