<template>
	<div>
		<!-- 影像監視系統頁面內容 - 參考照明系統排版 -->
		<div class="flex justify-center gap-6 2xl:gap-8">
			<!-- 左側：監控畫面（主要內容 - 大） -->
			<section class="relative flex-[1.2] 2xl:flex-[1.3]">
				<div
					ref="leftSectionRef"
					class="flex flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8"
				>
					<!-- 控制面板 -->
					<div class="mb-4">
						<SurveillanceControlPanel
							v-model="gridLayout"
							:total-cameras="cameras.length"
							:streaming-count="streamingCamerasCount"
							:view-count="monitorViews.length"
							:max-views="parseInt(gridLayout)"
							:can-start-all="canStartAll"
							:can-stop-all="canStopAll"
							@start-all="handleStartAll"
							@stop-all="handleStopAll"
							@refresh="refreshStatus"
						/>
					</div>

					<!-- 監控網格區域 -->
					<div class="min-h-[400px] flex-1">
						<Transition name="fade" mode="out-in">
							<!-- 錯誤狀態 -->
							<div v-if="loadError" key="error" class="flex h-full items-center justify-center">
								<div class="rounded-lg bg-red-50/90 p-6 text-center dark:bg-red-900/30">
									<p class="text-red-600 dark:text-red-400">{{ loadError }}</p>
									<button
										@click="loadCameras"
										class="mt-4 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
									>
										重試
									</button>
								</div>
							</div>

							<!-- 監控網格 -->
							<div v-else-if="monitorViews.length > 0" key="grid">
								<SurveillanceCameraGrid
									:cameras="cameras"
									:views="monitorViews"
									:layout="gridLayout"
									@start-stream="handleStartStream"
									@stop-stream="handleStopStream"
									@remove="handleRemoveView"
								/>
							</div>

							<!-- 提示：如何新增攝影機到監控畫面 -->
							<div
								v-else
								key="empty"
								class="flex h-full min-h-[680px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
							>
								<div>
									<svg
										class="mx-auto mb-4 h-16 w-16 text-white/60"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
									<p class="text-2xl text-white/90 2xl:text-3xl">尚未選擇攝影機</p>
									<p class="mt-2 text-base text-white/70 2xl:text-lg">
										請從右側列表點選攝影機以加入到監控畫面
									</p>
								</div>
							</div>
						</Transition>
					</div>
				</div>
			</section>

			<!-- 右側：攝影機列表（可收縮） -->
			<aside
				:class="[
					'flex flex-col transition-all duration-500 ease-in-out',
					isSidebarCollapsed ? 'flex-[0.05]' : 'flex-[0.8] 2xl:flex-[0.7]'
				]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<div
					class="relative h-full min-w-[72px] overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-white/80 bg-white/30 py-8 transition-all duration-500 ease-in-out 2xl:min-w-[84px]"
				>
					<!-- 標題與收縮按鈕 -->
					<Transition name="fade">
						<div v-if="!isSidebarCollapsed" key="title" class="mb-4 border-b border-white/30 px-4 pb-4">
							<div class="flex items-center justify-center">
								<h2 class="text-2xl font-semibold text-white 2xl:text-3xl">攝影機列表</h2>
								<span
									class="ml-2 rounded-full bg-white/20 px-2.5 py-0.5 text-base font-medium text-white backdrop-blur-sm 2xl:text-lg"
								>
									{{ cameras.length }}
								</span>
							</div>
						</div>
					</Transition>
					<button
						type="button"
						class="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 text-white hover:bg-white/20 2xl:h-12 2xl:w-12"
						@click="isSidebarCollapsed = !isSidebarCollapsed"
						:title="isSidebarCollapsed ? '展開列表' : '收縮列表'"
					>
						<svg
							class="h-6 w-6 2xl:h-7 2xl:w-7"
							:class="{ 'rotate-180': isSidebarCollapsed }"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>

					<!-- 側邊欄內容 -->
					<Transition name="fade">
						<div
							v-if="!isSidebarCollapsed"
							key="content"
							class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4"
						>
							<!-- 攝影機卡片列表 -->
							<div class="space-y-3">
								<div
									v-if="cameras.length === 0"
									class="h-full py-8 text-center text-sm text-white/60 xl:text-base"
								>
									沒有攝影機
								</div>
								<SurveillanceCameraCard
									v-for="camera in cameras"
									:key="camera.id"
									:camera="camera"
									:is-selected="selectedCameraIds.includes(camera.id)"
									@select="handleCameraSelect"
								/>
							</div>

							<!-- RTSP 測試區域 -->
							<div class="border-t border-white/30 pt-4">
								<div class="mb-3">
									<h3 class="text-base font-semibold text-white xl:text-lg 2xl:text-xl">RTSP 測試</h3>
									<p class="mt-1 text-xs text-white/60 xl:text-sm">手動輸入 RTSP URL 進行測試</p>
								</div>

								<div class="space-y-3">
									<!-- RTSP URL 輸入 -->
									<div>
										<label for="test-rtsp-url" class="mb-1 block text-xs text-white/70 xl:text-sm">
											RTSP URL
										</label>
										<input
											id="test-rtsp-url"
											v-model="testRtspUrl"
											type="text"
											placeholder="rtsp://username:password@ip:port/path"
											class="w-full rounded-lg border-2 border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 backdrop-blur-sm transition-all focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 xl:text-base"
										/>
									</div>

									<!-- GPU 編碼選項（簡化：只保留開關） -->
									<div class="rounded-lg border-2 border-white/20 bg-white/5 p-3">
										<label class="flex items-center gap-2 text-xs text-white/80 xl:text-sm">
											<input
												v-model="testGpuOptions.useGpuEncoding"
												type="checkbox"
												class="h-4 w-4 rounded border-white/30 bg-white/10 text-green-500 focus:ring-2 focus:ring-green-400/50"
											/>
											<span>啟用 GPU 編碼（NVIDIA）</span>
										</label>
									</div>

									<!-- 操作按鈕 -->
									<div class="flex gap-2">
										<button
											@click="handleTestStart"
											:disabled="testLoading || !testRtspUrl"
											class="flex-1 rounded-lg border-2 border-green-400/50 bg-green-500/30 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:border-green-400/70 hover:bg-green-500/40 disabled:cursor-not-allowed disabled:opacity-50 xl:text-sm 2xl:text-lg"
										>
											{{ testLoading ? "啟動中..." : "啟動測試" }}
										</button>
										<button
											v-if="testStreamId"
											@click="handleTestStop"
											:disabled="testLoading"
											class="flex-1 rounded-lg border-2 border-red-400/50 bg-red-500/30 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:border-red-400/70 hover:bg-red-500/40 disabled:cursor-not-allowed disabled:opacity-50 xl:text-sm 2xl:text-lg"
										>
											停止
										</button>
									</div>

									<!-- 測試串流資訊 -->
									<div
										v-if="testStreamId"
										class="rounded-lg border-2 border-white/20 bg-white/5 p-3 text-xs text-white/80 xl:text-sm"
									>
										<div class="mb-2 font-semibold text-white">測試串流資訊</div>
										<div class="space-y-1">
											<div>
												<span class="text-white/60">狀態:</span>
												<span
													:class="[
														'ml-2 rounded px-2 py-0.5 text-xs xl:text-sm',
														testStreamStatus === 'running'
															? 'bg-green-500/30 text-green-100'
															: 'bg-red-500/30 text-red-100'
													]"
												>
													{{ testStreamStatus === "running" ? "運行中" : "已停止" }}
												</span>
											</div>
											<div v-if="testStream?.useGpuEncoding" class="flex items-center gap-2">
												<span class="text-white/60">GPU 編碼:</span>
												<span class="ml-2 rounded bg-blue-500/30 px-2 py-0.5 text-xs text-blue-100 xl:text-sm">
													NVIDIA
												</span>
											</div>
											<div v-if="testHlsUrl" class="break-all">
												<span class="text-white/60">HLS URL:</span>
												<span class="ml-2 font-mono text-xs xl:text-sm"
													>{{ testHlsUrl.substring(0, 40) }}...</span
												>
											</div>
										</div>
									</div>

									<!-- 錯誤訊息 -->
									<div
										v-if="testErrorMessage"
										class="rounded-lg border-2 border-red-400/50 bg-red-500/20 p-3 text-xs text-red-100 xl:text-sm"
									>
										<div class="mb-1 font-semibold">錯誤訊息</div>
										<p class="whitespace-pre-line text-xs xl:text-sm">{{ testErrorMessage }}</p>
									</div>
								</div>
							</div>
						</div>
					</Transition>
				</div>
			</aside>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from "vue";
