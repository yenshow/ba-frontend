import { io, Socket } from "socket.io-client";
import { onScopeDispose, watch, type Ref, type ComputedRef } from "vue";
import { useAuth } from "~/composables/core/useAuth";
import { logger } from "~/utils/logger";
import type { WebSocketStatus } from "~/types/websocket";
import {
	EVENT_COALESCE_MS,
	SOCKET_CLIENT_TIMEOUT_MS,
	SOCKET_RANDOMIZATION_FACTOR,
	SOCKET_RECONNECTION_DELAY_MAX_MS,
	SOCKET_RECONNECTION_DELAY_MS,
} from "~/utils/realtimeTiming";

export type WsRefetchBinding = {
	event: string;
	accept?: (payload?: unknown) => boolean;
	enabled?: Ref<boolean> | ComputedRef<boolean> | (() => boolean);
};

export type DebouncedRefetchOptions = {
	/** 模組級 gate（與 `useWsModuleGate` 搭配）；未通過時不註冊任何 binding */
	enabled?: Ref<boolean> | ComputedRef<boolean> | (() => boolean);
};

const wsLogger = logger.createLogger("WebSocket");

const WS_APP = "construction" as const;

/**
 * WebSocket Composable
 * 提供 WebSocket 連接管理和事件監聽功能
 *
 * 注意：使用單例模式，確保整個應用只有一個 WebSocket 連接實例
 */
let globalSocket: Socket | null = null;
let globalStatus = ref<WebSocketStatus>("disconnected");
let globalConnectionError = ref<string | null>(null);
const globalEventListeners = new Map<string, Set<Function>>();

const stripTrailingApi = (u: string) => u.replace(/\/api\/?$/, "");

const reattachTrackedListeners = () => {
	if (!globalSocket) return;
	for (const [event, callbacks] of globalEventListeners.entries()) {
		for (const callback of callbacks) {
			globalSocket.off(event, callback as (...args: unknown[]) => void);
			globalSocket.on(event, callback as (...args: unknown[]) => void);
		}
	}
};

const bindInternalSocketHandlers = () => {
	if (!globalSocket) return;

	globalSocket.on("permissions:updated", () => {
		// 後端僅 PUT overrides 後推送，JWT 不變；reconnect 讓伺服器依 DB 重算 perm rooms
		reconnectGlobalWebSocket();
		try {
			const { fetchUser } = useAuth();
			void fetchUser();
		} catch (_e) {
			/* ignore */
		}
	});

	globalSocket.on("connect", () => {
		globalStatus.value = "connected";
		globalConnectionError.value = null;
		wsLogger.debug("連接成功", { socketId: globalSocket?.id });

		try {
			globalSocket?.emit("client:hello", { app: WS_APP });
		} catch (_e) {
			/* ignore */
		}
	});

	globalSocket.on("connect_error", (error: Error) => {
		globalStatus.value = "error";
		globalConnectionError.value = error.message || "連接失敗";
		wsLogger.error("連接失敗", { error });
	});

	globalSocket.on("disconnect", (reason: string) => {
		globalStatus.value = "disconnected";
		wsLogger.debug("連接斷開", { reason });

		if (reason === "io client disconnect") {
			globalConnectionError.value = null;
		}
	});

	globalSocket.on("reconnect_attempt", (attemptNumber: number) => {
		wsLogger.debug(`重連嘗試 ${attemptNumber}...`);
	});

	globalSocket.on("reconnect", (attemptNumber: number) => {
		globalStatus.value = "connected";
		globalConnectionError.value = null;
		wsLogger.debug(`重連成功 (嘗試 ${attemptNumber} 次)`);
	});

	globalSocket.on("reconnect_failed", () => {
		globalStatus.value = "error";
		globalConnectionError.value = "重連失敗，請檢查網路連線";
		wsLogger.error("重連失敗");
	});
};

