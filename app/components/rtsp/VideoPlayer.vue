<template>
	<div class="video-player-container">
		<!-- 始終渲染 video 元素，即使 loading 或 error 時也保留，這樣 ref 才能正確綁定 -->
		<div v-if="hlsUrl || props.hlsUrl" class="relative w-full h-full">
			<video
				ref="videoElement"
				:key="`video-${streamId || props.streamId || 'default'}`"
				class="w-full h-full object-contain"
				controls
				autoplay
				muted
				playsinline
				preload="auto"
				:playsinline="true"
			>
				您的瀏覽器不支援視頻播放
			</video>
			<!-- 加載遮罩 -->
			<div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
				<div class="text-center text-white">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
					<p>正在啟動串流...</p>
				</div>
			</div>
			<!-- 錯誤遮罩 -->
			<div v-else-if="error" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
				<div class="text-center text-red-400">
					<p class="mb-2">{{ error }}</p>
					<button @click="retry" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">重試</button>
				</div>
			</div>
			<!-- 播放按鈕 -->
			<div v-else-if="!isPlaying && !loading" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
				<button @click="play" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg">播放</button>
			</div>
		</div>

		<!-- 沒有 HLS URL 時的初始狀態 -->
		<div v-else class="flex items-center justify-center h-full">
			<div v-if="loading" class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
				<p class="text-gray-600">正在啟動串流...</p>
			</div>
			<div v-else-if="error" class="text-center text-red-600">
				<p class="mb-2">{{ error }}</p>
				<button @click="retry" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">重試</button>
			</div>
			<div v-else class="text-gray-500">
				<p>請提供 RTSP URL 以開始串流</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	rtspUrl?: string;
	autoStart?: boolean;
	hlsUrl?: string; // 直接提供 HLS URL，跳過啟動串流步驟
	streamId?: string; // 串流 ID
}

const props = withDefaults(defineProps<Props>(), {
	rtspUrl: "",
	autoStart: true,
	hlsUrl: "",
	streamId: ""
});

const rtspApi = useRtspApi();
const config = useRuntimeConfig();

const videoElement = ref<HTMLVideoElement | null>(null);
const hlsUrl = ref<string>("");
const streamId = ref<string>("");
const loading = ref(false);
const error = ref<string>("");
const isPlaying = ref(false);
const hls = ref<any>(null);

// 構建完整的 HLS URL
const getFullHlsUrl = (relativeUrl: string): string => {
	const apiBase = config.public.apiBase || "http://localhost:4000/api";
	const baseUrl = apiBase.replace("/api", "");
	return `${baseUrl}${relativeUrl}`;
};