import type { GridLayout, SurveillanceCamera, MonitorView } from "~/types/surveillance";
import { usePolling } from "~/composables/monitoring/usePolling";
import { useToast } from "~/composables/core/useToast";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useStreamStatus } from "~/composables/monitoring/useStreamStatus";
import SurveillanceControlPanel from "~/components/surveillance/SurveillanceControlPanel.vue";
import SurveillanceCameraGrid from "~/components/surveillance/SurveillanceCameraGrid.vue";
import SurveillanceCameraCard from "~/components/surveillance/SurveillanceCameraCard.vue";

const toast = useToast();
const { connect, isConnected } = useWebSocket();
const { handleError } = useErrorHandler();

// 使用統一的串流狀態管理
const streamStatus = useStreamStatus();

// 左側區域參考與高度（用於使右側同高）
const leftSectionRef = ref<HTMLElement | null>(null);
const leftSectionHeight = ref<number | null>(null);

// ResizeObserver 監聽左側高度
let leftSectionResizeObserver: ResizeObserver | null = null;

const updateLeftSectionHeight = () => {
	if (leftSectionRef.value) {
		leftSectionHeight.value = leftSectionRef.value.offsetHeight;
	}
};

const initLeftSectionObserver = () => {
	if (typeof ResizeObserver === "undefined" || !leftSectionRef.value) return;

	// 先設定一次初始高度
	updateLeftSectionHeight();

	// ResizeObserver 會自動監聽所有尺寸變化（內容變化、布局變化等）
	leftSectionResizeObserver = new ResizeObserver(() => {
		updateLeftSectionHeight();
	});
	leftSectionResizeObserver.observe(leftSectionRef.value);
};

