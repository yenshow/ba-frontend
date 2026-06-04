import { io, Socket } from "socket.io-client";
import { watch, type Ref } from "vue";
import { useAuth } from "~/composables/core/useAuth";
import { logger } from "~/utils/logger";
import type { WebSocketStatus } from "~/types/websocket";

export type WsRefetchBinding = {
	event: string;
	accept?: (payload?: unknown) => boolean;
	enabled?: Ref<boolean> | (() => boolean);
};

const wsLogger = logger.createLogger("WebSocket");

/**
 * WebSocket Composable
 * 提供 WebSocket 連接管理和事件監聽功能
 * 參考後端設計：ba-backend/docs/WEBSOCKET_STRATEGY_AND_IMPLEMENTATION.md
 *
 * 注意：使用單例模式，確保整個應用只有一個 WebSocket 連接實例
 */
// 全局單例實例（在客戶端共享）
let globalSocket: Socket | null = null;
let globalStatus = ref<WebSocketStatus>("disconnected");
let globalConnectionError = ref<string | null>(null);
const globalEventListeners = new Map<string, Set<Function>>();

const stripTrailingApi = (u: string) => u.replace(/\/api\/?$/, "");

export const useWebSocket = () => {
	const config = useRuntimeConfig();
	const tokenCookie = useCookie<string | null>("auth_token");

	/** 相對 /api 時不可連頁面 origin（Nuxt 無 Socket.IO）；需直連後端或設 NUXT_PUBLIC_WEBSOCKET_URL */
	const resolveWebsocketConnectUrl = (): string => {
		const explicit = String(config.public.websocketUrl || "").trim();
		if (explicit) {
			return explicit;
		}

		const apiBase = String(config.public.apiBase || "/api");
		if (apiBase.startsWith("http")) {
			try {
				return new URL(stripTrailingApi(apiBase)).origin;
			} catch {
				return stripTrailingApi(apiBase);
			}
		}

		if (process.client) {
			const port = Number(config.public.backendHttpPort) || 4000;
			return `${window.location.protocol}//${window.location.hostname}:${port}`;
		}

		return "";
	};

	const websocketUrl = computed(() => resolveWebsocketConnectUrl());

	// 使用全局狀態（單例模式）
	const status = globalStatus;
	const isConnected = computed(() => status.value === "connected");
	const isConnecting = computed(() => status.value === "connecting");
	const connectionError = globalConnectionError;

	// 使用全局事件監聽器映射（單例模式）
	const eventListeners = globalEventListeners;

	/**
	 * 建立 WebSocket 連接
	 */
	const connect = () => {
		// 只在客戶端執行
		if (!process.client) {
			return;
		}

		// 如果已經連接或正在連接，不重複連接（單例模式檢查）
		if (globalSocket?.connected || status.value === "connecting") {
			wsLogger.log("連接已存在，跳過重複連接");
			return;
		}

		// 如果已有實例但未連接，先斷開
		if (globalSocket && !globalSocket.connected) {
			globalSocket.disconnect();
			globalSocket = null;
		}

		status.value = "connecting";
		connectionError.value = null;

		try {
			const url = resolveWebsocketConnectUrl();
			if (!url) {
				status.value = "error";
				connectionError.value = "無法解析 WebSocket 位址";
				wsLogger.error("無法解析 WebSocket 位址（SSR 或未設定）");
				return;
			}
			// 創建新的 Socket 實例並保存到全局變數（單例模式）
			globalSocket = io(url, {
				transports: ["websocket"],
				auth: {
					// 後端用於 WS 連線後的 permission rooms join（不依賴 license）
					token: tokenCookie.value || undefined
				},
				reconnection: true,
				reconnectionDelay: 1000, // 初始延遲 1 秒
				reconnectionDelayMax: 5000, // 最大延遲 5 秒
				reconnectionAttempts: Infinity, // 無限重試
				randomizationFactor: 0.5, // 隨機化因子
				timeout: 20000, // 連接超時 20 秒
				withCredentials: true // 支援認證
			});

			// 連接成功
			globalSocket.on("permissions:updated", async () => {
				try {
					const { fetchUser } = useAuth();
					await fetchUser();
				} catch (_e) {
					/* ignore */
				}
			});

			globalSocket.on("connect", () => {
				status.value = "connected";
				connectionError.value = null;
				wsLogger.log("連接成功", { socketId: globalSocket?.id });

				// WS rooms：識別 app（後端會將 client 從 app:legacy 移到 app:construction）
				// 向下相容：後端若未實作此事件，也不影響既有功能
				try {
					globalSocket?.emit("client:hello", { app: "construction" });
				} catch (_e) {}
			});

			// 連接失敗
			globalSocket.on("connect_error", (error: Error) => {
				status.value = "error";
				connectionError.value = error.message || "連接失敗";
				wsLogger.error("連接失敗", { error });
			});

			// 斷開連接
			globalSocket.on("disconnect", (reason: string) => {
				status.value = "disconnected";
				wsLogger.log("連接斷開", { reason });

				// 如果是手動斷開，不顯示錯誤
				if (reason === "io client disconnect") {
					connectionError.value = null;
				}
			});

			// 重連嘗試
			globalSocket.on("reconnect_attempt", (attemptNumber: number) => {
				wsLogger.log(`重連嘗試 ${attemptNumber}...`);
			});

			// 重連成功
			globalSocket.on("reconnect", (attemptNumber: number) => {
				status.value = "connected";
				connectionError.value = null;
				wsLogger.log(`重連成功 (嘗試 ${attemptNumber} 次)`);
			});

			// 重連失敗
			globalSocket.on("reconnect_failed", () => {
				status.value = "error";
				connectionError.value = "重連失敗，請檢查網路連線";
				wsLogger.error("重連失敗");
			});
		} catch (error: any) {
			status.value = "error";
			connectionError.value = error?.message || "建立連接時發生錯誤";
			wsLogger.error("建立連接失敗", { error });
		}
	};

	/**
	 * 斷開 WebSocket 連接
	 */
	const disconnect = () => {
		if (globalSocket) {
			globalSocket.disconnect();
			globalSocket = null;
		}

		status.value = "disconnected";
		connectionError.value = null;
		eventListeners.clear();
	};

	/**
	 * 監聽 WebSocket 事件
	 * @param event - 事件名稱
	 * @param callback - 回調函數
	 */
	const on = (event: string, callback: Function) => {
		if (!globalSocket) {
			wsLogger.warn(`嘗試監聽事件 ${event}，但連接尚未建立`);
			return;
		}

		// 記錄監聽器（用於清理）
		if (!eventListeners.has(event)) {
			eventListeners.set(event, new Set());
		}
		eventListeners.get(event)?.add(callback);

		// 註冊事件監聽器
		globalSocket.on(event, callback as any);
	};

	/**
	 * 移除事件監聽器
	 * @param event - 事件名稱
	 * @param callback - 可選的回調函數（如果未提供，移除該事件的所有監聽器）
	 */
	const off = (event: string, callback?: Function) => {
		if (!globalSocket) {
			return;
		}

		if (callback) {
			// 移除特定監聽器
			globalSocket.off(event, callback as any);
			eventListeners.get(event)?.delete(callback);
		} else {
			// 移除該事件的所有監聽器
			globalSocket.off(event);
			eventListeners.delete(event);
		}
	};

	/**
	 * 清理所有事件監聽器
	 */
	const cleanup = () => {
		if (globalSocket) {
			// 移除所有監聽器
			for (const [event, callbacks] of eventListeners.entries()) {
				for (const callback of callbacks) {
					globalSocket.off(event, callback as any);
				}
			}
			eventListeners.clear();
		}
	};

	return {
		// 狀態
		status: readonly(status),
		isConnected: readonly(isConnected),
		isConnecting: readonly(isConnecting),
		connectionError: readonly(connectionError),
		websocketUrl: readonly(websocketUrl),

		// 連接管理
		connect,
		disconnect,

		// 事件監聽
		on,
		off,

		// 清理
		cleanup
	};
};

