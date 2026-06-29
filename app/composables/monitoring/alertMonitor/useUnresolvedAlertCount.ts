/**
 * 未解決警報數量管理 Composable
 * 負責未解決警報數量的監聽和管理（WebSocket + 輪詢後備）
 *
 * 策略：收到 alert:count 時先用 payload.count 即時更新 badge，
 *       再透過定期校準（REST）與後端「全量 active」語意一致（狀態型警報）。
 */

import type { AlertSource } from "~/types/alert";
import type { AlertCountEvent } from "~/types/websocket";
import { watch } from "vue";
import { logger } from "~/utils/logger";
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useAccessGate } from "~/composables/core/useAccessGate";
import { PERM } from "~/config/permissionCodes";

const countLogger = logger.createLogger("UnresolvedAlertCount");

const CALIBRATION_INTERVAL_MS = 120_000; // 每 2 分鐘校準一次
const FALLBACK_POLLING_INTERVAL_MS = 30_000; // 斷線後備輪詢

export const useUnresolvedAlertCount = () => {
	const alertApi = useAlertApi();
	const { isConnected, on, off } = useWebSocket();
	const { canLoadFeature, useWsModuleGate } = useAccessGate();
	const alertGate = { permissionCode: PERM.alertLog.module } as const;
	const canSubscribe = useWsModuleGate(null, alertGate);

	/** 與 useAlertMonitor 內其他狀態一致：跨元件共用，避免 layout 更新、AppHeader 讀到另一份 ref 永遠為 0 */
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
		if (!canLoadFeature(null, alertGate)) {
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

	/**
	 * 套用最新的 alert:count payload 並標記 dirty
	 */
	const applyLatestCount = () => {
		if (latestCountPayload && typeof latestCountPayload.count === "number") {
			unresolvedAlertCount.value = latestCountPayload.count;
		}
		isDirty = true;
		latestCountPayload = null;
		countDebounceTimer = null;
	};

	/**
	 * 處理 alert:count WS 事件（500ms debounce，避免批次操作時連續 re-render）
	 */
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

	/**
	 * 啟動斷線後備輪詢
	 */
	const startCountPolling = () => {
		stopCountPolling();
		countPollingTimer = setInterval(() => {
			void loadUnresolvedAlertCount();
		}, FALLBACK_POLLING_INTERVAL_MS);
	};

	/**
	 * 啟動定期校準（連線狀態下）
	 * 只在 dirty 時才實際打 REST，避免無事件時浪費請求
	 */
	const startCalibration = () => {
		stopCalibration();
		calibrationTimer = setInterval(() => {
			if (isDirty) {
				void loadUnresolvedAlertCount();
			}
		}, CALIBRATION_INTERVAL_MS);
	};

	const syncAlertCountSubscription = (connected: boolean, allowed: boolean) => {
		if (handleAlertCount) {
			off("alert:count", handleAlertCount);
		}
		if (!allowed) {
			stopCalibration();
			stopCountPolling();
			return;
		}
		if (connected && handleAlertCount) {
			on("alert:count", handleAlertCount);
			stopCountPolling();
			startCalibration();
			return;
		}
		stopCalibration();
		startCountPolling();
	};

	const startAlertCountMonitoring = () => {
		stopAlertCountMonitoring();
		if (!canLoadFeature(null, alertGate)) {
			unresolvedAlertCount.value = 0;
			return;
		}

		handleAlertCount = handleAlertCountEvent;

		countWebsocketWatcher = watch(
			[() => isConnected.value, canSubscribe] as const,
			([connected, allowed]) => syncAlertCountSubscription(connected, allowed),
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