// 狀態管理（使用統一的串流狀態管理）
const loadError = ref<string | null>(null);

// 從統一的狀態管理獲取狀態（只讀）
const cameras = computed(() => streamStatus.cameras.value);
const monitorViews = computed(() => streamStatus.monitorViews.value);

// 布局管理
const gridLayout = ref<GridLayout>("1");
const selectedCameraIds = computed(() => monitorViews.value.map(view => view.deviceId));

// 側邊欄收縮狀態
const isSidebarCollapsed = ref(false);

// RTSP 測試功能（使用統一狀態管理）
const testRtspUrl = ref("rtsp://admin:Aa83124007@192.168.2.103:554/Streaming/Channels/101");
const testLoading = ref(false);
const testErrorMessage = ref<string>("");
const testGpuOptions = ref({ useGpuEncoding: true });

// 從統一狀態管理獲取測試串流狀態
const testStream = computed(() => streamStatus.testStream.value);
const testStreamId = computed(() => testStream.value?.streamId || "");
const testHlsUrl = computed(() => testStream.value?.hlsUrl || "");
const testStreamStatus = computed(() => testStream.value?.status || "");

// 計算屬性
const streamingCamerasCount = computed(() => {
	return cameras.value.filter(camera => camera.isStreaming).length;
});

const canStartAll = computed(() => {
	return cameras.value.some(camera => camera.status === "active" && !camera.isStreaming);
});

const canStopAll = computed(() => {
	return cameras.value.some(camera => camera.isStreaming);
});

// 載入攝影機列表（使用統一狀態管理的方法）
const loadCameras = async () => {
	loadError.value = null;

	try {
		await streamStatus.loadCameras();
	} catch (error) {
		const errorMsg = handleError(error, "載入攝影機列表失敗");
		loadError.value = errorMsg || "載入攝影機列表失敗";
	}
};

// 刷新狀態（優化：只在有監控畫面時才刷新）
const refreshStatus = async () => {
	try {
		// 只在有監控畫面時才刷新，避免不必要的請求
		if (monitorViews.value.length === 0) {
			return;
		}

		await streamStatus.loadCameras();
		toast.success("狀態已刷新");
	} catch (error) {
		handleError(error, "刷新狀態失敗");
	}
};

