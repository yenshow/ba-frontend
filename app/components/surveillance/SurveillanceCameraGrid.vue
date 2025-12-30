<template>
	<div class="w-full">
		<!-- 網格容器 -->
		<div :class="['grid gap-4', gridClass]">
			<div
				v-for="(view, index) in displayViews"
				:key="`view-${view.deviceId}-${view.position}-${index}`"
				:class="[
					'relative overflow-hidden rounded-lg border-2 bg-black',
					isSelected(view.deviceId)
						? 'border-blue-500 ring-2 ring-blue-500'
						: 'border-gray-300 dark:border-gray-700'
				]"
				:style="{ aspectRatio: '16/9' }"
			>
				<!-- 視頻播放器 -->
				<div v-if="getStreamUrlForView(view)" class="absolute inset-0">
					<RtspVideoPlayer
						:key="`player-${view.deviceId}-${view.position}-${getStreamUrlForView(view)}`"
						:hls-url="getStreamUrlForView(view) || ''"
						:stream-id="view.streamId || getStreamId(view.deviceId) || ''"
						:auto-start="true"
						class="h-full w-full"
					/>
				</div>

				<!-- 載入狀態（僅用於非測試串流） -->
				<div
					v-else-if="!view.isTestStream && isLoading(view.deviceId)"
					class="absolute inset-0 flex items-center justify-center bg-gray-900"
				>
					<div class="text-center text-white">
						<div class="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
						<p class="text-sm xl:text-base">正在啟動串流...</p>
					</div>
				</div>

				<!-- 錯誤或未啟動狀態（僅用於非測試串流） -->
				<div
					v-else-if="!view.isTestStream"
					class="absolute inset-0 flex items-center justify-center bg-gray-900"
				>
					<div class="text-center text-white">
						<svg
							class="mx-auto mb-2 h-12 w-12 text-gray-500"
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
						<p class="text-sm text-gray-400 xl:text-base">{{ getStatusMessage(view.deviceId) }}</p>
						<button
							v-if="getCamera(view.deviceId)?.status === 'active'"
							@click.stop="handleStartStream(view.deviceId)"
							class="mt-2 rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600 xl:text-sm 2xl:text-base"
						>
							啟動串流
						</button>
					</div>
				</div>

				<!-- 測試串流但無 URL 時的空狀態 -->
				<div
					v-else-if="view.isTestStream && !getStreamUrlForView(view)"
					class="absolute inset-0 flex items-center justify-center bg-gray-900"
				>
					<div class="text-center text-white">
						<p class="text-sm text-gray-400 xl:text-base">測試串流載入中...</p>
					</div>
				</div>

				<!-- 設備名稱覆蓋層 -->
				<div
					class="absolute left-0 top-0 z-20 max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap rounded-br bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm xl:text-sm 2xl:text-base"
				>
					{{ getCameraName(view.deviceId, view) }}
				</div>

				<!-- 操作按鈕覆蓋層 -->
				<div class="absolute right-0 top-0 z-20 flex shrink-0 gap-1 p-1.5">
					<!-- 測試串流不需要停止按鈕（由測試區域控制） -->
					<button
						v-if="!view.isTestStream && getStreamUrl(view.deviceId)"
						@click.stop="handleStopStream(view.deviceId)"
						class="shrink-0 whitespace-nowrap rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] text-white transition-colors hover:bg-red-600 xl:px-2 xl:py-1 xl:text-xs"
						title="停止串流"
					>
						停止
					</button>
					<button
						@click.stop="$emit('remove', view.deviceId)"
						class="shrink-0 whitespace-nowrap rounded bg-gray-500/80 px-1.5 py-0.5 text-[10px] text-white transition-colors hover:bg-gray-600 xl:px-2 xl:py-1 xl:text-xs"
						title="移除畫面"
					>
						移除
					</button>
				</div>
			</div>

			<!-- 空位提示 -->
			<div
				v-for="index in emptySlots"
				:key="`empty-${index}`"
				class="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
			>
				<p class="text-sm text-gray-400 xl:text-base dark:text-gray-500">空位</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import type { SurveillanceCamera, MonitorView, GridLayout } from "~/types/surveillance";

interface Props {
	cameras: SurveillanceCamera[];
	views: MonitorView[];
	layout: GridLayout;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	startStream: [deviceId: number];
	stopStream: [deviceId: number];
	remove: [deviceId: number];
}>();

const surveillanceApi = useSurveillanceApi();

