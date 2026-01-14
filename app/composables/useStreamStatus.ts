import type { SurveillanceCamera, CameraStreamStatus, MonitorView } from "~/types/surveillance";
import type { RTSPStreamInfo } from "~/types/rtsp";
import type {
	RtspStreamStartedEvent,
	RtspStreamStoppedEvent,
	RtspStreamErrorEvent
} from "~/composables/useWebSocket";

/**
 * 串流狀態統一管理 Composable
 * 提供單一數據源，所有組件從這裡讀取和更新串流狀態
 * 
 * 功能：
 * - 攝影機列表和串流狀態管理
 * - 監控畫面管理（monitorViews）
 * - 測試串流管理
 * - 批量操作
 * - WebSocket 事件自動同步
 */
export const useStreamStatus = () => {
	const surveillanceApi = useSurveillanceApi();
	const rtspApi = useRtspApi();
	const { on, off, isConnected } = useWebSocket();

	// 攝影機串流狀態映射（deviceId -> CameraStreamStatus）
	const streamStatusMap = ref<Map<number, CameraStreamStatus>>(new Map());

	// 所有攝影機列表
	const cameras = ref<SurveillanceCamera[]>([]);

	// 監控畫面列表（統一管理）
	const monitorViews = ref<MonitorView[]>([]);

	// 測試串流狀態
	const testStream = ref<{
		streamId: string;
		hlsUrl: string;
		rtspUrl: string;
		status: string;
	} | null>(null);

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

		// 自動同步 monitorViews 中的串流資訊
		syncMonitorViewsWithStreamStatus();
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
			console.error("[StreamStatus] 載入攝影機失敗:", error);
			throw error;
		}
	};

	/**
	 * 判斷是否為測試串流
	 */
	const isTestStream = (data: RtspStreamStartedEvent | RtspStreamStoppedEvent | RtspStreamErrorEvent): boolean => {
		// 檢查 monitorViews 中是否有測試串流使用此 streamId
		return monitorViews.value.some(v => v.isTestStream && v.streamId === data.streamId);
	};

	/**
	 * 處理串流啟動事件（統一處理正常串流和測試串流）
	 */
	const handleStreamStarted = (data: RtspStreamStartedEvent) => {
		// 判斷是否為測試串流
		if (isTestStream(data)) {
			// 更新測試串流狀態
			testStream.value = {
				streamId: data.streamId,
				hlsUrl: data.hlsUrl,
				rtspUrl: data.rtspUrl,
				status: "running"
			};

			// 更新 monitorViews 中對應的測試串流視圖
			monitorViews.value.forEach(view => {
				if (view.isTestStream && view.streamId === data.streamId) {
					view.hlsUrl = data.hlsUrl;
					view.streamId = data.streamId;
				}
			});
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
				syncMonitorViewsWithStreamStatus();
			}
		}
	};

	/**
	 * 處理串流停止事件（統一處理正常串流和測試串流）
	 */
	const handleStreamStopped = (data: RtspStreamStoppedEvent) => {
		// 判斷是否為測試串流
		if (isTestStream(data)) {
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
				syncMonitorViewsWithStreamStatus();
			}
		}
	};

	/**
	 * 處理串流錯誤事件（統一處理正常串流和測試串流）
	 */
	const handleStreamError = (data: RtspStreamErrorEvent) => {
		// 判斷是否為測試串流
		if (isTestStream(data)) {
			// 更新測試串流狀態為錯誤
			if (testStream.value?.streamId === data.streamId) {
				testStream.value.status = "error";
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
				syncMonitorViewsWithStreamStatus();
			}
		}
	};

	/**
	 * 設置 WebSocket 事件監聽器
	 */
	const setupWebSocketListeners = () => {
		if (!isConnected.value) return;

		on("rtsp:stream:started", handleStreamStarted);
		on("rtsp:stream:stopped", handleStreamStopped);
		on("rtsp:stream:error", handleStreamError);
	};

	/**
	 * 移除 WebSocket 事件監聽器
	 */
	const removeWebSocketListeners = () => {
		off("rtsp:stream:started", handleStreamStarted);
		off("rtsp:stream:stopped", handleStreamStopped);
		off("rtsp:stream:error", handleStreamError);
	};

	/**
	 * 初始化（在組件 onMounted 時調用）
	 */
	const init = () => {
		// 監聽 WebSocket 連接狀態
		watch(isConnected, (connected) => {
			if (connected) {
				setupWebSocketListeners();
			}
		}, { immediate: true });
	};

	/**
	 * 監控畫面管理
	 */
	const addMonitorView = (view: MonitorView | number) => {
		if (typeof view === "number") {
			// 如果是 deviceId，創建 MonitorView
			const deviceId = view;
			const existingIndex = monitorViews.value.findIndex(v => v.deviceId === deviceId && !v.isTestStream);
			if (existingIndex >= 0) {
				// 如果已存在，移除
				monitorViews.value.splice(existingIndex, 1);
				reorderMonitorViews();
				return;
			}
			view = {
				deviceId,
				position: monitorViews.value.length
			};
		}

		// 檢查是否已存在
		const existingIndex = monitorViews.value.findIndex(
			v => v.deviceId === view.deviceId && v.isTestStream === view.isTestStream
		);
		if (existingIndex >= 0) {
			// 更新現有視圖
			monitorViews.value[existingIndex] = { ...monitorViews.value[existingIndex], ...view };
		} else {
			// 添加新視圖
			monitorViews.value.push(view);
		}

		// 自動同步串流資訊
		syncMonitorViewsWithStreamStatus();
	};

	const removeMonitorView = (deviceId: number) => {
		const index = monitorViews.value.findIndex(v => v.deviceId === deviceId);
		if (index >= 0) {
			monitorViews.value.splice(index, 1);
			reorderMonitorViews();
		}
	};

	const updateMonitorView = (deviceId: number, updates: Partial<MonitorView>) => {
		const view = monitorViews.value.find(v => v.deviceId === deviceId);
		if (view) {
			Object.assign(view, updates);
			syncMonitorViewsWithStreamStatus();
		}
	};

	const reorderMonitorViews = () => {
		monitorViews.value.forEach((view, idx) => {
			view.position = idx;
		});
	};

	/**
	 * 自動同步 monitorViews 與 streamStatusMap
	 * 當串流狀態更新時，自動更新 monitorViews 中的 hlsUrl 和 streamId
	 */
	const syncMonitorViewsWithStreamStatus = () => {
		monitorViews.value.forEach(view => {
			if (view.isTestStream) {
				// 測試串流：從 testStream 獲取最新狀態
				if (testStream.value) {
					view.hlsUrl = testStream.value.hlsUrl;
					view.streamId = testStream.value.streamId;
				}
			} else {
				// 正常串流：從 streamStatusMap 獲取最新狀態
				const status = streamStatusMap.value.get(view.deviceId);
				if (status) {
					view.hlsUrl = status.hlsUrl;
					view.streamId = status.streamId;
				}
			}
		});
	};

	/**
	 * 啟動單個串流
	 */
	const startStream = async (deviceId: number): Promise<void> => {
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
				syncMonitorViewsWithStreamStatus();
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
	 * 停止單個串流
	 */
	const stopStream = async (deviceId: number): Promise<void> => {
		try {
			const camera = cameras.value.find(c => c.id === deviceId);
			await surveillanceApi.stopCameraStream(deviceId);
			
			// 清理相關的 HLS 實例緩存
			await clearHlsInstances(camera?.streamInfo?.hlsUrl);

			// WebSocket 事件會自動更新狀態，這裡不需要手動更新
			// 但如果 WebSocket 未連接，手動更新
			if (!isConnected.value) {
				updateStreamStatus(deviceId, { status: "stopped" });
				syncMonitorViewsWithStreamStatus();
			}
		} catch (error) {
			console.error(`[StreamStatus] 停止串流失敗 (設備 ID: ${deviceId}):`, error);
			throw error;
		}
	};

	/**
	 * 批量啟動串流
	 */
	const startAllStreams = async (cameraIds: number[]): Promise<void> => {
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
				syncMonitorViewsWithStreamStatus();
			}
		} catch (error) {
			console.error("[StreamStatus] 批量啟動串流失敗:", error);
			throw error;
		}
	};

	/**
	 * 批量停止串流
	 */
	const stopAllStreams = async (cameraIds: number[]): Promise<void> => {
		if (cameraIds.length === 0) return;

		try {
			await Promise.allSettled(cameraIds.map(id => surveillanceApi.stopCameraStream(id)));

			// 如果 WebSocket 未連接，手動更新狀態
			if (!isConnected.value) {
				cameraIds.forEach(id => {
					updateStreamStatus(id, { status: "stopped" });
				});
				syncMonitorViewsWithStreamStatus();
			}
		} catch (error) {
			console.error("[StreamStatus] 批量停止串流失敗:", error);
			throw error;
		}
	};

	/**
	 * 測試串流管理
	 */
	const startTestStream = async (rtspUrl: string): Promise<RTSPStreamInfo> => {
		try {
			const streamInfo = await rtspApi.startStream(rtspUrl);
			
			// 更新測試串流狀態
			testStream.value = {
				streamId: streamInfo.streamId,
				hlsUrl: streamInfo.hlsUrl,
				rtspUrl: rtspUrl,
				status: streamInfo.status
			};

			// 自動同步 monitorViews 中的測試串流視圖
			syncMonitorViewsWithStreamStatus();

			return streamInfo;
		} catch (error) {
			console.error("[StreamStatus] 啟動測試串流失敗:", error);
			throw error;
		}
	};

	const stopTestStream = async (): Promise<void> => {
		if (!testStream.value) return;

		const streamId = testStream.value.streamId;
		const hlsUrl = testStream.value.hlsUrl;

		try {
			await rtspApi.stopStream(streamId);
			
			// 從 monitorViews 中移除測試串流視圖
			const testViewIndex = monitorViews.value.findIndex(
				v => v.isTestStream && v.streamId === streamId
			);
			if (testViewIndex >= 0) {
				monitorViews.value.splice(testViewIndex, 1);
				reorderMonitorViews();
			}

			// 清除測試串流狀態
			testStream.value = null;

			// 清理相關的 HLS 實例緩存
			await clearHlsInstances(hlsUrl);
		} catch (error) {
			console.error("[StreamStatus] 停止測試串流失敗:", error);
			throw error;
		}
	};

	/**
	 * 清理（在組件 onBeforeUnmount 時調用）
	 */
	const cleanup = () => {
		removeWebSocketListeners();
	};

	return {
		// 狀態
		streamStatusMap: readonly(streamStatusMap),
		cameras: readonly(cameras),
		monitorViews: readonly(monitorViews),
		testStream: readonly(testStream),

		// 方法
		getStreamStatus,
		updateStreamStatus,
		removeStreamStatus,
		updateMultipleStreamStatuses,
		updateFromCameras,
		loadCameras,

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

