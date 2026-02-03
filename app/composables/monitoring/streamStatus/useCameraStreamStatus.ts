/**
 * 攝影機串流狀態管理 Composable
 * 負責攝影機串流狀態、WebSocket 事件處理和測試串流管理
 */

import type { SurveillanceCamera, CameraStreamStatus } from "~/types/surveillance";
import type { RTSPStreamInfo } from "~/types/rtsp";
import type {
	RtspStreamStartedEvent,
	RtspStreamStoppedEvent,
	RtspStreamErrorEvent
} from "~/composables/websocket/useWebSocket";
import { logger } from "~/utils/logger";
import { useSurveillanceApi } from "~/composables/systems/useSurveillanceApi";
import { useRtspApi } from "~/composables/systems/useRtsp";
import { useWebSocket } from "~/composables/websocket/useWebSocket";

/**
 * 攝影機串流狀態管理
 */
export const useCameraStreamStatus = () => {
	const streamStatusLogger = logger.createLogger("CameraStreamStatus");
	const surveillanceApi = useSurveillanceApi();
	const rtspApi = useRtspApi();
	const { on, off, isConnected } = useWebSocket();

	// 攝影機串流狀態映射（deviceId -> CameraStreamStatus）
	const streamStatusMap = ref<Map<number, CameraStreamStatus>>(new Map());

	// 所有攝影機列表
	const cameras = ref<SurveillanceCamera[]>([]);

	// 測試串流狀態
	const testStream = ref<RTSPStreamInfo | null>(null);

	/**
	 * 獲取指定設備的串流狀態
	 */
	const getStreamStatus = (deviceId: number): CameraStreamStatus | null => {
		return streamStatusMap.value.get(deviceId) || null;
	};

	/**
	 * 更新指定設備的串流狀態
	 */
	const updateStreamStatus = (deviceId: number, status: Partial<CameraStreamStatus>) => {
		const existing = streamStatusMap.value.get(deviceId);
		streamStatusMap.value.set(deviceId, {
			deviceId,
			...existing,
			...status
		} as CameraStreamStatus);
	};

	/**
	 * 移除指定設備的串流狀態
	 */
	const removeStreamStatus = (deviceId: number) => {
		streamStatusMap.value.delete(deviceId);
	};

	/**
	 * 批量更新串流狀態
	 */
	const updateMultipleStreamStatuses = (statuses: CameraStreamStatus[]) => {
		statuses.forEach(status => {
			streamStatusMap.value.set(status.deviceId, status);
		});
	};

	/**
	 * 從攝影機列表更新串流狀態
	 */
	const updateFromCameras = (cameraList: SurveillanceCamera[]) => {
		cameras.value = cameraList;

		cameraList.forEach(camera => {
			if (camera.streamInfo) {
				updateStreamStatus(camera.id, {
					streamId: camera.streamInfo.streamId,
					status: camera.streamInfo.status === "running" ? "running" : "stopped",
					hlsUrl: camera.streamInfo.hlsUrl
				});
			} else {
				// 如果沒有串流資訊，設置為停止狀態
				updateStreamStatus(camera.id, {
					status: "stopped"
				});
			}
		});
	};

	/**
	 * 載入攝影機列表
	 */
	const loadCameras = async () => {
		try {
			const cameraList = await surveillanceApi.getCamerasWithStreamInfo();
			updateFromCameras(cameraList);
			return cameraList;
		} catch (error) {
			streamStatusLogger.error("載入攝影機失敗", { error });
			throw error;
		}
	};

	/**
	 * 清理 HLS 實例緩存（確保重新啟動時從最新時間點開始）
	 */
	const clearHlsInstances = async (hlsUrl: string | undefined) => {
		if (!process.client || !hlsUrl) return;

		try {
			const { hlsInstanceManager } = await import("~/utils/hlsInstanceManager");
			hlsInstanceManager.clearInstancesByUrl(hlsUrl);
		} catch (err) {
			// 靜默處理錯誤，不影響停止流程
		}
	};

	/**
	 * 啟動單個串流
	 */
	const startStream = async (deviceId: number, syncMonitorViews?: () => void): Promise<void> => {
		// 更新狀態為載入中
		updateStreamStatus(deviceId, { status: "loading" });

		try {
			const streamInfo = await surveillanceApi.startCameraStream(deviceId);
			// WebSocket 事件會自動更新狀態，這裡不需要手動更新
			// 但如果 WebSocket 未連接，手動更新
			if (!isConnected.value) {
				updateStreamStatus(deviceId, {
					streamId: streamInfo.streamId,
					status: "running",
					hlsUrl: streamInfo.hlsUrl
				});
				syncMonitorViews?.();
			}
		} catch (error) {
			updateStreamStatus(deviceId, {
				status: "error",
				error: error instanceof Error ? error.message : "啟動失敗"
			});
			throw error;
		}
	};

	/**
	 * 停止單個串流
	 */
	const stopStream = async (deviceId: number, syncMonitorViews?: () => void): Promise<void> => {
		try {
			const camera = cameras.value.find(c => c.id === deviceId);
			await surveillanceApi.stopCameraStream(deviceId);

			// 清理相關的 HLS 實例緩存
			await clearHlsInstances(camera?.streamInfo?.hlsUrl);

			// WebSocket 事件會自動更新狀態，這裡不需要手動更新
			// 但如果 WebSocket 未連接，手動更新
			if (!isConnected.value) {
				updateStreamStatus(deviceId, { status: "stopped" });
				syncMonitorViews?.();
			}
		} catch (error) {
			streamStatusLogger.error("停止串流失敗", { deviceId, error });
			throw error;
		}
	};

	/**
	 * 處理串流啟動事件（通過回調函數判斷是否為測試串流和同步 monitorViews）
	 */
	const handleStreamStarted = (
		data: RtspStreamStartedEvent,
		isTestStreamCheck?: (streamId: string) => boolean,
		updateTestView?: (streamId: string, hlsUrl: string) => void,
		syncMonitorViews?: () => void
	) => {
		// 判斷是否為測試串流
		const isTest = isTestStreamCheck?.(data.streamId) ?? false;

		if (isTest) {
			// 更新測試串流狀態
			testStream.value = {
				streamId: data.streamId,
				hlsUrl: data.hlsUrl,
				rtspUrl: data.rtspUrl,
				status: "running",
				startedAt: data.timestamp || new Date().toISOString(),
				useGpuEncoding: data.useGpuEncoding,
				gpuOptions: data.gpuOptions
			};

			// 更新 monitorViews 中對應的測試串流視圖
			updateTestView?.(data.streamId, data.hlsUrl);
		} else {
			// 正常串流：根據 RTSP URL 找到對應的攝影機
			const camera = cameras.value.find(c => {
				if (c.config.type !== "camera") return false;
				const cameraRtspUrl = surveillanceApi.buildRtspUrl(c.config);
				if (!cameraRtspUrl) return false;
				// 標準化 URL 比較
				const normalizeUrl = (url: string) => url.replace(/\/$/, "");
				return normalizeUrl(cameraRtspUrl) === normalizeUrl(data.rtspUrl);
			});

			if (camera) {
				// 更新攝影機的串流資訊
				camera.streamInfo = {
					streamId: data.streamId,
					rtspUrl: data.rtspUrl,
					hlsUrl: data.hlsUrl,
					status: "running",
					startedAt: data.timestamp
				};
				camera.isStreaming = true;

				// 更新狀態映射
				updateStreamStatus(camera.id, {
					streamId: data.streamId,
					status: "running",
					hlsUrl: data.hlsUrl
				});

				// 自動同步 monitorViews
				syncMonitorViews?.();
			}
		}
	};

	/**
	 * 處理串流停止事件（通過回調函數判斷是否為測試串流）
	 */
	const handleStreamStopped = (
		data: RtspStreamStoppedEvent,
		isTestStreamCheck?: (streamId: string) => boolean,
		syncMonitorViews?: () => void
	) => {
		// 判斷是否為測試串流
		const isTest = isTestStreamCheck?.(data.streamId) ?? false;

		if (isTest) {
			// 清除測試串流狀態
			if (testStream.value?.streamId === data.streamId) {
				testStream.value = null;
			}
		} else {
			// 正常串流：根據 streamId 找到對應的攝影機
			const camera = cameras.value.find(c => c.streamInfo?.streamId === data.streamId);

			if (camera) {
				camera.streamInfo = null;
				camera.isStreaming = false;

				// 更新狀態映射
				updateStreamStatus(camera.id, {
					status: "stopped"
				});

				// 自動同步 monitorViews
				syncMonitorViews?.();
			}
		}
	};

	/**
	 * 處理串流錯誤事件（通過回調函數判斷是否為測試串流）
	 */
	const handleStreamError = (
		data: RtspStreamErrorEvent,
		isTestStreamCheck?: (streamId: string) => boolean,
		syncMonitorViews?: () => void
	) => {
		// 判斷是否為測試串流
		const isTest = isTestStreamCheck?.(data.streamId) ?? false;

		if (isTest) {
			// 更新測試串流狀態為停止（錯誤時設為停止）
			if (testStream.value?.streamId === data.streamId) {
				testStream.value.status = "stopped";
			}
		} else {
			// 正常串流：根據 streamId 找到對應的攝影機
			const camera = cameras.value.find(c => c.streamInfo?.streamId === data.streamId);

			if (camera) {
				if (camera.streamInfo) {
					camera.streamInfo.status = "stopped";
				}
				camera.isStreaming = false;

				// 更新狀態映射
				updateStreamStatus(camera.id, {
					status: "error",
					error: data.error.message
				});

				// 自動同步 monitorViews
				syncMonitorViews?.();
			}
		}
	};

	// 保存事件處理器引用以便清理
	let wsCleanup: (() => void) | null = null;

	/**
	 * 設置 WebSocket 事件監聽器（通過回調函數處理測試串流判斷和同步）
	 */
	const setupWebSocketListeners = (
		isTestStreamCheck?: (streamId: string) => boolean,
		updateTestView?: (streamId: string, hlsUrl: string) => void,
		syncMonitorViews?: () => void
	) => {
		if (!isConnected.value) return;

		const handleStarted = (data: RtspStreamStartedEvent) =>
			handleStreamStarted(data, isTestStreamCheck, updateTestView, syncMonitorViews);
		const handleStopped = (data: RtspStreamStoppedEvent) =>
			handleStreamStopped(data, isTestStreamCheck, syncMonitorViews);
		const handleError = (data: RtspStreamErrorEvent) =>
			handleStreamError(data, isTestStreamCheck, syncMonitorViews);

		on("rtsp:stream:started", handleStarted);
		on("rtsp:stream:stopped", handleStopped);
		on("rtsp:stream:error", handleError);

		// 返回清理函數
		wsCleanup = () => {
			off("rtsp:stream:started", handleStarted);
			off("rtsp:stream:stopped", handleStopped);
			off("rtsp:stream:error", handleError);
		};
	};

	/**
	 * 移除 WebSocket 事件監聽器
	 */
	const removeWebSocketListeners = () => {
		if (wsCleanup) {
			wsCleanup();
			wsCleanup = null;
		}
	};

	/**
	 * 測試串流管理
	 */
	const startTestStream = async (
		rtspUrl: string,
		syncMonitorViews?: () => void,
		gpuOptions?: {
			useGpuEncoding?: boolean;
			gpuType?: "nvidia" | "intel" | "amd";
			bitrate?: string;
			preset?: string;
		}
	): Promise<RTSPStreamInfo> => {
		try {
			const streamInfo = await rtspApi.startStream(rtspUrl, gpuOptions);

			// 更新測試串流狀態
			testStream.value = {
				streamId: streamInfo.streamId,
				hlsUrl: streamInfo.hlsUrl,
				rtspUrl: rtspUrl,
				status: streamInfo.status,
				startedAt: streamInfo.startedAt,
				useGpuEncoding: streamInfo.useGpuEncoding,
				gpuOptions: streamInfo.gpuOptions
			};

			// 自動同步 monitorViews
			syncMonitorViews?.();

			return streamInfo;
		} catch (error) {
			streamStatusLogger.error("啟動測試串流失敗", { error });
			throw error;
		}
	};

	const stopTestStream = async (
		syncMonitorViews?: () => void,
		removeTestView?: (streamId: string) => void,
		reorderViews?: () => void
	): Promise<void> => {
		if (!testStream.value) return;

		const streamId = testStream.value.streamId;
		const hlsUrl = testStream.value.hlsUrl;

		try {
			await rtspApi.stopStream(streamId);

			// 從 monitorViews 中移除測試串流視圖
			removeTestView?.(streamId);
			reorderViews?.();

			// 清除測試串流狀態
			testStream.value = null;

			// 清理相關的 HLS 實例緩存
			await clearHlsInstances(hlsUrl);
		} catch (error) {
			streamStatusLogger.error("停止測試串流失敗", { error });
			throw error;
		}
	};

	return {
		// 狀態
		streamStatusMap: readonly(streamStatusMap),
		cameras: readonly(cameras),
		testStream: readonly(testStream),

		// 方法
		getStreamStatus,
		updateStreamStatus,
		removeStreamStatus,
		updateMultipleStreamStatuses,
		updateFromCameras,
		loadCameras,
		startStream,
		stopStream,
		startTestStream,
		stopTestStream,
		setupWebSocketListeners,
		removeWebSocketListeners
	};
};