// 計算網格類別
const gridClass = computed(() => {
	switch (props.layout) {
		case "1":
			return "grid-cols-1";
		case "4":
			return "grid-cols-2";
		case "9":
			return "grid-cols-3";
		default:
			return "grid-cols-1";
	}
});

// 獲取應該顯示的畫面數量
const maxViews = computed(() => {
	return parseInt(props.layout);
});

// 要顯示的畫面（按位置排序）
const displayViews = computed(() => {
	return [...props.views].sort((a, b) => a.position - b.position).slice(0, maxViews.value);
});

// 空位數量
const emptySlots = computed(() => {
	return Math.max(0, maxViews.value - displayViews.value.length);
});

// 設備 ID 到設備的映射
const cameraMap = computed(() => {
	const map = new Map<number, SurveillanceCamera>();
	props.cameras.forEach(camera => {
		map.set(camera.id, camera);
	});
	return map;
});

// 設備 ID 到串流狀態的映射
const streamStatusMap = ref<
	Map<
		number,
		{ hlsUrl?: string; streamId?: string; status: string; isLoading: boolean; error?: string }
	>
>(new Map());

// 防抖和請求去重（性能優化）
let updateStreamStatusesTimer: ReturnType<typeof setTimeout> | null = null;
const pendingStatusRequests = new Set<number>(); // 追蹤正在進行的請求
const UPDATE_DEBOUNCE_MS = 300; // 300ms 防抖

// 更新串流狀態（優化版本：防抖 + 去重 + 狀態檢查）
const updateStreamStatuses = async () => {
	// 清除之前的定時器
	if (updateStreamStatusesTimer) {
		clearTimeout(updateStreamStatusesTimer);
	}

	// 防抖：延遲執行，避免頻繁調用
	updateStreamStatusesTimer = setTimeout(async () => {
		const deviceIds = props.views.map(v => v.deviceId);

		// 只處理需要檢查的設備（過濾掉正在請求中的）
		const deviceIdsToCheck = deviceIds.filter(id => !pendingStatusRequests.has(id));

		for (const deviceId of deviceIdsToCheck) {
			const camera = cameraMap.value.get(deviceId);
			if (!camera) {
				// 如果攝影機不存在，移除狀態
				streamStatusMap.value.delete(deviceId);
				continue;
			}

			// 如果已經有串流資訊，直接使用（避免重複請求）
			if (camera.streamInfo?.status === "running" && camera.streamInfo.hlsUrl) {
				const existingStatus = streamStatusMap.value.get(deviceId);
				// 只有當狀態不同時才更新，避免不必要的響應式觸發
				if (!existingStatus || existingStatus.hlsUrl !== camera.streamInfo.hlsUrl) {
					streamStatusMap.value.set(deviceId, {
						hlsUrl: camera.streamInfo.hlsUrl,
						streamId: camera.streamInfo.streamId,
						status: "running",
						isLoading: false
					});
				}
				continue;
			}

			// 如果設備未啟用，跳過
			if (camera.status !== "active") {
				const existingStatus = streamStatusMap.value.get(deviceId);
				// 只有狀態不同時才更新
				if (
					!existingStatus ||
					existingStatus.status !== "stopped" ||
					existingStatus.error !== "設備未啟用"
				) {
					streamStatusMap.value.set(deviceId, {
						status: "stopped",
						isLoading: false,
						error: "設備未啟用"
					});
				}
				continue;
			}

			// 標記為正在請求中，避免重複請求
			pendingStatusRequests.add(deviceId);

			// 檢查串流狀態（異步，不阻塞）
			surveillanceApi
				.getCameraStreamStatus(deviceId)
				.then(status => {
					const existingStatus = streamStatusMap.value.get(deviceId);

					if (status && status.status === "running" && status.hlsUrl) {
						// 只有狀態不同時才更新
						if (
							!existingStatus ||
							existingStatus.hlsUrl !== status.hlsUrl ||
							existingStatus.status !== "running"
						) {
							streamStatusMap.value.set(deviceId, {
								hlsUrl: status.hlsUrl,
								streamId: status.streamId,
								status: "running",
								isLoading: false
							});
						}
					} else {
						const newStatus = status?.status || "stopped";
						// 只有狀態不同時才更新
						if (
							!existingStatus ||
							existingStatus.status !== newStatus ||
							existingStatus.error !== status?.error
						) {
							streamStatusMap.value.set(deviceId, {
								status: newStatus,
								isLoading: false,
								error: status?.error
							});
						}
					}
				})
				.catch(error => {
					const existingStatus = streamStatusMap.value.get(deviceId);
					const errorMsg = error instanceof Error ? error.message : "未知錯誤";
					// 只有錯誤不同時才更新
					if (!existingStatus || existingStatus.error !== errorMsg) {
						streamStatusMap.value.set(deviceId, {
							status: "error",
							isLoading: false,
							error: errorMsg
						});
					}
				})
				.finally(() => {
					pendingStatusRequests.delete(deviceId);
				});
		}
	}, UPDATE_DEBOUNCE_MS);
};

