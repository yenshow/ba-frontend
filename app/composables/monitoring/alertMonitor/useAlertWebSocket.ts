/**
 * 警報 WebSocket 監聽 Composable
 * 負責 WebSocket 事件監聽和處理
 */

import { logger } from "~/utils/logger";
import type { AlertNewEvent, AlertUpdatedEvent } from "~/types/websocket"
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useWebSocketMonitor } from "~/composables/websocket/useWebSocketMonitor";
import { watch } from "vue";

const websocketLogger = logger.createLogger("AlertWebSocket");

/**
 * 警報 WebSocket 監聽
 */
export const useAlertWebSocket = () => {
	const { isConnected } = useWebSocket();
	const { setupListeners, removeListeners } = useWebSocketMonitor();

	// 是否已設置 WebSocket 監聽器
	const websocketListenersSetup = ref(false);

	// WebSocket 連接狀態監聽器（用於清理）
	let websocketStatusWatcher: ReturnType<typeof watch> | null = null;

	// 事件處理函數引用（用於清理）
	let handleAlertNewRef: ((alert: AlertNewEvent) => void) | null = null;
	let handleAlertUpdatedRef: ((data: AlertUpdatedEvent) => void) | null = null;

	/**
	 * 設置 WebSocket 事件監聽器
	 * @param handleAlertNew - 新警報事件處理函數
	 * @param handleAlertUpdated - 警報更新事件處理函數
	 */
	const setupWebSocketListeners = (
		handleAlertNew: (alert: AlertNewEvent) => void,
		handleAlertUpdated: (data: AlertUpdatedEvent) => void
	) => {
		if (websocketListenersSetup.value || !process.client) {
			return;
		}

		// 保存引用（僅保留給外部狀態判斷/除錯；實際註冊交給 useWebSocketMonitor）
		handleAlertNewRef = handleAlertNew;
		handleAlertUpdatedRef = handleAlertUpdated;

		setupListeners([
			{
				event: "alert:new",
				handler: (e: AlertNewEvent) => handleAlertNew(e),
			},
			{
				event: "alert:updated",
				handler: (e: AlertUpdatedEvent) => handleAlertUpdated(e),
			},
		]);

		websocketListenersSetup.value = true;
		websocketLogger.log("WebSocket 事件監聽器已設置");
	};

	/**
	 * 移除 WebSocket 事件監聽器
	 */
	const removeWebSocketListeners = () => {
		if (!websocketListenersSetup.value) {
			return;
		}

		removeListeners(["alert:new", "alert:updated"]);
		handleAlertNewRef = null;
		handleAlertUpdatedRef = null;

		websocketListenersSetup.value = false;
		websocketLogger.log("WebSocket 事件監聽器已移除");
	};

	/**
	 * 設置 WebSocket 連接狀態監聽器
	 * @param onConnected - 連接成功時的回調
	 * @param onDisconnected - 斷線時的回調
	 */
	const setupConnectionWatcher = (
		onConnected: () => void,
		onDisconnected: () => void
	) => {
		// 清理現有的狀態監聽器（如果存在）
		if (websocketStatusWatcher) {
			websocketStatusWatcher();
			websocketStatusWatcher = null;
		}

		// 使用 watch 監聽連接狀態變化
		websocketStatusWatcher = watch(
			isConnected,
			connected => {
				if (connected) {
					onConnected();
				} else {
					onDisconnected();
				}
			},
			{ immediate: true }
		);
	};

	/**
	 * 清理 WebSocket 連接狀態監聽器
	 */
	const cleanupConnectionWatcher = () => {
		if (websocketStatusWatcher) {
			websocketStatusWatcher();
			websocketStatusWatcher = null;
		}
	};

	return {
		// 狀態
		isConnected: readonly(isConnected),
		websocketListenersSetup: readonly(websocketListenersSetup),

		// 方法
		setupWebSocketListeners,
		removeWebSocketListeners,
		setupConnectionWatcher,
		cleanupConnectionWatcher
	};
};