// 處理攝影機選擇（使用統一狀態管理）
const handleCameraSelect = (deviceId: number) => {
	// 檢查是否已經在監控畫面中
	const existing = monitorViews.value.find(v => v.deviceId === deviceId && !v.isTestStream);
	if (existing) {
		// 移除
		streamStatus.removeMonitorView(deviceId);
	} else {
		// 檢查是否已達到最大數量
		const maxViews = parseInt(gridLayout.value);
		if (monitorViews.value.length >= maxViews) {
			toast.warning(`最多只能顯示 ${maxViews} 個畫面`);
			return;
		}

		// 添加到監控畫面
		streamStatus.addMonitorView(deviceId);
	}
};

// 處理移除畫面（使用統一狀態管理）
const handleRemoveView = (deviceId: number) => {
	streamStatus.removeMonitorView(deviceId);
};

// 處理啟動串流（使用統一狀態管理，WebSocket 會自動更新狀態）
const handleStartStream = async (deviceId: number) => {
	try {
		await streamStatus.startStream(deviceId);
		toast.success("串流啟動成功");
		// ✅ 不需要 loadCameras()，WebSocket 事件已自動更新狀態
	} catch (error) {
		handleError(error, "啟動串流失敗");
	}
};

// 處理停止串流（使用統一狀態管理，WebSocket 會自動更新狀態）
const handleStopStream = async (deviceId: number) => {
	try {
		await streamStatus.stopStream(deviceId);
		toast.success("串流已停止");
		// ✅ 不需要 loadCameras()，WebSocket 事件已自動更新狀態
	} catch (error) {
		handleError(error, "停止串流失敗");
	}
};

// 全部啟動（使用統一狀態管理的批量操作方法）
const handleStartAll = async () => {
	const camerasToStart = cameras.value.filter(
		camera => camera.status === "active" && !camera.isStreaming
	);

	if (camerasToStart.length === 0) {
		toast.info("沒有需要啟動的攝影機");
		return;
	}

	try {
		const cameraIds = camerasToStart.map(c => c.id);
		await streamStatus.startAllStreams(cameraIds);
		toast.success(`已啟動 ${camerasToStart.length} 個串流`);
		// ✅ 不需要 loadCameras()，WebSocket 事件已自動更新狀態
	} catch (error) {
		handleError(error, "批量啟動串流時發生錯誤");
	}
};

// 全部停止（使用統一狀態管理的批量操作方法）
const handleStopAll = async () => {
	const camerasToStop = cameras.value.filter(camera => camera.isStreaming);

	if (camerasToStop.length === 0) {
		toast.info("沒有正在運行的串流");
		return;
	}

	try {
		const cameraIds = camerasToStop.map(c => c.id);
		await streamStatus.stopAllStreams(cameraIds);
		toast.success(`已停止 ${camerasToStop.length} 個串流`);
		// ✅ 不需要 loadCameras()，WebSocket 事件已自動更新狀態
	} catch (error) {
		handleError(error, "批量停止串流時發生錯誤");
	}
};

// 監聽布局變化，調整畫面數量
watch(gridLayout, newLayout => {
	const maxViews = parseInt(newLayout);
	if (monitorViews.value.length > maxViews) {
		// 移除超出數量的視圖
		const viewsToRemove = monitorViews.value.slice(maxViews);
		viewsToRemove.forEach(view => {
			streamStatus.removeMonitorView(view.deviceId);
		});
	}
	// ResizeObserver 會自動監聽尺寸變化，無需手動更新
});