// 等待 video 元素渲染
const waitForVideoElement = async (maxAttempts = 20, delay = 100): Promise<boolean> => {
	for (let i = 0; i < maxAttempts; i++) {
		await nextTick();
		if (videoElement.value) {
			// 檢查元素是否在 DOM 中
			if (videoElement.value.parentElement || document.body.contains(videoElement.value)) {
				console.log(`video 元素在第 ${i + 1} 次嘗試後找到`);
				return true;
			}
		}
		if (i < maxAttempts - 1) {
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	console.warn(`video 元素在 ${maxAttempts} 次嘗試後仍未找到`);
	return false;
};

// 啟動串流
const startStream = async () => {
	// 如果已經提供了 HLS URL，直接使用（不重新啟動串流）
	if (props.hlsUrl) {
		// 檢查是否已經初始化過相同的 HLS URL
		if (hlsUrl.value === getFullHlsUrl(props.hlsUrl)) {
			console.log("HLS URL 未變化，跳過重新初始化");
			return;
		}

		streamId.value = props.streamId || "";
		const fullHlsUrl = getFullHlsUrl(props.hlsUrl);

		// 先設置 hlsUrl，這樣 video 元素會立即渲染
		hlsUrl.value = fullHlsUrl;
		error.value = "";
		loading.value = true;

		try {
			// 使用 nextTick 確保 Vue 有機會處理響應式更新
			await nextTick();

			// 等待 video 元素渲染（因為 hlsUrl 變化會觸發模板重新渲染）
			console.log("等待 video 元素渲染...");
			const elementReady = await waitForVideoElement(20, 100);

			if (!elementReady) {
				// 最後一次嘗試：直接檢查 DOM
				await new Promise((resolve) => setTimeout(resolve, 500));
				if (!videoElement.value) {
					throw new Error("video 元素未能及時渲染，請刷新頁面重試");
				}
			}

			console.log("video 元素已準備好，等待 HLS 文件生成...");
			// 等待一小段時間讓 HLS 文件生成（低延遲模式，只需等待 1-2 秒）
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// 初始化 HLS 播放器
			await initHlsPlayer();
		} catch (err) {
			error.value = err instanceof Error ? err.message : "初始化播放器失敗";
			console.error("初始化播放器錯誤:", err);
		} finally {
			loading.value = false;
		}
		return;
	}

	// 否則，使用 RTSP URL 啟動新串流
	if (!props.rtspUrl) {
		error.value = "請提供 RTSP URL";
		return;
	}

	loading.value = true;
	error.value = "";

	try {
		const streamInfo = await rtspApi.startStream(props.rtspUrl);
		streamId.value = streamInfo.streamId;
		hlsUrl.value = getFullHlsUrl(streamInfo.hlsUrl);

		// 等待一小段時間讓 HLS 文件生成
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// 初始化 HLS 播放器
		await initHlsPlayer();
	} catch (err) {
		error.value = err instanceof Error ? err.message : "啟動串流失敗";
		console.error("啟動串流錯誤:", err);
	} finally {
		loading.value = false;
	}
};

// 初始化 HLS 播放器
const initHlsPlayer = async () => {
	if (!process.client || !hlsUrl.value) {
		console.warn("初始化 HLS 播放器失敗: 不在客戶端或缺少 HLS URL");
		return;
	}

	// 確保 video 元素存在且已掛載到 DOM
	if (!videoElement.value) {
		console.warn("初始化 HLS 播放器失敗: video 元素不存在");
		return;
	}

	if (!videoElement.value.parentElement) {
		console.warn("初始化 HLS 播放器失敗: video 元素未掛載到 DOM");
		// 等待一下再試
		await new Promise((resolve) => setTimeout(resolve, 200));
		if (!videoElement.value || !videoElement.value.parentElement) {
			console.error("video 元素仍未掛載到 DOM");
			return;
		}
	}

	// 清理現有的 HLS 實例
	if (hls.value) {
		try {
			hls.value.destroy();
		} catch (err) {
			console.warn("清理 HLS 實例時出錯:", err);
		}
		hls.value = null;
	}

	// 動態導入 hls.js
	const HlsModule = await import("hls.js");
	const Hls = HlsModule.default;

	// 檢查瀏覽器是否原生支持 HLS
	if (videoElement.value.canPlayType("application/vnd.apple.mpegurl")) {
		// Safari 原生支持
		console.log("使用 Safari 原生 HLS 支持，URL:", hlsUrl.value);
		videoElement.value.src = hlsUrl.value;
		videoElement.value.addEventListener("loadedmetadata", () => {
			console.log("視頻元數據已加載");
			isPlaying.value = true;
			// 確保 video 元素仍然存在且已附加到 DOM
			if (videoElement.value && videoElement.value.parentElement) {
				// 使用 setTimeout 確保播放請求在 DOM 更新後執行
				setTimeout(() => {
					if (videoElement.value && videoElement.value.parentElement) {
						videoElement.value.play().catch((err) => {
							if (err.name !== "AbortError") {
								console.warn("自動播放被阻止，需要用戶手動點擊:", err);
							}
						});
					}
				}, 100);
			}
		});
		videoElement.value.addEventListener("error", (e) => {
			console.error("視頻加載錯誤:", e);
			const videoError = videoElement.value?.error;
			if (videoError) {
				let errorMessage = "視頻加載失敗";
				switch (videoError.code) {
					case videoError.MEDIA_ERR_ABORTED:
						errorMessage = "視頻加載被中止";
						break;
					case videoError.MEDIA_ERR_NETWORK:
						errorMessage = "網路錯誤，無法加載視頻";
						break;
					case videoError.MEDIA_ERR_DECODE:
						errorMessage = "視頻解碼錯誤";
						break;
					case videoError.MEDIA_ERR_SRC_NOT_SUPPORTED:
						errorMessage = "視頻格式不支持或 HLS URL 無效";
						break;
				}
				console.error("視頻錯誤詳情:", {
					code: videoError.code,
					message: videoError.message,
					errorMessage
				});
				error.value = errorMessage;
			} else {
				error.value = "視頻加載失敗，請檢查 HLS URL 或稍後重試";
			}
		});
	} else if (Hls.isSupported()) {
		// 使用 hls.js 支持其他瀏覽器，配置為低延遲模式
		hls.value = new Hls({
			enableWorker: true,
			lowLatencyMode: true,
			backBufferLength: 0, // 禁用後緩衝以降低延遲
			maxBufferLength: 3, // 最大緩衝長度 3 秒
			maxMaxBufferLength: 5, // 最大緩衝上限 5 秒
			maxBufferSize: 3 * 1000 * 1000, // 最大緩衝大小 3MB
			maxBufferHole: 0.5, // 允許的最大緩衝空洞
			highBufferWatchdogPeriod: 1, // 高緩衝監控週期
			nudgeOffset: 0.1, // 調整偏移
			nudgeMaxRetry: 3, // 最大重試次數
			maxFragLoadingTimeOut: 2000, // 片段加載超時 2 秒
			fragLoadingTimeOut: 2000, // 片段加載超時
			manifestLoadingTimeOut: 2000, // 清單加載超時
			levelLoadingTimeOut: 2000 // 級別加載超時
		});

		hls.value.loadSource(hlsUrl.value);
		hls.value.attachMedia(videoElement.value);

		hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
			console.log("HLS manifest 已解析，準備播放");
			isPlaying.value = true;
			// 確保 video 元素仍然存在且已附加到 DOM
			if (videoElement.value && videoElement.value.parentElement) {
				// 使用 setTimeout 確保播放請求在 DOM 更新後執行
				setTimeout(() => {
					if (videoElement.value && videoElement.value.parentElement) {
						videoElement.value.play().catch((err) => {
							if (err.name !== "AbortError") {
								console.warn("自動播放被阻止，需要用戶手動點擊:", err);
							}
						});
					}
				}, 100);
			}
		});

		hls.value.on(Hls.Events.ERROR, (event: any, data: any) => {
			console.error("HLS 錯誤:", data);
			if (data.fatal) {
				switch (data.type) {
					case Hls.ErrorTypes.NETWORK_ERROR:
						console.error("網路錯誤，嘗試恢復...");
						hls.value?.startLoad();
						break;
					case Hls.ErrorTypes.MEDIA_ERROR:
						console.error("媒體錯誤，嘗試恢復...");
						hls.value?.recoverMediaError();
						break;
					default:
						console.error("無法恢復的錯誤");
						error.value = "播放錯誤，請重試";
						hls.value?.destroy();
						break;
				}
			}
		});
	} else {
		error.value = "您的瀏覽器不支援 HLS 播放";
	}
};

