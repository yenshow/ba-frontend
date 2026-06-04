/**
 * 未解決警報數量管理 Composable
 * 負責未解決警報數量的監聽和管理（WebSocket + 輪詢後備）
 *
 * 策略：收到 alert:count 時先用 payload.count 即時更新 badge，
 *       再透過定期校準（REST）與後端「全量 active」語意一致（狀態型警報）。
 */

import type { AlertSource } from "~/types/alert";
import type { AlertCountEvent } from "~/types/websocket";
import { logger } from "~/utils/logger";
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useAuth } from "~/composables/core/useAuth";
import { PERM } from "~/config/permissionCodes";
import { watch } from "vue";

const countLogger = logger.createLogger("UnresolvedAlertCount");

const CALIBRATION_INTERVAL_MS = 120_000;
const FALLBACK_POLLING_INTERVAL_MS = 30_000;

export const useUnresolvedAlertCount = () => {
	const alertApi = useAlertApi();
	const { isConnected, on, off } = useWebSocket();
	const { hasPermission } = useAuth();

	const unresolvedAlertCount = useState<number>("alert-monitor:unresolved-count", () => 0);
	const isLoadingCount = useState<boolean>("alert-monitor:unresolved-count-loading", () => false);

	let handleAlertCount: ((data: AlertCountEvent) => void) | null = null;
	let countPollingTimer: ReturnType<typeof setInterval> | null = null;
	let calibrationTimer: ReturnType<typeof setInterval> | null = null;
	let countWebsocketWatcher: ReturnType<typeof watch> | null = null;
	let isDirty = false;
	let countDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let latestCountPayload: AlertCountEvent | null = null;

	const loadUnresolvedAlertCount = async (filters?: { source?: AlertSource }) => {
		if (!hasPermission(PERM.alertLog.module)) {
			unresolvedAlertCount.value = 0;
			return;
		}
		if (isLoadingCount.value) return;

		isLoadingCount.value = true;
		try {
			const result = await alertApi.getUnresolvedAlertCount({
				...filters
			});
			unresolvedAlertCount.value = result.count || 0;
			isDirty = false;
		} catch (error) {
			unresolvedAlertCount.value = 0;
			countLogger.warn("載入未解決警報數量失敗", { error });
		} finally {
			isLoadingCount.value = false;
		}
	};

	const applyLatestCount = () => {
		if (latestCountPayload && typeof latestCountPayload.count === "number") {
			unresolvedAlertCount.value = latestCountPayload.count;
		}
		isDirty = true;
		latestCountPayload = null;
		countDebounceTimer = null;
	};

	const handleAlertCountEvent = (data: AlertCountEvent) => {
		latestCountPayload = data;
		if (countDebounceTimer) clearTimeout(countDebounceTimer);
		countDebounceTimer = setTimeout(applyLatestCount, 500);
	};

	const stopCountPolling = () => {
		if (countPollingTimer) {
			clearInterval(countPollingTimer);
			countPollingTimer = null;
		}
	};

	const stopCalibration = () => {
		if (calibrationTimer) {
			clearInterval(calibrationTimer);
			calibrationTimer = null;
		}
	};

	const startCountPolling = () => {
		stopCountPolling();
		countPollingTimer = setInterval(() => {
			void loadUnresolvedAlertCount();
		}, FALLBACK_POLLING_INTERVAL_MS);
	};

	const startCalibration = () => {
		stopCalibration();
		calibrationTimer = setInterval(() => {
			if (isDirty) {
				void loadUnresolvedAlertCount();
			}
		}, CALIBRATION_INTERVAL_MS);
	};

	const startAlertCountMonitoring = () => {
		stopAlertCountMonitoring();
		if (!hasPermission(PERM.alertLog.module)) {
			unresolvedAlertCount.value = 0;
			return;
		}

		handleAlertCount = handleAlertCountEvent;

		countWebsocketWatcher = watch(
			isConnected,
			connected => {
				if (connected) {
					if (handleAlertCount) {
						on("alert:count", handleAlertCount);
					}
					stopCountPolling();
					startCalibration();
				} else {
					if (handleAlertCount) {
						off("alert:count", handleAlertCount);
					}
					stopCalibration();
					startCountPolling();
				}
			},
			{ immediate: true }
		);
	};

	const stopAlertCountMonitoring = () => {
		if (countWebsocketWatcher) {
			countWebsocketWatcher();
			countWebsocketWatcher = null;
		}

		if (handleAlertCount) {
			off("alert:count", handleAlertCount);
			handleAlertCount = null;
		}

		if (countDebounceTimer) {
			clearTimeout(countDebounceTimer);
			countDebounceTimer = null;
		}
		latestCountPayload = null;

		stopCountPolling();
		stopCalibration();
	};

	return {
		unresolvedAlertCount: readonly(unresolvedAlertCount),
		isLoadingCount: readonly(isLoadingCount),
		loadUnresolvedAlertCount,
		startAlertCountMonitoring,
		stopAlertCountMonitoring
	};
};