// RTSP 測試功能處理（使用統一狀態管理）
const handleTestStart = async () => {
	if (!testRtspUrl.value) {
		testErrorMessage.value = "請輸入 RTSP URL";
		return;
	}

	// 驗證 RTSP URL 格式
	if (!testRtspUrl.value.startsWith("rtsp://")) {
		testErrorMessage.value = "RTSP URL 格式不正確，必須以 rtsp:// 開頭";
		return;
	}

	testLoading.value = true;
	testErrorMessage.value = "";

	try {
		// 簡化：只傳遞 useGpuEncoding 開關
		const gpuOptions = testGpuOptions.value.useGpuEncoding ? { useGpuEncoding: true } : undefined;

		const streamInfo = await streamStatus.startTestStream(testRtspUrl.value, gpuOptions);

		// 將測試串流加入到監控畫面（如果尚未加入）
		const existingTestView = monitorViews.value.find(v => v.isTestStream);

		if (!existingTestView) {
			// 檢查是否已達到最大數量
			const maxViews = parseInt(gridLayout.value);
			if (monitorViews.value.length >= maxViews) {
				toast.warning(`最多只能顯示 ${maxViews} 個畫面，請先移除其他畫面`);
			} else {
				// 添加到監控畫面（使用特殊的 deviceId: -1 表示測試串流）
				// hlsUrl 和 streamId 會通過 syncMonitorViewsWithStreamStatus 自動同步
				streamStatus.addMonitorView({
					deviceId: -1, // 測試串流使用 -1 作為設備 ID
					position: monitorViews.value.length,
					isTestStream: true
				});
				toast.success("測試串流已加入到監控畫面");
			}
		} else {
			toast.success("測試串流已更新");
		}
	} catch (error) {
		const errorMsg = handleError(error, "測試串流啟動失敗");
		testErrorMessage.value = `啟動串流失敗: ${errorMsg || "未知錯誤"}\n\n請檢查：\n1. RTSP URL 是否正確\n2. 攝影機是否可以訪問\n3. 帳號密碼是否正確\n4. MediaMTX 服務是否正常運行（預設端口 9997）\n5. 後端服務是否正常運行`;
	} finally {
		testLoading.value = false;
	}
};

const handleTestStop = async () => {
	if (!testStream.value) {
		return;
	}

	testLoading.value = true;
	testErrorMessage.value = "";

	try {
		await streamStatus.stopTestStream();
		toast.success("測試串流已停止");
	} catch (error) {
		const errorMsg = handleError(error, "停止測試串流失敗");
		testErrorMessage.value = `停止串流失敗: ${errorMsg || "未知錯誤"}`;
	} finally {
		testLoading.value = false;
	}
};

// ✅ 移除手動狀態同步邏輯：monitorViews 現在由 useStreamStatus 統一管理，自動同步
// ✅ 移除測試串流 WebSocket 事件處理：已整合到 useStreamStatus 中

// 清理函數
onBeforeUnmount(() => {
	// 清理統一的狀態管理
	streamStatus.cleanup();

	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value);
		leftSectionResizeObserver.disconnect();
		leftSectionResizeObserver = null;
	}
});

// 初始化
onMounted(async () => {
	// 清除所有 HLS 實例緩存，確保重新整理後使用新實例（避免播放舊內容）
	if (process.client) {
		try {
			const { hlsInstanceManager } = await import("~/utils/hlsInstanceManager");
			hlsInstanceManager.clearAll();
		} catch (err) {
			console.warn("[Surveillance] 清除 HLS 實例緩存失敗:", err);
		}
	}

	// 初始化左側 ResizeObserver
	initLeftSectionObserver();

	// 建立 WebSocket 連接
	connect();

	// 初始化統一的狀態管理（會自動設置 WebSocket 事件監聽器，包括測試串流）
	streamStatus.init();

	try {
		await loadCameras();
		// ResizeObserver 會自動監聽尺寸變化，initLeftSectionObserver 已設定初始高度
	} catch (error) {
		handleError(error, "初始化失敗");
	}

	// 使用 usePolling 統一管理輪詢（作為 WebSocket 的備用機制）
	// 只在有監控畫面時才刷新，且 WebSocket 未連接時才使用
	const { start: startPolling } = usePolling({
		callback: async () => {
			if (monitorViews.value.length > 0 && !isConnected.value) {
				await refreshStatus();
			}
		},
		interval: 60000, // 60 秒
		immediate: false, // 不在啟動時立即執行
		enabled: () => monitorViews.value.length > 0 && !isConnected.value, // 只在有監控畫面且 WebSocket 未連接時執行
		onError: err => {
			handleError(err, "刷新狀態失敗");
		}
	});

	startPolling();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
