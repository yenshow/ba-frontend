import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { logger } from "~/utils/logger";

const wsMonitorLogger = logger.createLogger("WebSocketMonitor");

/**
 * WebSocket 事件監聽器配置
 */
export interface WebSocketListenerConfig<T = any> {
	event: string;
	handler: (data: T) => void;
	logMessage?: (data: T) => string;
}

/**
 * 統一的 WebSocket 監聽器管理 composable
 * 提供統一的監聽器設置、移除、清理等功能
 */
export const useWebSocketMonitor = () => {
	const { isConnected, on, off } = useWebSocket();

	// 已設置的監聽器映射（event -> handler）
	const listeners = new Map<string, Function>();

	// 是否已設置監聽器
	const isSetup = ref(false);

	/**
	 * 設置 WebSocket 事件監聽器
	 * @param configs - 監聽器配置陣列（支援不同類型的事件）
	 */
	const setupListeners = (configs: WebSocketListenerConfig<any>[]) => {
		if (isSetup.value || !process.client) {
			return;
		}

		configs.forEach(({ event, handler, logMessage }) => {
			// 創建包裝的處理函數（帶日誌）
			const wrappedHandler = (data: any) => {
				if (logMessage) {
					wsMonitorLogger.log(logMessage(data));
				}
				handler(data);
			};

			// 註冊監聽器
			on(event, wrappedHandler);
			listeners.set(event, wrappedHandler);
		});

		isSetup.value = true;
		wsMonitorLogger.log(`已設置 ${configs.length} 個事件監聽器`);
	};

	/**
	 * 移除 WebSocket 事件監聽器
	 * @param events - 要移除的事件名稱陣列（如果未提供，移除所有監聽器）
	 */
	const removeListeners = (events?: string[]) => {
		if (!isSetup.value) {
			return;
		}

		if (events) {
			// 移除指定事件
			events.forEach(event => {
				const handler = listeners.get(event);
				if (handler) {
					off(event, handler);
					listeners.delete(event);
				}
			});
			// 如果還有其他監聽器，保持 isSetup 為 true
			if (listeners.size === 0) {
				isSetup.value = false;
			}
		} else {
			// 移除所有監聽器
			for (const [event, handler] of listeners.entries()) {
				off(event, handler);
			}
			listeners.clear();
			isSetup.value = false;
		}

		wsMonitorLogger.log(`已移除 ${events ? events.length : "所有"} 個事件監聽器`);
	};

	/**
	 * 清理所有監聽器（組件卸載時調用）
	 */
	const cleanup = () => {
		removeListeners();
	};

	// 組件卸載時自動清理
	onUnmounted(() => {
		cleanup();
	});

	return {
		setupListeners,
		removeListeners,
		cleanup,
		isSetup: readonly(isSetup),
		isConnected: readonly(isConnected)
	};
};
