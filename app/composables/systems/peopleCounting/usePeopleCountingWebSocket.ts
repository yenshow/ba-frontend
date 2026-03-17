/**
 * 人流統計 WebSocket 事件處理
 * 監聽 YSCP event_acs（yscp:event:acs）與門禁 ISAPI 事件（people-counting:access-control:event），觸發資料重新載入
 */

import type { YscpEventPayload } from "~/composables/websocket/useWebSocket";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { logger } from "~/utils/logger";
import { ref, watch } from "vue";

const wsLogger = logger.createLogger("PeopleCounting WebSocket");

const YSCP_ACS_EVENT = "yscp:event:acs";
const ACCESS_CONTROL_EVENT = "people-counting:access-control:event";

export const usePeopleCountingWebSocket = () => {
	const { isConnected, on, off } = useWebSocket();

	/**
	 * 設置事件監聽（帶防抖）
	 * @param onRefetch 收到 YSCP 或門禁事件後重新載入資料的回調
	 * @param debounceMs 防抖延遲，預設 500ms
	 */
	const setupEventListeners = (
		onRefetch: (event?: YscpEventPayload) => void,
		debounceMs: number = 500
	) => {
		let debounceTimer: ReturnType<typeof setTimeout> | null = null;
		const isLoading = ref(false);

		const triggerRefetch = (data?: YscpEventPayload) => {
			if (isLoading.value) {
				if (process.dev) wsLogger.log("資料載入中，跳過本次事件", { type: data?.type });
				return;
			}
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				if (process.dev) wsLogger.log("觸發資料重新載入（防抖後）", { type: data?.type });
				isLoading.value = true;
				Promise.resolve(onRefetch(data)).finally(() => {
					isLoading.value = false;
				});
			}, debounceMs);
		};

		const handleYscpEvent = (data: YscpEventPayload) => triggerRefetch(data);
		const handleAccessControlEvent = () => triggerRefetch();

		watch(
			isConnected,
			connected => {
				if (connected) {
					on(YSCP_ACS_EVENT, handleYscpEvent);
					on(ACCESS_CONTROL_EVENT, handleAccessControlEvent);
				} else {
					off(YSCP_ACS_EVENT, handleYscpEvent);
					off(ACCESS_CONTROL_EVENT, handleAccessControlEvent);
					if (debounceTimer) {
						clearTimeout(debounceTimer);
						debounceTimer = null;
					}
				}
			},
			{ immediate: true }
		);

		return () => {
			off(YSCP_ACS_EVENT, handleYscpEvent);
			off(ACCESS_CONTROL_EVENT, handleAccessControlEvent);
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
		};
	};

	return { setupEventListeners };
};
