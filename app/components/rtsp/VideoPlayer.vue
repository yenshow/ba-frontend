<template>
	<div class="video-player-container">
		<!-- 始終渲染 video 元素，即使 loading 或 error 時也保留，這樣 ref 才能正確綁定 -->
		<div v-if="hlsUrl || props.hlsUrl" class="relative h-full w-full">
			<video
				ref="videoElement"
				:key="`video-${streamId || props.streamId || 'default'}`"
				class="h-full w-full object-contain"
				autoplay
				muted
				playsinline
				webkit-playsinline
				preload="metadata"
				disablePictureInPicture
				controlsList="nodownload nofullscreen noremoteplayback"
				style="transform: translateZ(0); -webkit-transform: translateZ(0)"
			>
				您的瀏覽器不支援視頻播放
			</video>
			<!-- 加載遮罩 -->
			<div
				v-if="loading"
				class="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-75"
			>
				<div class="text-center text-white">
					<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
					<p>正在啟動串流...</p>
				</div>
			</div>
			<!-- 錯誤遮罩 -->
			<div
				v-else-if="error"
				class="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-90 p-4"
			>
				<div class="max-w-2xl text-center text-red-400">
					<p class="mb-4 whitespace-pre-line text-sm 2xl:text-base">{{ error }}</p>
					<div class="flex justify-center gap-3">
						<button @click="retry" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
							重試
						</button>
						<button
							@click="stopStream"
							class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
						>
							停止
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- 沒有 HLS URL 時的初始狀態 -->
		<div v-else class="flex h-full items-center justify-center">
			<div v-if="loading" class="text-center">
				<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
				<p class="text-gray-600">正在啟動串流...</p>
			</div>
			<div v-else-if="error" class="mx-auto max-w-2xl text-center text-red-600">
				<p class="mb-4 whitespace-pre-line text-sm 2xl:text-base">{{ error }}</p>
				<div class="flex justify-center gap-3">
					<button @click="retry" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
						重試
					</button>
					<button @click="stopStream" class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
						停止
					</button>
				</div>
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
const hls = ref<any>(null);

// HLS 播放器配置常量（極低延遲優化 - 目標 < 0.5 秒）
const HLS_PLAYER_CONFIG = {
	maxBufferLength: 0.3, // 最大緩衝 0.3 秒（極低延遲）
	maxMaxBufferLength: 0.6, // 最大緩衝上限 0.6 秒
	backBufferLength: 0, // 禁用後緩衝
	maxBufferSize: 600 * 1000, // 最大緩衝大小 600KB（減少緩衝以降低延遲）
	fragLoadingTimeOut: 1000, // 片段加載超時 1 秒
	manifestLoadingTimeOut: 300, // 清單加載超時 0.3 秒
	levelLoadingTimeOut: 1000 // 級別加載超時 1 秒
};

// 錯誤訊息模板
const ERROR_MESSAGES = {
	HLS_NOT_READY: (hlsUrl: string, streamId: string) => `HLS 串流文件生成失敗

可能原因：
1. MediaMTX 服務未正常運行（請檢查 MediaMTX 服務狀態）
2. RTSP URL 無法連接（請確認攝影機可訪問且路徑正確）
3. 攝影機帳號密碼錯誤
4. 網路連線問題

HLS URL: ${hlsUrl}
Stream ID: ${streamId}`
};

// 構建完整的 HLS URL
// MediaMTX 提供的 HLS URL 可能是完整 URL 或相對路徑
const getFullHlsUrl = (url: string): string => {
	// 如果已經是完整 URL（包含 http:// 或 https://），直接返回
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}
	// 否則，假設是 MediaMTX 的 HLS 服務（預設在 8888 端口）
	// 從環境變數或配置中獲取 MediaMTX HLS 基礎 URL
	const mediamtxHlsBase = config.public.mediamtxHlsUrl || "http://localhost:8888";
	// 移除開頭的斜線（如果有的話）
	const cleanUrl = url.startsWith("/") ? url.substring(1) : url;
	return `${mediamtxHlsBase}/${cleanUrl}`;
};

