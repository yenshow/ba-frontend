/**
 * 串流狀態統一管理 Composable（主文件）
 * 
 * 此文件作為入口點，委派給專用的子 composables：
 * - useCameraStreamStatus: 攝影機串流狀態管理、WebSocket 事件處理、測試串流管理
 * - useMonitorViews: 監控畫面管理
 * - useStreamBatchOperations: 批量操作
 * 
 * 功能：
 * - 攝影機列表和串流狀態管理
 * - 監控畫面管理（monitorViews）
 * - 測試串流管理
 * - 批量操作
 * - WebSocket 事件自動同步
 */

import type { SurveillanceCamera, CameraStreamStatus, MonitorView } from "~/types/surveillance";
import type { RTSPStreamInfo } from "~/types/rtsp";
import { useCameraStreamStatus } from "./streamStatus/useCameraStreamStatus";
import { useMonitorViews } from "./streamStatus/useMonitorViews";
import { useStreamBatchOperations } from "./streamStatus/useStreamBatchOperations";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { watch } from "vue";

/**
 * 串流狀態統一管理 Composable（主入口）
 * 協調專用的子 composables
 */
export const useStreamStatus = () => {
	const { isConnected } = useWebSocket();

	// 使用專用的子 composables
	const cameraStream = useCameraStreamStatus();
	const monitorViews = useMonitorViews();
	const batchOperations = useStreamBatchOperations();

	// 創建同步函數
	const syncMonitorViews = () => {
		monitorViews.syncMonitorViewsWithStreamStatus(
			cameraStream.streamStatusMap.value,
			cameraStream.testStream.value
		);
	};

	// 創建測試串流檢查函數和更新測試視圖函數（用於 WebSocket 監聽器）
	const isTestStreamCheck = monitorViews.isTestStream;
	const updateTestView = monitorViews.updateTestView;

	// 從攝影機列表更新串流狀態（重寫以包含同步）
	const updateFromCameras = (cameraList: SurveillanceCamera[]) => {
		cameraStream.updateFromCameras(cameraList);
		syncMonitorViews();
	};

	// 啟動單個串流（重寫以包含同步）
	const startStream = async (deviceId: number): Promise<void> => {
		await cameraStream.startStream(deviceId, syncMonitorViews);
	};

	// 停止單個串流（重寫以包含同步）
	const stopStream = async (deviceId: number): Promise<void> => {
		await cameraStream.stopStream(deviceId, syncMonitorViews);
	};

	// 批量啟動串流（重寫以包含同步）
	const startAllStreams = async (cameraIds: number[]): Promise<void> => {
		await batchOperations.startAllStreams(
			cameraIds,
			cameraStream.updateStreamStatus,
			syncMonitorViews
		);
	};

	// 批量停止串流（重寫以包含同步）
	const stopAllStreams = async (cameraIds: number[]): Promise<void> => {
		await batchOperations.stopAllStreams(
			cameraIds,
			cameraStream.updateStreamStatus,
			syncMonitorViews
		);
	};

	// 啟動測試串流（重寫以包含同步）
	const startTestStream = async (
		rtspUrl: string,
		gpuOptions?: {
			useGpuEncoding?: boolean;
			gpuType?: "nvidia" | "intel" | "amd";
			bitrate?: string;
			preset?: string;
		}
	): Promise<RTSPStreamInfo> => {
		return await cameraStream.startTestStream(rtspUrl, syncMonitorViews, gpuOptions);
	};

	// 停止測試串流（重寫以包含同步）
	const stopTestStream = async (): Promise<void> => {
		await cameraStream.stopTestStream(
			syncMonitorViews,
			monitorViews.removeTestViewByStreamId,
			monitorViews.reorderMonitorViews
		);
	};

	// 初始化（設置 WebSocket 監聽器）
	const init = () => {
		// 監聽 WebSocket 連接狀態
		watch(isConnected, (connected) => {
			if (connected) {
				cameraStream.setupWebSocketListeners(
					isTestStreamCheck,
					updateTestView,
					syncMonitorViews
				);
			}
		}, { immediate: true });
	};

	// 清理（移除 WebSocket 監聽器）
	const cleanup = () => {
		cameraStream.removeWebSocketListeners();
	};

	// 監控畫面管理方法（委派給 useMonitorViews）
	const addMonitorView = (view: MonitorView | number) => {
		monitorViews.addMonitorView(view);
		syncMonitorViews();
	};

	const removeMonitorView = (deviceId: number) => {
		monitorViews.removeMonitorView(deviceId);
	};

	const updateMonitorView = (deviceId: number, updates: Partial<MonitorView>) => {
		monitorViews.updateMonitorView(deviceId, updates);
		syncMonitorViews();
	};

	const reorderMonitorViews = () => {
		monitorViews.reorderMonitorViews();
	};

	return {
		// 狀態（從子 composables 暴露）
		streamStatusMap: cameraStream.streamStatusMap,
		cameras: cameraStream.cameras,
		monitorViews: monitorViews.monitorViews,
		testStream: cameraStream.testStream,

		// 方法（從子 composables 暴露或重寫）
		getStreamStatus: cameraStream.getStreamStatus,
		updateStreamStatus: cameraStream.updateStreamStatus,
		removeStreamStatus: cameraStream.removeStreamStatus,
		updateMultipleStreamStatuses: cameraStream.updateMultipleStreamStatuses,
		updateFromCameras,
		loadCameras: cameraStream.loadCameras,

		// 監控畫面管理
		addMonitorView,
		removeMonitorView,
		updateMonitorView,
		reorderMonitorViews,

		// 串流操作
		startStream,
		stopStream,
		startAllStreams,
		stopAllStreams,

		// 測試串流
		startTestStream,
		stopTestStream,

		// 初始化和清理
		init,
		cleanup
	};
};
