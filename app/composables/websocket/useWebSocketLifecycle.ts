import { watch } from "vue";
import { useAuth } from "~/composables/core/useAuth";
import { useWebSocket } from "~/composables/websocket/useWebSocket";

/**
 * WebSocket 連線生命週期：登入 connect、登出 disconnect、token 變更 reconnect。
 * 與警報模組解耦，全站模組可共用同一 WS 單例。
 */
export const useWebSocketLifecycle = () => {
	const { connect, disconnect, reconnect } = useWebSocket();
	const { user, token } = useAuth();

	let stopUserWatch: (() => void) | null = null;
	let stopTokenWatch: (() => void) | null = null;

	const start = () => {
		if (!process.client) return;
		stop();

		stopUserWatch = watch(
			() => user.value,
			(nextUser) => {
				if (nextUser) connect();
				else disconnect();
			},
			{ immediate: true },
		);

		stopTokenWatch = watch(token, (next, prev) => {
			if (next && prev && next !== prev && user.value) {
				reconnect();
			}
		});
	};

	const stop = () => {
		if (stopUserWatch) {
			stopUserWatch();
			stopUserWatch = null;
		}
		if (stopTokenWatch) {
			stopTokenWatch();
			stopTokenWatch = null;
		}
	};

	return { start, stop };
};