// 優化 watch：只在關鍵屬性變化時觸發，而不是 deep watch
watch(
	() => props.views.length,
	() => {
		updateStreamStatuses();
	}
);

watch(
	() => props.views.map(v => `${v.deviceId}-${v.position}`).join(","),
	() => {
		updateStreamStatuses();
	},
	{ immediate: true }
);

// 優化 cameras watch：只在串流資訊變化時觸發
watch(
	() => props.cameras.map(c => `${c.id}:${c.streamInfo?.status}:${c.streamInfo?.hlsUrl}`).join(","),
	() => {
		updateStreamStatuses();
	}
);

// 獲取設備
const getCamera = (deviceId: number): SurveillanceCamera | undefined => {
	return cameraMap.value.get(deviceId);
};

// 獲取設備名稱（支援測試串流）
const getCameraName = (deviceId: number, view?: MonitorView): string => {
	// 如果是測試串流，返回特殊名稱
	if (view?.isTestStream) {
		return "測試串流";
	}
	const camera = getCamera(deviceId);
	return camera?.name || `設備 ${deviceId}`;
};

// 獲取串流 URL（支援測試串流）
const getStreamUrlForView = (view: MonitorView): string | undefined => {
	// 如果是測試串流，直接使用 view 中的 hlsUrl
	if (view.isTestStream && view.hlsUrl) {
		return view.hlsUrl;
	}
	// 否則從設備串流狀態中獲取
	return getStreamUrl(view.deviceId);
};

// 獲取串流 URL（僅用於非測試串流）
const getStreamUrl = (deviceId: number): string | undefined => {
	const status = streamStatusMap.value.get(deviceId);
	return status?.hlsUrl;
};

// 獲取串流 ID
const getStreamId = (deviceId: number): string | undefined => {
	const status = streamStatusMap.value.get(deviceId);
	return status?.streamId;
};

// 是否載入中
const isLoading = (deviceId: number): boolean => {
	const status = streamStatusMap.value.get(deviceId);
	return status?.isLoading || false;
};

// 是否已選擇（用於邊框高亮）
const isSelected = (deviceId: number): boolean => {
	// 可以根據需要實現選擇邏輯
	return false;
};

// 獲取狀態訊息
const getStatusMessage = (deviceId: number): string => {
	const status = streamStatusMap.value.get(deviceId);
	if (status?.error) {
		return status.error;
	}
	if (status?.status === "error") {
		return "串流錯誤";
	}
	const camera = getCamera(deviceId);
	if (camera?.status !== "active") {
		return "設備未啟用";
	}
	return "點擊啟動串流";
};

// 啟動串流
const handleStartStream = async (deviceId: number) => {
	const currentStatus = streamStatusMap.value.get(deviceId);
	if (currentStatus) {
		currentStatus.isLoading = true;
	}

	try {
		const streamInfo = await surveillanceApi.startCameraStream(deviceId);
		streamStatusMap.value.set(deviceId, {
			hlsUrl: streamInfo.hlsUrl,
			streamId: streamInfo.streamId,
			status: "running",
			isLoading: false
		});
		emit("startStream", deviceId);
	} catch (error) {
		streamStatusMap.value.set(deviceId, {
			status: "error",
			isLoading: false,
			error: error instanceof Error ? error.message : "啟動失敗"
		});
	}
};

// 停止串流
const handleStopStream = async (deviceId: number) => {
	try {
		await surveillanceApi.stopCameraStream(deviceId);
		streamStatusMap.value.set(deviceId, {
			status: "stopped",
			isLoading: false
		});
		emit("stopStream", deviceId);
	} catch (error) {
		console.error("停止串流失敗:", error);
	}
};

// 清理定時器和請求
onBeforeUnmount(() => {
	if (updateStreamStatusesTimer) {
		clearTimeout(updateStreamStatusesTimer);
	}
	pendingStatusRequests.clear();
});

// 暴露方法給父組件
defineExpose({
	updateStreamStatuses
});
</script>