/**
 * 訂閱 WebSocket 事件並防抖重拉（人流／車輛等模組共用）
 */
export const setupDebouncedRefetchListeners = (
	onRefetch: () => void | Promise<void>,
	bindings: WsRefetchBinding[],
	debounceMs = 500,
	logLabel = "WebSocket"
) => {
	const log = logger.createLogger(logLabel);
	const { isConnected, on, off } = useWebSocket();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	const isLoading = ref(false);

	const triggerRefetch = () => {
		if (isLoading.value) return;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (process.dev) log.log("觸發資料重新載入（防抖後）");
			isLoading.value = true;
			Promise.resolve(onRefetch()).finally(() => {
				isLoading.value = false;
			});
		}, debounceMs);
	};

	const wrappedHandlers = bindings.map(b => ({
		event: b.event,
		enabled: b.enabled,
		fn: (payload?: unknown) => {
			if (b.accept && !b.accept(payload)) return;
			triggerRefetch();
		}
	}));

	const isEnabled = (enabled?: WsRefetchBinding["enabled"]) => {
		if (!enabled) return true;
		return typeof enabled === "function" ? enabled() : enabled.value;
	};

	const syncListeners = () => {
		for (const { event, fn } of wrappedHandlers) {
			off(event, fn);
		}
		if (!isConnected.value) {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
			return;
		}
		for (const { event, fn, enabled } of wrappedHandlers) {
			if (isEnabled(enabled)) on(event, fn);
		}
	};

	watch(
		[isConnected, ...bindings.flatMap(b => (b.enabled ? [b.enabled] : []))],
		syncListeners,
		{ immediate: true }
	);

	return () => {
		for (const { event, fn } of wrappedHandlers) {
			off(event, fn);
		}
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
	};
};