// 驗證 HLS URL 是否可訪問（優化：快速檢查，減少等待時間）
// MediaMTX 需要時間生成 HLS 文件，特別是第一個片段
const checkHlsUrlAvailable = async (
	url: string,
	maxRetries = 8, // 適中的重試次數（平衡等待時間和成功率）
	delay = 300 // 減少延遲，加快響應（MediaMTX 配置優化後生成更快）
): Promise<boolean> => {
	for (let i = 0; i < maxRetries; i++) {
		try {
			const response = await fetch(url, {
				method: "GET", // 使用 GET 請求以獲取完整響應
				mode: "cors",
				cache: "no-cache",
				credentials: "omit"
			});

			if (response.ok) {
				const contentType = response.headers.get("Content-Type");
				// 檢查是否為 HLS 播放列表（主播放列表或媒體播放列表）
				if (
					contentType?.includes("application/vnd.apple.mpegurl") ||
					contentType?.includes("application/x-mpegURL") ||
					contentType?.includes("text/plain")
				) {
					// 驗證內容是否包含 HLS 標記
					const text = await response.text();
					if (text.includes("#EXTM3U") || text.includes("#EXT-X")) {
						return true;
					}
				}
			}
		} catch (err) {
			// 只在最後一次失敗時記錄
			if (i === maxRetries - 1) {
				console.error("HLS URL 驗證失敗:", err);
			}
		}

		if (i < maxRetries - 1) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	return false;
};

// 自動播放（實時流：立即播放）
const handleAutoPlay = () => {
	videoElement.value?.play().catch(() => {
		// 靜默處理自動播放失敗（瀏覽器策略）
	});
};

// 等待 video 元素渲染（優化：快速檢查）
const waitForVideoElement = async (maxAttempts = 3, delay = 50): Promise<boolean> => {
	for (let i = 0; i < maxAttempts; i++) {
		await nextTick();
		if (videoElement.value?.parentElement) return true;
		if (i < maxAttempts - 1) await new Promise(resolve => setTimeout(resolve, delay));
	}
	return false;
};

// 啟動串流
const startStream = async () => {
	// 如果已經提供了 HLS URL，直接使用（不重新啟動串流）
	if (props.hlsUrl) {
		// 檢查是否已經初始化過相同的 HLS URL
		if (hlsUrl.value === getFullHlsUrl(props.hlsUrl)) return;

		streamId.value = props.streamId || "";
		const fullHlsUrl = getFullHlsUrl(props.hlsUrl);
		hlsUrl.value = fullHlsUrl;
		error.value = "";
		loading.value = true;

		try {
			await nextTick();
			if (!videoElement.value?.parentElement) {
				await waitForVideoElement(3, 50);
			}

			// 驗證 HLS URL（優化後減少等待時間）
			const urlAvailable = await checkHlsUrlAvailable(fullHlsUrl, 8, 300);
			if (!urlAvailable) {
				error.value = ERROR_MESSAGES.HLS_NOT_READY(fullHlsUrl, streamId.value);
				return;
			}

			await initHlsPlayer();
		} catch (err) {
			error.value = err instanceof Error ? err.message : "初始化播放器失敗";
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
		const fullHlsUrl = getFullHlsUrl(streamInfo.hlsUrl);
		hlsUrl.value = fullHlsUrl;

		// 驗證 HLS URL（優化後減少等待時間）
		const urlAvailable = await checkHlsUrlAvailable(fullHlsUrl, 8, 300);
		if (!urlAvailable) {
			error.value = ERROR_MESSAGES.HLS_NOT_READY(fullHlsUrl, streamInfo.streamId);
			return;
		}

		await initHlsPlayer();
	} catch (err) {
		error.value = err instanceof Error ? err.message : "啟動串流失敗";
	} finally {
		loading.value = false;
	}
};

// 初始化 HLS 播放器（優化：減少檢查和等待）
const initHlsPlayer = async () => {
	if (!process.client || !hlsUrl.value || !videoElement.value) return;

	if (!videoElement.value.parentElement) {
		await new Promise(resolve => setTimeout(resolve, 50));
		if (!videoElement.value?.parentElement) return;
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
	const useNativeHls = videoElement.value.canPlayType("application/vnd.apple.mpegurl");
	const useHlsJs = Hls.isSupported();

	// 使用 hls.js 設置播放器
	const setupHlsJsPlayer = () => {
		if (!videoElement.value || !hlsUrl.value) return;

		// 使用 hls.js 極低延遲配置（優化畫面載入速度）
		hls.value = new Hls({
			enableWorker: true,
			lowLatencyMode: true, // 啟用低延遲模式
			backBufferLength: HLS_PLAYER_CONFIG.backBufferLength,
			maxBufferLength: HLS_PLAYER_CONFIG.maxBufferLength,
			maxMaxBufferLength: HLS_PLAYER_CONFIG.maxMaxBufferLength,
			maxBufferSize: HLS_PLAYER_CONFIG.maxBufferSize,
			maxBufferHole: 0.01, // 極小緩衝空洞（極低延遲）
			highBufferWatchdogPeriod: 0.1, // 更頻繁的緩衝監控（每 0.1 秒檢查一次）
			nudgeOffset: 0.001, // 極小調整偏移
			nudgeMaxRetry: 1, // 最少重試
			fragLoadingTimeOut: HLS_PLAYER_CONFIG.fragLoadingTimeOut,
			manifestLoadingTimeOut: HLS_PLAYER_CONFIG.manifestLoadingTimeOut,
			levelLoadingTimeOut: HLS_PLAYER_CONFIG.levelLoadingTimeOut,
			startLevel: -1, // 自動選擇最佳品質
			liveSyncDurationCount: 0.3, // 極低延遲：只等待 0.3 個片段就開始播放（約 0.06 秒）
			liveMaxLatencyDurationCount: 1.0, // 最大延遲：1.0 個片段（約 0.2 秒）
			liveDurationInfinity: false // 不使用無限持續時間
		});

		hls.value.loadSource(hlsUrl.value);
		hls.value.attachMedia(videoElement.value);

		let retryCount = 0;
		const maxRetries = 8; // 適中的重試次數（MediaMTX 配置優化後生成更快）

		hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
			console.log("[HLS] 播放列表解析完成，立即開始播放");
			handleAutoPlay();
			retryCount = 0;
			loading.value = false; // 提前結束載入狀態
		});

		// 監聽第一個片段加載完成，立即開始播放
		hls.value.on(Hls.Events.FRAG_LOADED, () => {
			if (loading.value) {
				console.log("[HLS] 第一個片段加載完成，開始播放");
				loading.value = false;
				handleAutoPlay();
			}
		});

		hls.value.on(Hls.Events.ERROR, (event: any, data: any) => {
			if (data.fatal) {
				switch (data.type) {
					case Hls.ErrorTypes.NETWORK_ERROR:
						const isManifestError =
							data.details === "manifestLoadError" ||
							data.response?.code === 404 ||
							data.response?.code === 500 ||
							data.frag?.url?.includes("playlist.m3u8");

						if (isManifestError && retryCount < maxRetries) {
							retryCount++;
							setTimeout(() => {
								if (hls.value && hlsUrl.value) {
									hls.value.loadSource(hlsUrl.value);
									hls.value.startLoad();
								}
							}, 300); // 優化後的重試延遲（MediaMTX 配置優化後生成更快）
						} else if (isManifestError) {
							error.value = "HLS 串流文件尚未就緒，請檢查後端服務或稍後重試";
							hls.value?.destroy();
						} else {
							hls.value?.startLoad();
						}
						break;
					case Hls.ErrorTypes.MEDIA_ERROR:
						hls.value?.recoverMediaError();
						break;
					default:
						error.value = "播放錯誤，請重試";
						hls.value?.destroy();
						break;
				}
			}
		});
	};

	if (useNativeHls) {
		// Safari 原生支持 - 驗證 HLS URL（優化後減少等待時間）
		const urlAvailable = await checkHlsUrlAvailable(hlsUrl.value, 8, 300);

		if (!urlAvailable && useHlsJs) {
			setupHlsJsPlayer();
			return;
		} else if (!urlAvailable) {
			error.value = "HLS URL 不可訪問，且瀏覽器不支持 hls.js";
			return;
		}

		// 設置錯誤處理器
		const errorHandler = (e: Event) => {
			const videoError = videoElement.value?.error;
			if (!videoError) {
				error.value = "視頻加載失敗";
				return;
			}

			// 解碼或格式錯誤時回退到 hls.js
			if (
				(videoError.code === videoError.MEDIA_ERR_DECODE ||
					videoError.code === videoError.MEDIA_ERR_SRC_NOT_SUPPORTED) &&
				useHlsJs &&
				videoElement.value
			) {
				videoElement.value.removeEventListener("error", errorHandler);
				videoElement.value.removeEventListener("loadedmetadata", loadedHandler);
				videoElement.value.src = "";
				videoElement.value.load();
				setTimeout(() => {
					if (videoElement.value && hlsUrl.value) {
						setupHlsJsPlayer();
					}
				}, 50); // 減少等待時間
				return;
			}

			error.value = "視頻加載失敗";
		};

		const loadedHandler = () => {
			handleAutoPlay();
		};

		videoElement.value.addEventListener("loadedmetadata", loadedHandler);
		videoElement.value.addEventListener("error", errorHandler);
		videoElement.value.src = hlsUrl.value;
	} else if (useHlsJs) {
		setupHlsJsPlayer();
	} else {
		error.value = "您的瀏覽器不支援 HLS 播放";
	}
};

// 實時流：自動播放，無需手動播放功能

// 重試
const retry = () => {
	error.value = "";
	startStream();
};

// 停止串流（實時流：直接停止，無需暫停）
const stopStream = async () => {
	// 實時流：直接停止，無需暫停
	if (videoElement.value) {
		try {
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
};

// 監聽 HLS URL 變化
watch(
	() => props.hlsUrl,
	(newHlsUrl, oldHlsUrl) => {
		if (newHlsUrl && newHlsUrl !== oldHlsUrl && process.client) {
			startStream();
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
		startStream();
	}
});

// 清理
onUnmounted(() => {
	stopStream();
});

// 暴露方法給父組件（實時流：只暴露啟動和停止）
defineExpose({
	startStream,
	stopStream
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

/* 啟用 GPU 硬體加速（解碼和渲染） */
video {
	transform: translateZ(0);
	-webkit-transform: translateZ(0);
	will-change: contents;
	-webkit-backface-visibility: hidden;
	backface-visibility: hidden;
}
</style>
