/**
 * 串流批量操作 Composable
 * 負責批量啟動和停止串流
 */

import type { CameraStreamStatus } from "~/types/surveillance";
import { logger } from "~/utils/logger";
import { useSurveillanceApi } from "~/composables/systems/useSurveillanceApi";
import { useWebSocket } from "~/composables/websocket/useWebSocket";

const batchOperationsLogger = logger.createLogger("StreamBatchOperations");

/**
 * 串流批量操作
 */
export const useStreamBatchOperations = () => {
	const surveillanceApi = useSurveillanceApi();
	const { isConnected } = useWebSocket();

	/**
	 * 批量啟動串流
	 */
	const startAllStreams = async (
		cameraIds: number[],
		updateStreamStatus: (deviceId: number, status: Partial<CameraStreamStatus>) => void,
		syncMonitorViews?: () => void
	): Promise<void> => {
		if (cameraIds.length === 0) return;

		// 更新所有狀態為載入中
		cameraIds.forEach(id => {
			updateStreamStatus(id, { status: "loading" });
		});

		try {
			const results = await Promise.allSettled(
				cameraIds.map(id => surveillanceApi.startCameraStream(id))
			);

			// 如果 WebSocket 未連接，手動更新成功的串流
			if (!isConnected.value) {
				results.forEach((result, index) => {
					const deviceId = cameraIds[index];
					if (result.status === "fulfilled") {
						updateStreamStatus(deviceId, {
							streamId: result.value.streamId,
							status: "running",
							hlsUrl: result.value.hlsUrl
						});
					} else {
						updateStreamStatus(deviceId, {
							status: "error",
							error: result.reason instanceof Error ? result.reason.message : "啟動失敗"
						});
					}
				});
				syncMonitorViews?.();
			}
		} catch (error) {
			batchOperationsLogger.error("批量啟動串流失敗", { error });
			throw error;
		}
	};

	/**
	 * 批量停止串流
	 */
	const stopAllStreams = async (
		cameraIds: number[],
		updateStreamStatus: (deviceId: number, status: Partial<CameraStreamStatus>) => void,
		syncMonitorViews?: () => void
	): Promise<void> => {
		if (cameraIds.length === 0) return;

		try {
			await Promise.allSettled(cameraIds.map(id => surveillanceApi.stopCameraStream(id)));

			// 如果 WebSocket 未連接，手動更新狀態
			if (!isConnected.value) {
				cameraIds.forEach(id => {
					updateStreamStatus(id, { status: "stopped" });
				});
				syncMonitorViews?.();
			}
		} catch (error) {
			batchOperationsLogger.error("批量停止串流失敗", { error });
			throw error;
		}
	};

	return {
		startAllStreams,
		stopAllStreams
	};
};

