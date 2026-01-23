<template>
	<div class="video-player-container">
		<!-- 始終渲染 video 元素，即使 loading 或 error 時也保留，這樣 ref 才能正確綁定 -->
		<div v-if="hlsUrl || props.hlsUrl" class="relative h-full w-full">
			<video
				ref="videoElement"
				:key="`video-${streamId || props.streamId || 'default'}`"
				class="h-full w-full"
				autoplay
				muted
				playsinline
				webkit-playsinline
				preload="metadata"
				disablePictureInPicture
				controlsList="nodownload nofullscreen noremoteplayback"
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
import {
	getErrorType,
	getErrorMessage,
	getErrorRecoveryStrategy,
	type StreamErrorType
} from "~/utils/streamErrorUtils";
import { hlsInstanceManager } from "~/utils/hlsInstanceManager";
import { useRtspApi } from "~/composables/systems/useRtsp";

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

// HLS 延遲監測
const hlsLatency = ref<number>(0); // HLS 播放延遲（秒）
const latencyCheckInterval = ref<ReturnType<typeof setInterval> | null>(null);

// 延遲監控配置
const TARGET_LATENCY = 1.5; // 目標延遲：1.5 秒
const MAX_LATENCY = 3.0; // 最大允許延遲：3 秒
const MIN_LATENCY = 0.5; // 最小允許延遲：0.5 秒
const CHECK_INTERVAL = 5000; // 檢查間隔：5 秒

// HLS 播放器配置常量（極低延遲優化 - 目標 < 0.3 秒）
const HLS_PLAYER_CONFIG = {
	maxBufferLength: 0.2, // 最大緩衝 0.2 秒（極低延遲）
	maxMaxBufferLength: 0.4, // 最大緩衝上限 0.4 秒
	backBufferLength: 0, // 禁用後緩衝
	maxBufferSize: 400 * 1000, // 最大緩衝大小 400KB（減少緩衝以降低延遲）
	fragLoadingTimeOut: 800, // 片段加載超時 0.8 秒
	manifestLoadingTimeOut: 200, // 清單加載超時 0.2 秒
	levelLoadingTimeOut: 800 // 級別加載超時 0.8 秒
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
		const fullHlsUrl = getFullHlsUrl(props.hlsUrl);

		// 重要：如果 URL 不同，先完全停止當前串流，確保清理舊實例
		// 這樣可以避免重用舊緩存，確保從最新時間點開始
		if (hlsUrl.value && hlsUrl.value !== fullHlsUrl) {
			// URL 改變，先停止當前串流（清理舊實例）
			await stopStream();
			await nextTick(); // 等待清理完成
		} else if (hlsUrl.value === fullHlsUrl && hls.value) {
			// 如果 URL 相同且已有實例，可能是重複啟動，直接返回
			return;
		}

		streamId.value = props.streamId || "";
		hlsUrl.value = fullHlsUrl;
		error.value = "";
		loading.value = true;

		try {
			// 對於外部提供的 hlsUrl，跳過 URL 檢查，直接讓 HLS.js 處理（它有自己的重試機制）
			// MediaMTX 可能需要時間生成文件，HLS.js 會自動重試
			await nextTick();
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
		// ⭐ 關鍵：如果已有播放器實例，先完全停止並清理（確保重新啟動時從最新片段開始）
		if (hls.value || hlsUrl.value) {
			// 停止當前播放器（但不調用後端 API，因為我們即將重新啟動）
			if (hls.value) {
				try {
					hls.value.stopLoad();
					if (videoElement.value) {
						hls.value.detachMedia();
					}
					const originalUrl = (hls.value as any)?._originalUrl || hlsUrl.value;
					if (originalUrl && videoElement.value) {
						hlsInstanceManager.releaseInstance(originalUrl, videoElement.value);
					} else {
						hls.value.destroy();
					}
				} catch (err) {
					console.warn("[VideoPlayer] 清理舊播放器時出錯:", err);
				}
				hls.value = null;
			}
			
			// 清理視頻元素
			if (videoElement.value) {
				try {
					videoElement.value.pause();
					videoElement.value.src = "";
					videoElement.value.load();
				} catch (err) {
					console.warn("[VideoPlayer] 清理視頻元素時出錯:", err);
				}
			}
			
			// 清空 URL（強制重新初始化）
			hlsUrl.value = "";
			await nextTick(); // 等待清理完成
		}

		const streamInfo = await rtspApi.startStream(props.rtspUrl);
		streamId.value = streamInfo.streamId;
		const fullHlsUrl = getFullHlsUrl(streamInfo.hlsUrl);
		hlsUrl.value = fullHlsUrl;

		// ⭐ 關鍵：等待一小段時間（1 秒），讓 MediaMTX 生成新片段
		// 如果後端使用了新路徑名稱，這個等待可以縮短
		// 前端會強制跳轉到最新片段，延遲監控會自動修正任何殘留延遲
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// 跳過 URL 檢查，直接讓 HLS.js 處理（它有自己的重試機制）
		// MediaMTX 可能需要時間生成文件，HLS.js 會自動重試
		await initHlsPlayer();
	} catch (err) {
		error.value = err instanceof Error ? err.message : "啟動串流失敗";
	} finally {
		loading.value = false;
	}
};

