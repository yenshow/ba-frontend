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
							:view-count="monitorViews.length"
							:max-views="parseInt(gridLayout)"
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
					class="show-scrollbar relative h-full min-w-[72px] overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-white/80 bg-white/30 py-8 transition-all duration-500 ease-in-out 2xl:min-w-[84px]"
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
							class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4"
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
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useStreamStatus } from "~/composables/monitoring/useStreamStatus";
import SurveillanceControlPanel from "~/components/surveillance/SurveillanceControlPanel.vue";
import SurveillanceCameraGrid from "~/components/surveillance/SurveillanceCameraGrid.vue";
import SurveillanceCameraCard from "~/components/surveillance/SurveillanceCameraCard.vue";

const toast = useToast();
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

// 載入攝影機列表
const loadCameras = async () => {
	loadError.value = null;

	try {
		await streamStatus.loadCameras();
	} catch (error) {
		const errorMsg = handleError(error, "載入攝影機列表失敗");
		loadError.value = errorMsg || "載入攝影機列表失敗";
	}
};

const refreshStatus = async () => {
	try {
		await streamStatus.loadCameras();
		toast.success("已重新載入");
	} catch (error) {
		handleError(error, "重新載入失敗");
	}
};

// 處理攝影機選擇：加入或移除監控畫面（加入時呼叫 stream/start 取得 webrtcUrl）
const handleCameraSelect = async (deviceId: number) => {
	const existing = monitorViews.value.find(v => v.deviceId === deviceId);
	if (existing) {
		streamStatus.removeMonitorView(deviceId);
		return;
	}

	const maxViews = parseInt(gridLayout.value);
	if (monitorViews.value.length >= maxViews) {
		toast.warning(`最多只能顯示 ${maxViews} 個畫面`);
		return;
	}

	try {
		await streamStatus.addMonitorView(deviceId);
		toast.success("已加入監控畫面");
	} catch (error) {
		handleError(error, "啟動串流失敗");
	}
};

const handleRemoveView = (deviceId: number) => {
	streamStatus.removeMonitorView(deviceId);
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

onBeforeUnmount(() => {
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value);
		leftSectionResizeObserver.disconnect();
		leftSectionResizeObserver = null;
	}
});

onMounted(async () => {
	initLeftSectionObserver();

	try {
		await loadCameras();
	} catch (error) {
		handleError(error, "初始化失敗");
	}
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