// 播放視頻
const play = () => {
	if (videoElement.value) {
		videoElement.value.play().catch((err) => {
			console.error("播放失敗:", err);
			error.value = "無法播放視頻";
		});
	}
};

// 重試
const retry = () => {
	error.value = "";
	startStream();
};

// 停止串流
const stopStream = async () => {
	// 先停止播放，避免 AbortError
	if (videoElement.value) {
		try {
			videoElement.value.pause();
			videoElement.value.src = "";
			videoElement.value.load(); // 重置視頻元素
		} catch (err) {
			console.warn("停止播放時出錯:", err);
		}
	}

	if (hls.value) {
		try {
			hls.value.destroy();
		} catch (err) {
			console.warn("銷毀 HLS 實例時出錯:", err);
		}
		hls.value = null;
	}

	// 只有在不是從外部提供 streamId 時才調用 API 停止
	if (streamId.value && !props.streamId) {
		try {
			await rtspApi.stopStream(streamId.value);
		} catch (err) {
			console.error("停止串流錯誤:", err);
		}
	}

	// 只有在不是從外部提供時才清空
	if (!props.hlsUrl) {
		hlsUrl.value = "";
	}
	if (!props.streamId) {
		streamId.value = "";
	}
	isPlaying.value = false;
};

// 監聽 HLS URL 變化（從外部提供時）
watch(
	() => props.hlsUrl,
	(newHlsUrl, oldHlsUrl) => {
		// 只在 HLS URL 真正變化且不為空時才初始化
		if (newHlsUrl && newHlsUrl !== oldHlsUrl && process.client) {
			console.log("HLS URL 變化，準備初始化播放器:", newHlsUrl);
			// 直接調用 startStream，它會等待 video 元素渲染
			startStream();
		}
	}
);

// 監聽 video 元素 ref 的變化，當元素被創建時自動初始化（作為備用機制）
watch(
	() => videoElement.value,
	(newElement, oldElement) => {
		// 當 video 元素從無到有被創建，且 HLS URL 已設置，但 HLS 實例還未創建時
		if (newElement && !oldElement && (props.hlsUrl || hlsUrl.value) && !hls.value && !loading.value) {
			console.log("video 元素已創建（通過 watch），嘗試初始化播放器");
			// 延遲一下確保元素完全掛載
			setTimeout(async () => {
				if (videoElement.value && videoElement.value.parentElement && (props.hlsUrl || hlsUrl.value)) {
					await initHlsPlayer();
				}
			}, 500);
		}
	}
);

// 監聽 RTSP URL 變化
watch(
	() => props.rtspUrl,
	(newRtspUrl, oldRtspUrl) => {
		if (newRtspUrl && newRtspUrl !== oldRtspUrl && !props.hlsUrl) {
			stopStream();
			nextTick(() => {
				startStream();
			});
		}
	}
);

// 自動啟動
onMounted(() => {
	if (props.autoStart && (props.rtspUrl || props.hlsUrl)) {
		nextTick(() => {
			startStream();
		});
	}
});

// 清理
onUnmounted(() => {
	stopStream();
});

// 暴露方法給父組件
defineExpose({
	startStream,
	stopStream,
	play
});
</script>

<style scoped>
.video-player-container {
	width: 100%;
	height: 100%;
	min-height: 400px;
	background-color: #000;
	border-radius: 8px;
	overflow: hidden;
}
</style>