// 初始化 HLS 播放器
const initHlsPlayer = async () => {
	if (!process.client || !hlsUrl.value || !videoElement.value) return;

	// 等待 video 元素完全掛載
	if (!videoElement.value.parentElement) {
		await waitForVideoElement(3, 50);
		if (!videoElement.value?.parentElement) return;
	}

	// 清理現有的 HLS 實例（如果之前有使用管理器，先釋放）
	if (hls.value && hlsUrl.value) {
		try {
			hlsInstanceManager.releaseInstance(hlsUrl.value, videoElement.value);
		} catch (err) {
			console.warn("釋放 HLS 實例時出錯:", err);
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

		// HLS 配置
		const hlsConfig = {
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
			liveSyncDurationCount: 0.1, // 極低延遲：只等待 0.1 個片段就開始播放（約 0.02 秒）
			liveMaxLatencyDurationCount: 0.5, // 最大延遲：0.5 個片段（約 0.1 秒）
			liveDurationInfinity: false, // 不使用無限持續時間
			liveBackBufferLength: 0, // 禁用直播後緩衝，確保總是播放最新內容
			maxLiveSyncPlaybackRate: 1.5 // 允許稍微加速播放以追上直播
		};

		// 後端已統一生成帶時間戳的 URL，無需前端再次添加緩存破壞參數
		// 清理可能存在的舊實例（確保每次啟動都創建新實例）
		if (process.client) {
			const originalUrl = hlsUrl.value.split("?")[0];
			try {
				hlsInstanceManager.clearInstancesByUrl(originalUrl);
			} catch {
				// 靜默處理錯誤，不影響新實例創建
			}
		}

		// 創建新的 HLS 實例（直接使用後端返回的 URL，已包含時間戳）
		hls.value = hlsInstanceManager.getOrCreateInstance(
			hlsUrl.value,
			Hls,
			hlsConfig,
			videoElement.value
		);

		// 存儲原始 URL 以便後續釋放
		(hls.value as any)._originalUrl = hlsUrl.value;

		// 直接使用後端返回的 URL（已包含時間戳參數）
		if (hls.value) {
			hls.value.loadSource(hlsUrl.value);
		}

		let retryCount = 0;
		const maxRetries = 8; // 適中的重試次數（MediaMTX 配置優化後生成更快）

		// ⭐ 統一方法：強制跳轉到目標時間（如果差距足夠大）
		const seekToTargetTime = (targetTime: number, method: string) => {
			if (!videoElement.value) return false;
			
			const currentTime = videoElement.value.currentTime;
			const timeDiff = Math.abs(currentTime - targetTime);
			
			// 只在時間差距 > 2 秒或當前時間明顯落後時才跳轉
			if (timeDiff > 2.0 || currentTime < targetTime - 1.0) {
				videoElement.value.currentTime = Math.max(0, targetTime);
				if (process.dev) {
					console.log(
						`[HLS] 強制跳轉到最新片段（${method}），從 ${currentTime.toFixed(2)}s 跳到 ${targetTime.toFixed(2)}s`
					);
				}
				return true;
			}
			return false;
		};

		hls.value.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
			if (process.dev) {
				console.log("[HLS] 播放列表解析完成，強制跳轉到最新片段");
			}
			
			// ⭐ 關鍵：強制跳轉到最新片段（解決頁面重新載入和重新啟動時延遲增加的問題）
			// 使用 setTimeout 確保在 manifest 完全解析後再跳轉
			setTimeout(() => {
				if (videoElement.value && hls.value) {
					try {
						// 方法 1: 使用 hls.js 的 liveSyncPosition（推薦，LL-HLS 專用）
						const liveSyncPosition = (hls.value as any).liveSyncPosition;
						if (liveSyncPosition !== undefined && liveSyncPosition > 0) {
							const targetTime = Math.max(0, liveSyncPosition - TARGET_LATENCY);
							seekToTargetTime(targetTime, "liveSyncPosition");
							return;
						}
						
						// 方法 2: 使用 fragments（備用方案）
						const levels = (hls.value as any).levels;
						if (levels && levels.length > 0) {
							const currentLevel = (hls.value as any).currentLevel;
							if (currentLevel >= 0 && currentLevel < levels.length) {
								const fragments = levels[currentLevel].details?.fragments;
								if (fragments && fragments.length > 0) {
									const targetFragmentIndex = Math.max(0, fragments.length - 2);
									const targetFragment = fragments[targetFragmentIndex];
									if (targetFragment && targetFragment.start > 0) {
										seekToTargetTime(targetFragment.start, `fragments[${targetFragmentIndex}]`);
									}
								}
							}
						}
					} catch (err) {
						if (process.dev) {
							console.warn("[HLS] 跳轉到最新片段時出錯:", err);
						}
					}
				}
			}, 500); // 等待 500ms 確保 manifest 完全解析
			
			handleAutoPlay();
			retryCount = 0;
			loading.value = false; // 提前結束載入狀態
			
			// ⭐ 關鍵：啟動持續延遲監控（會自動修正任何殘留延遲）
			startLatencyMonitoring();
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
				// 使用改進的錯誤處理
				const errorType = getErrorType(data);
				const errorMsg = getErrorMessage(errorType, data);
				const recoveryStrategy = getErrorRecoveryStrategy(errorType);

				console.error(`[VideoPlayer] HLS 錯誤 (${errorType}):`, data);

				switch (data.type) {
					case Hls.ErrorTypes.NETWORK_ERROR:
						if (recoveryStrategy.retry && retryCount < recoveryStrategy.maxRetries) {
							retryCount++;
							console.log(`[VideoPlayer] 重試 ${retryCount}/${recoveryStrategy.maxRetries}...`);
							setTimeout(() => {
								if (hls.value && hlsUrl.value) {
									hls.value.loadSource(hlsUrl.value);
									hls.value.startLoad();
								}
							}, recoveryStrategy.retryDelay);
						} else {
							error.value = errorMsg;
							hls.value?.destroy();
						}
						break;
					case Hls.ErrorTypes.MEDIA_ERROR:
						if (recoveryStrategy.retry && retryCount < recoveryStrategy.maxRetries) {
							retryCount++;
							console.log(
								`[VideoPlayer] 嘗試恢復媒體錯誤 ${retryCount}/${recoveryStrategy.maxRetries}...`
							);
							hls.value?.recoverMediaError();
						} else {
							error.value = errorMsg;
							hls.value?.destroy();
						}
						break;
					default:
						if (recoveryStrategy.retry && retryCount < recoveryStrategy.maxRetries) {
							retryCount++;
							console.log(`[VideoPlayer] 重試 ${retryCount}/${recoveryStrategy.maxRetries}...`);
							setTimeout(() => {
								if (hls.value && hlsUrl.value) {
									hls.value.loadSource(hlsUrl.value);
									hls.value.startLoad();
								}
							}, recoveryStrategy.retryDelay);
						} else {
							error.value = errorMsg;
							hls.value?.destroy();
						}
						break;
				}
			}
		});
	};

	if (useNativeHls) {
		// Safari 原生支持 - 對於外部提供的 hlsUrl，跳過檢查，直接設置 src
		// MediaMTX 可能需要時間，瀏覽器會自動重試

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

/**
 * 計算當前影像延遲
 * 優先使用 liveSyncPosition（LL-HLS 專用，最準確）
 */
const calculateVideoLatency = (): number | null => {
	if (!hls.value || !videoElement.value || videoElement.value.paused) {
		return null;
	}

	try {
		// 方法 1: 使用 liveSyncPosition（推薦，LL-HLS 專用）
		const liveSyncPosition = (hls.value as any).liveSyncPosition;
		if (liveSyncPosition !== undefined && liveSyncPosition > 0) {
			const currentTime = videoElement.value.currentTime;
			const latency = liveSyncPosition - currentTime;
			if (latency >= 0 && latency < 60) {
				// 合理範圍：0-60 秒
				return latency;
			}
		}

		// 方法 2: 使用 bufferedEnd（備用方案）
		const buffered = videoElement.value.buffered;
		if (buffered.length > 0) {
			const bufferedEnd = buffered.end(buffered.length - 1);
			const currentTime = videoElement.value.currentTime;
			const latency = bufferedEnd - currentTime;
			if (latency >= 0 && latency < 60) {
				// 合理範圍：0-60 秒
				return latency;
			}
		}

		return null;
	} catch (err) {
		if (process.dev) {
			console.warn("[VideoPlayer] 計算延遲時出錯:", err);
		}
		return null;
	}
};

/**
 * 調整播放位置或速度（漸進式調整策略）
 */
const adjustPlayback = (latency: number) => {
	if (!videoElement.value || !hls.value) return;

	try {
		// 策略 1: 延遲超過 3 秒，直接跳轉（快速校時）
		if (latency > MAX_LATENCY) {
			const liveSyncPosition = (hls.value as any).liveSyncPosition;
			if (liveSyncPosition !== undefined && liveSyncPosition > 0) {
				const targetTime = Math.max(0, liveSyncPosition - TARGET_LATENCY);
				const currentTime = videoElement.value.currentTime;
				// 只在跳轉距離 > 1 秒時執行，避免頻繁跳轉
				if (Math.abs(targetTime - currentTime) > 1.0) {
					videoElement.value.currentTime = targetTime;
					if (process.dev) {
						console.log(
							`[VideoPlayer] 延遲過高 (${latency.toFixed(2)}s)，跳轉到 ${targetTime.toFixed(2)}s`
						);
					}
					// 跳轉後恢復正常速度
					videoElement.value.playbackRate = 1.0;
					return;
				}
			}
		}

		// 策略 2: 延遲在 2-3 秒，使用播放速度調整（平滑校時）
		if (latency > 2.0 && latency <= MAX_LATENCY) {
			if (videoElement.value.playbackRate !== 1.1) {
				videoElement.value.playbackRate = 1.1; // 加速 10%
				if (process.dev) {
					console.log(`[VideoPlayer] 延遲 ${latency.toFixed(2)}s，使用加速播放 (1.1x)`);
				}
			}
			return;
		}

		// 策略 3: 延遲在 1.5-2 秒，輕微加速（微調）
		if (latency > TARGET_LATENCY && latency <= 2.0) {
			if (videoElement.value.playbackRate !== 1.05) {
				videoElement.value.playbackRate = 1.05; // 加速 5%
				if (process.dev) {
					console.log(`[VideoPlayer] 延遲 ${latency.toFixed(2)}s，輕微加速 (1.05x)`);
				}
			}
			return;
		}

		// 策略 4: 延遲正常，恢復正常速度
		if (latency <= TARGET_LATENCY) {
			if (videoElement.value.playbackRate !== 1.0) {
				videoElement.value.playbackRate = 1.0;
				if (process.dev) {
					console.log(`[VideoPlayer] 延遲正常 (${latency.toFixed(2)}s)，恢復正常速度`);
				}
			}
		}
	} catch (err) {
		if (process.dev) {
			console.warn("[VideoPlayer] 調整播放時出錯:", err);
		}
	}
};

/**
 * 啟動延遲監控（每 5 秒檢查一次）
 */
const startLatencyMonitoring = () => {
	// 清除舊的監測
	if (latencyCheckInterval.value) {
		clearInterval(latencyCheckInterval.value);
	}

	// 每 5 秒檢查一次延遲並自動調整
	latencyCheckInterval.value = setInterval(() => {
		if (!hls.value || !videoElement.value || videoElement.value.paused) {
			return;
		}

		const latency = calculateVideoLatency();

		if (latency !== null) {
			// 更新延遲值（平滑處理）
			const smoothingFactor = 0.7;
			const newLatency = hlsLatency.value * smoothingFactor + latency * (1 - smoothingFactor);
			// 只在變化超過 100ms 時更新，減少不必要的響應式觸發
			if (Math.abs(newLatency - hlsLatency.value) > 0.1) {
				hlsLatency.value = newLatency;
			}

			// 自動調整播放
			adjustPlayback(latency);
		}
	}, CHECK_INTERVAL);
};

/**
 * 停止延遲監控
 */
const stopLatencyMonitoring = () => {
	if (latencyCheckInterval.value) {
		clearInterval(latencyCheckInterval.value);
		latencyCheckInterval.value = null;
	}

	// 恢復正常播放速度
	if (videoElement.value && videoElement.value.playbackRate !== 1.0) {
		videoElement.value.playbackRate = 1.0;
	}

	hlsLatency.value = 0;
};

// 停止串流（實時流：完全清理，確保重新啟動時從最新時間點開始）
const stopStream = async () => {
	// ⭐ 關鍵：停止延遲監控
	stopLatencyMonitoring();

	// 先停止播放
	if (videoElement.value) {
		try {
			videoElement.value.pause();
			videoElement.value.src = "";
			videoElement.value.load(); // 重置視頻元素，清除所有緩衝
		} catch (err) {
			console.warn("停止播放時出錯:", err);
		}
	}

	// 完全清理 HLS 實例（確保不會重用舊緩存）
	if (hls.value) {
		try {
			hls.value.stopLoad();

			const originalUrl = (hls.value as any)?._originalUrl || hlsUrl.value;

			// 從 video 元素分離
			if (videoElement.value) {
				hls.value.detachMedia();
			}

			// 通過實例管理器釋放實例（使用原始 URL）
			if (originalUrl && videoElement.value) {
				hlsInstanceManager.releaseInstance(originalUrl, videoElement.value);
			} else {
				// 如果無法通過管理器釋放，直接銷毀
				hls.value.destroy();
			}
		} catch (err) {
			// 確保即使出錯也清理引用
			try {
				hls.value?.destroy();
			} catch {
				// 忽略銷毀錯誤
			}
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

	// 完全清空狀態（確保重新啟動時創建新實例）
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

// 檢查並更新 HLS URL（統一方法）
const checkAndUpdateHlsUrl = async (targetStreamId: string, shouldReload: boolean = true): Promise<boolean> => {
	try {
		const refreshData = await rtspApi.refreshHlsUrl(targetStreamId);
		const fullHlsUrl = getFullHlsUrl(refreshData.hlsUrl);
		
		// 檢查 URL 是否已更新（時間戳不同）
		const currentUrl = hlsUrl.value.split("?")[0]; // 移除查詢參數
		const newUrl = fullHlsUrl.split("?")[0];
		const isUrlUpdated = currentUrl !== newUrl || !hlsUrl.value.includes(`t=${refreshData.timestamp}`);
		
		if (isUrlUpdated) {
			hlsUrl.value = fullHlsUrl;
			
			// 如果需要重新載入 HLS 源（頁面可見性變化時）
			if (shouldReload && hls.value && videoElement.value) {
				hls.value.loadSource(fullHlsUrl);
				if (process.dev) {
					console.log(`[VideoPlayer] 已重新載入 HLS URL: ${fullHlsUrl}`);
				}
			}
			return true;
		}
		return false;
	} catch (err) {
		console.warn("[VideoPlayer] 刷新 HLS URL 失敗:", err);
		return false;
	}
};

// 處理頁面可見性變化（用戶切換標籤頁後回來）
const handleVisibilityChange = async () => {
	if (!document.hidden && hls.value && streamId.value) {
		if (process.dev) {
			console.log(`[VideoPlayer] 頁面重新可見，刷新 HLS URL: ${streamId.value}`);
		}
		// 刷新 URL 並重新載入（shouldReload = true）
		await checkAndUpdateHlsUrl(streamId.value, true);
		
		// ⭐ 關鍵：如果監控已停止，重新啟動（頁面重新可見時）
		if (!latencyCheckInterval.value && videoElement.value && !videoElement.value.paused) {
			startLatencyMonitoring();
		}
	} else if (document.hidden) {
		// 可選：頁面隱藏時暫停監控（節省資源，但不停止，保持監控狀態）
		// stopLatencyMonitoring();
	}
};

// 自動啟動
onMounted(async () => {
	// 添加頁面可見性變化監聽器
	if (process.client) {
		document.addEventListener("visibilitychange", handleVisibilityChange);
	}
	
	// 如果有 streamId 但沒有 hlsUrl，先刷新 URL（頁面重新載入時）
	if (props.streamId && !props.hlsUrl && props.autoStart) {
		if (process.dev) {
			console.log(`[VideoPlayer] 頁面載入，刷新 HLS URL: ${props.streamId}`);
		}
		
		streamId.value = props.streamId; // 先設置 streamId，確保後續邏輯正常
		
		// 刷新 URL 但不重新載入（shouldReload = false），由 startStream 處理
		// 如果刷新失敗，startStream 會使用 props.rtspUrl 啟動新串流
		await checkAndUpdateHlsUrl(props.streamId, false);
	}
	
	if (props.autoStart && (props.rtspUrl || props.hlsUrl || hlsUrl.value)) {
		startStream();
	}
});

// 清理
onUnmounted(() => {
	// 移除頁面可見性變化監聽器
	if (process.client) {
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	}
	
	// ⭐ 關鍵：停止延遲監控（確保清理）
	stopLatencyMonitoring();
	
	stopStream();
});

// 暴露方法給父組件（實時流：只暴露啟動和停止）
defineExpose({
	startStream,
	stopStream,
	hlsLatency: readonly(hlsLatency) // 暴露 HLS 延遲供外部使用
});
</script>

<style scoped>
.video-player-container {
	width: 100%;
	height: 100%;
	background-color: #000;
	overflow: hidden;
	position: relative;
}

/* 啟用 GPU 硬體加速（解碼和渲染） */
video {
	transform: translateZ(0);
	-webkit-transform: translateZ(0);
	will-change: contents;
	-webkit-backface-visibility: hidden;
	backface-visibility: hidden;
	object-fit: cover;
	display: block;
}
</style>
