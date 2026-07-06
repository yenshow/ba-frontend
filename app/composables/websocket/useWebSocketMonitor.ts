import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { logger } from "~/utils/logger";
import type { ComputedRef, Ref, WatchStopHandle } from "vue";

const wsMonitorLogger = logger.createLogger("WebSocketMonitor");

/**
 * WebSocket 事件監聽器配置
 */
export interface WebSocketListenerConfig<T = any> {
	event: string;
	handler: (data: T) => void;
	logMessage?: (data: T) => string;
}

export interface WebSocketMonitorOptions {
	enabled?: Ref<boolean> | ComputedRef<boolean> | (() => boolean);
}

/**
 * 統一的 WebSocket 監聽器管理 composable
 * 提供統一的監聽器設置、移除、清理等功能
 */
export const useWebSocketMonitor = () => {
	const { isConnected, on, off } = useWebSocket();

	const listeners = new Map<string, Function>();
	const isSetup = ref(false);
	let pendingConfigs: WebSocketListenerConfig<any>[] | null = null;
	let pendingEnabled: (() => boolean) | null = null;
	let stopConnectionWatch: WatchStopHandle | null = null;

	const resolveEnabled = () => !pendingEnabled || pendingEnabled();

	const unregisterAll = () => {
		for (const [event, handler] of listeners.entries()) {
			off(event, handler);
		}
		listeners.clear();
		isSetup.value = false;
	};

	const registerConfigs = (configs: WebSocketListenerConfig<any>[]) => {
		if (!process.client || !isConnected.value || !resolveEnabled()) return;

		configs.forEach(({ event, handler, logMessage }) => {
			const wrappedHandler = (data: any) => {
				if (logMessage) {
					wsMonitorLogger.debug(logMessage(data));
				}
				handler(data);
			};

			on(event, wrappedHandler);
			listeners.set(event, wrappedHandler);
		});

		isSetup.value = true;
		wsMonitorLogger.debug(`已設置 ${configs.length} 個事件監聽器`);
	};

	const syncListeners = () => {
		unregisterAll();
		if (pendingConfigs && isConnected.value && resolveEnabled()) {
			registerConfigs(pendingConfigs);
		}
	};

	/**
	 * 設置 WebSocket 事件監聽器
	 * @param configs - 監聽器配置陣列（支援不同類型的事件）
	 */
	const setupListeners = (
		configs: WebSocketListenerConfig<any>[],
		options?: WebSocketMonitorOptions,
	) => {
		if (!process.client) return;

		pendingConfigs = configs;
		const gate = options?.enabled;
		pendingEnabled = gate
			? () => (typeof gate === "function" ? gate() : gate.value)
			: null;

		if (stopConnectionWatch) {
			syncListeners();
			return;
		}

		const enabledSources = gate ? [gate] : [];
		stopConnectionWatch = watch([isConnected, ...enabledSources], syncListeners, {
			immediate: true,
		});
	};

	/**
	 * 移除 WebSocket 事件監聽器
	 * @param events - 要移除的事件名稱陣列（如果未提供，移除所有監聽器）
	 */
	const removeListeners = (events?: string[]) => {
		if (events) {
			events.forEach((event) => {
				const handler = listeners.get(event);
				if (handler) {
					off(event, handler);
					listeners.delete(event);
				}
			});
			if (listeners.size === 0) {
				isSetup.value = false;
			}
			wsMonitorLogger.debug(`已移除 ${events.length} 個事件監聽器`);
			return;
		}

		unregisterAll();
		pendingConfigs = null;
		pendingEnabled = null;

		if (stopConnectionWatch) {
			stopConnectionWatch();
			stopConnectionWatch = null;
		}

		wsMonitorLogger.debug("已移除所有事件監聽器");
	};

	/**
	 * 清理所有監聽器（組件卸載時調用）
	 */
	const cleanup = () => {
		removeListeners();
	};

	onUnmounted(() => {
		cleanup();
	});

	return {
		setupListeners,
		removeListeners,
		cleanup,
		isSetup: readonly(isSetup),
		isConnected: readonly(isConnected),
	};
};