const destroyGlobalSocket = () => {
	if (!globalSocket) return;
	globalSocket.removeAllListeners();
	globalSocket.disconnect();
	globalSocket = null;
};

const establishGlobalConnection = (options?: { force?: boolean }) => {
	if (!process.client) return;

	if (options?.force) {
		destroyGlobalSocket();
		globalStatus.value = "disconnected";
		globalConnectionError.value = null;
	} else if (globalSocket?.connected || globalStatus.value === "connecting") {
		wsLogger.debug("連接已存在，跳過重複連接");
		return;
	} else if (globalSocket && !globalSocket.connected) {
		destroyGlobalSocket();
	}

	globalStatus.value = "connecting";
	globalConnectionError.value = null;

	try {
		const config = useRuntimeConfig();
		const authToken = useState<string | null>("auth_token");

		const explicit = String(config.public.websocketUrl || "").trim();
		let url = explicit;
		if (!url) {
			const apiBase = String(config.public.apiBase || "/api");
			if (apiBase.startsWith("http")) {
				try {
					url = new URL(stripTrailingApi(apiBase)).origin;
				} catch {
					url = stripTrailingApi(apiBase);
				}
			} else {
				const port = Number(config.public.backendHttpPort) || 4000;
				url = `${window.location.protocol}//${window.location.hostname}:${port}`;
			}
		}

		if (!url) {
			globalStatus.value = "error";
			globalConnectionError.value = "無法解析 WebSocket 位址";
			wsLogger.error("無法解析 WebSocket 位址（SSR 或未設定）");
			return;
		}

		globalSocket = io(url, {
			transports: ["websocket"],
			auth: {
				token: authToken.value || undefined,
			},
			reconnection: true,
			reconnectionDelay: SOCKET_RECONNECTION_DELAY_MS,
			reconnectionDelayMax: SOCKET_RECONNECTION_DELAY_MAX_MS,
			reconnectionAttempts: Infinity,
			randomizationFactor: SOCKET_RANDOMIZATION_FACTOR,
			timeout: SOCKET_CLIENT_TIMEOUT_MS,
			withCredentials: true,
		});

		bindInternalSocketHandlers();
		reattachTrackedListeners();
	} catch (error: unknown) {
		globalStatus.value = "error";
		globalConnectionError.value =
			error instanceof Error ? error.message : "建立連接時發生錯誤";
		wsLogger.error("建立連接失敗", { error });
	}
};

/** 供登出等情境中斷 WS，避免與 useAuth 循環引用 */
export const disconnectGlobalWebSocket = () => {
	destroyGlobalSocket();
	globalStatus.value = "disconnected";
	globalConnectionError.value = null;
	globalEventListeners.clear();
};

/** token / 權限變更時以最新 auth 重建連線（保留已註冊的事件 listener） */
export const reconnectGlobalWebSocket = () => {
	if (!process.client) return;
	if (!useState<string | null>("auth_token").value) return;
	establishGlobalConnection({ force: true });
};

export const useWebSocket = () => {
	const config = useRuntimeConfig();

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

	const on = (event: string, callback: Function) => {
		if (!globalEventListeners.has(event)) {
			globalEventListeners.set(event, new Set());
		}
		globalEventListeners.get(event)?.add(callback);

		if (globalSocket) {
			globalSocket.on(event, callback as (...args: unknown[]) => void);
		}
	};

	const off = (event: string, callback?: Function) => {
		if (callback) {
			globalSocket?.off(event, callback as (...args: unknown[]) => void);
			globalEventListeners.get(event)?.delete(callback);
		} else {
			globalSocket?.off(event);
			globalEventListeners.delete(event);
		}
	};

	const cleanup = () => {
		if (globalSocket) {
			for (const [event, callbacks] of globalEventListeners.entries()) {
				for (const callback of callbacks) {
					globalSocket.off(event, callback as (...args: unknown[]) => void);
				}
			}
			globalEventListeners.clear();
		}
	};

	return {
		status: readonly(globalStatus),
		isConnected: computed(() => globalStatus.value === "connected"),
		isConnecting: computed(() => globalStatus.value === "connecting"),
		connectionError: readonly(globalConnectionError),
		websocketUrl: readonly(websocketUrl),

		connect: () => establishGlobalConnection(),
		disconnect: () => disconnectGlobalWebSocket(),
		reconnect: () => reconnectGlobalWebSocket(),

		on,
		off,
		cleanup,
	};
};

