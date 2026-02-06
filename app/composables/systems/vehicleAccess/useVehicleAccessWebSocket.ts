/**
 * 車輛進出 WebSocket（yscp:event:vehicle → 重新載入列表與總覽）
 */

import type { YscpEventPayload } from "~/composables/websocket/useWebSocket";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { logger } from "~/utils/logger";
import { ref, watch } from "vue";

const YSCP_VEHICLE_EVENT = "yscp:event:vehicle";
const wsLogger = logger.createLogger("VehicleAccess WS");

export const useVehicleAccessWebSocket = () => {
	const { isConnected, on, off } = useWebSocket();

	const setupEventListeners = (
		onYscpEvent: (event: YscpEventPayload) => void,
		debounceMs: number = 500
	): (() => void) => {
		let debounceTimer: ReturnType<typeof setTimeout> | null = null;
		const isLoading = ref(false);

		const handleYscpEvent = (data: YscpEventPayload) => {
			if (data.type !== "vehicle_access") return;
			if (isLoading.value) {
				if (process.dev) wsLogger.log("資料載入中，跳過本次事件", { type: data.type });
				return;
			}
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				if (process.dev) wsLogger.log("觸發車輛進出資料重新載入（防抖後）", { type: data.type });
				isLoading.value = true;
				Promise.resolve(onYscpEvent(data)).finally(() => {
					isLoading.value = false;
				});
			}, debounceMs);
		};

		watch(
			isConnected,
			connected => {
				if (connected) {
					on(YSCP_VEHICLE_EVENT, handleYscpEvent);
				} else {
					off(YSCP_VEHICLE_EVENT, handleYscpEvent);
					if (debounceTimer) {
						clearTimeout(debounceTimer);
						debounceTimer = null;
					}
				}
			},
			{ immediate: true }
		);

		return () => {
			off(YSCP_VEHICLE_EVENT, handleYscpEvent);
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
		};
	};

	return { setupEventListeners };
};
