<template>
	<div class="w-full">
		<!-- 網格容器 -->
		<div :class="['grid gap-4', gridClass]">
			<div
				v-for="(view, index) in displayViews"
				:key="`view-${view.deviceId}-${view.position}-${index}`"
				:ref="(el: HTMLElement | null) => setViewRef(el, index)"
				:class="[
					'relative overflow-hidden rounded-lg border-2 bg-black',
					isSelected(view.deviceId)
						? 'border-blue-500 ring-2 ring-blue-500'
						: 'border-gray-300 dark:border-gray-700'
				]"
				:style="{ aspectRatio: '16/9' }"
			>
				<!-- 視頻播放器（只在可見時才渲染） -->
				<div v-if="getStreamUrlForView(view) && isViewVisible(index)" class="absolute inset-0">
					<SurveillanceVideoPlayer
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
import { onBeforeUnmount, onMounted, ref, nextTick, watch } from "vue";
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

// 使用統一的串流狀態管理
const streamStatus = useStreamStatus();

// 懶加載：追蹤每個視圖的可見性
const viewRefs = ref<(HTMLElement | null)[]>([]);
const visibleViews = ref<Set<number>>(new Set());
let intersectionObserver: IntersectionObserver | null = null;

// 設置視圖引用
const setViewRef = (el: HTMLElement | null, index: number) => {
	if (el) {
		viewRefs.value[index] = el;
	}
};

// 檢查視圖是否可見
const isViewVisible = (index: number): boolean => {
	return visibleViews.value.has(index);
};

// 初始化 Intersection Observer
const initIntersectionObserver = () => {
	if (typeof IntersectionObserver === "undefined") {
		// 如果瀏覽器不支援，所有視圖都視為可見
		displayViews.value.forEach((_, index) => {
			visibleViews.value.add(index);
		});
		return;
	}

	intersectionObserver = new IntersectionObserver(
		entries => {
			entries.forEach(entry => {
				const index = parseInt(entry.target.getAttribute("data-view-index") || "-1");
				if (index >= 0) {
					if (entry.isIntersecting) {
						visibleViews.value.add(index);
					} else {
						// 可選：離開視窗時移除（節省資源）
						// visibleViews.value.delete(index);
					}
				}
			});
		},
		{
			threshold: 0.1, // 當 10% 可見時觸發
			rootMargin: "50px" // 提前 50px 開始載入
		}
	);

	// 觀察所有視圖
	nextTick(() => {
		viewRefs.value.forEach((el, index) => {
			if (el) {
				el.setAttribute("data-view-index", index.toString());
				intersectionObserver?.observe(el);
			}
		});
	});
};

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

// 從統一的狀態管理獲取串流狀態（只讀）
const streamStatusMap = computed(() => streamStatus.streamStatusMap.value);

// 串流狀態現在由統一的狀態管理自動更新，不需要手動更新

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
	const status = streamStatus.getStreamStatus(deviceId);
	return status?.hlsUrl;
};

// 獲取串流 ID
const getStreamId = (deviceId: number): string | undefined => {
	const status = streamStatus.getStreamStatus(deviceId);
	return status?.streamId;
};

// 是否載入中（簡化為檢查是否有狀態）
const isLoading = (deviceId: number): boolean => {
	const status = streamStatus.getStreamStatus(deviceId);
	return status?.status === "loading" || false;
};

// 是否已選擇（用於邊框高亮）
const isSelected = (deviceId: number): boolean => {
	// 可以根據需要實現選擇邏輯
	return false;
};

// 獲取狀態訊息
const getStatusMessage = (deviceId: number): string => {
	const status = streamStatus.getStreamStatus(deviceId);
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

// 啟動串流（簡化：只 emit 事件，交由父組件處理）
const handleStartStream = (deviceId: number) => {
		emit("startStream", deviceId);
};

// 停止串流（簡化：只 emit 事件，交由父組件處理）
const handleStopStream = (deviceId: number) => {
		emit("stopStream", deviceId);
};

// 監聽視圖變化，更新 Intersection Observer
watch(
	() => displayViews.value.length,
	() => {
		nextTick(() => {
			// 清理舊的觀察
			if (intersectionObserver) {
				viewRefs.value.forEach(el => {
					if (el) {
						intersectionObserver?.unobserve(el);
	}
				});
			}

			// 重新初始化
			visibleViews.value.clear();
			initIntersectionObserver();
		});
	},
	{ immediate: true }
);

// 清理
onBeforeUnmount(() => {
	// 清理 Intersection Observer
	if (intersectionObserver) {
		intersectionObserver.disconnect();
		intersectionObserver = null;
	}
	visibleViews.value.clear();
});

// 初始化
onMounted(() => {
	initIntersectionObserver();
});

// 不再需要暴露更新方法，狀態由統一的狀態管理自動更新
</script>