/**
 * 連線建立後才註冊事件；斷線時移除。on() 亦支援 socket 建立前預先註冊。
 */
export type WebSocketEventSubscriptionOptions = {
	enabled?: Ref<boolean> | ComputedRef<boolean> | (() => boolean);
};

export const useWebSocketEventSubscription = (
	event: string,
	handler: (...args: unknown[]) => void,
	options: WebSocketEventSubscriptionOptions = {},
) => {
	const { isConnected, on, off } = useWebSocket();

	const isEnabled = () => {
		const gate = options.enabled;
		if (!gate) return true;
		return typeof gate === "function" ? gate() : gate.value;
	};

	const syncSubscription = () => {
		off(event, handler);
		if (isConnected.value && isEnabled()) {
			on(event, handler);
		}
	};

	watch(
		() => [isConnected.value, isEnabled()] as const,
		syncSubscription,
		{ immediate: true },
	);
	onScopeDispose(() => off(event, handler));
};

/**
 * 訂閱 WebSocket 事件並防抖重拉（人流／車輛等模組共用）
 */
export const setupDebouncedRefetchListeners = (
	onRefetch: (payload?: unknown) => void | Promise<void>,
	bindings: WsRefetchBinding[],
	debounceMs = EVENT_COALESCE_MS,
	logLabel = "WebSocket",
	options: DebouncedRefetchOptions = {},
) => {
	const log = logger.createLogger(logLabel);
	const { isConnected, on, off } = useWebSocket();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingPayload: unknown;
	let pendingRefetch = false;
	const isLoading = ref(false);

	const resolveEnabled = (enabled?: WsRefetchBinding["enabled"]) => {
		if (!enabled) return true;
		return typeof enabled === "function" ? enabled() : enabled.value;
	};

	const runRefetch = async () => {
		if (isLoading.value) {
			pendingRefetch = true;
			return;
		}

		const eventPayload = pendingPayload;
		pendingPayload = undefined;
		log.debug("觸發資料重新載入（防抖後）");
		isLoading.value = true;

		try {
			await Promise.resolve(onRefetch(eventPayload));
		} finally {
			isLoading.value = false;
			if (pendingRefetch) {
				pendingRefetch = false;
				void runRefetch();
			}
		}
	};

	const triggerRefetch = (payload?: unknown) => {
		if (payload !== undefined) pendingPayload = payload;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			void runRefetch();
		}, debounceMs);
	};

	const wrappedHandlers = bindings.map((b) => ({
		event: b.event,
		enabled: b.enabled,
		fn: (payload?: unknown) => {
			if (b.accept && !b.accept(payload)) return;
			triggerRefetch(payload);
		},
	}));

	const isEnabled = (enabled?: WsRefetchBinding["enabled"]) => resolveEnabled(enabled);

	const syncListeners = () => {
		for (const { event, fn } of wrappedHandlers) {
			off(event, fn);
		}
		if (!isConnected.value || !resolveEnabled(options.enabled)) {
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

	const watchSources = [
		isConnected,
		...(options.enabled ? [options.enabled] : []),
		...bindings.flatMap((b) => (b.enabled ? [b.enabled] : [])),
	];
	watch(watchSources, syncListeners, { immediate: true });

	return () => {
		for (const { event, fn } of wrappedHandlers) {
			off(event, fn);
		}
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
		pendingRefetch = false;
	};
};
