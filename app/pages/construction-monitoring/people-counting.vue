<template>
	<div>
		<!-- 人流統計系統頁面內容 - 參考 surveillance.vue 排版 -->
		<div class="flex justify-center gap-4 xl:gap-6 2xl:gap-8">
			<!-- 左側：詳細工地資訊（主要內容 - 大） -->
			<section class="relative flex-[1.2] 2xl:flex-[1.3]">
				<div
					ref="leftSectionRef"
					class="flex flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 xl:p-6 2xl:p-8"
				>
					<!-- 載入狀態 -->
					<div v-if="isLoadingSite" class="flex h-full items-center justify-center">
						<div class="text-center text-white">
							<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
							<p>載入工地資訊...</p>
						</div>
					</div>

					<!-- 錯誤狀態 -->
					<div v-else-if="loadError" class="flex h-full items-center justify-center">
						<div class="rounded-lg bg-red-50/90 p-6 text-center dark:bg-red-900/30">
							<p class="text-red-600 dark:text-red-400">{{ loadError }}</p>
							<button @click="loadSiteDetail" class="mt-4 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
								重試
							</button>
						</div>
					</div>

					<!-- 詳細工地資訊 -->
					<div v-else-if="selectedSite" class="flex-1">
						<SiteDetailPanel
							:site="selectedSite"
							:personnel="personnel"
							:logs="logs"
							@unit-select="handleUnitSelect"
						/>
					</div>

					<!-- 提示：選擇工地 -->
					<div
						v-else
						class="flex h-full min-h-[600px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
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
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								/>
							</svg>
							<p class="text-xl font-medium text-white/90 xl:text-2xl 2xl:text-3xl">請選擇工地</p>
							<p class="mt-2 text-sm text-white/70 xl:text-base">請從右側列表點選工地以查看詳細資訊</p>
						</div>
					</div>
				</div>
			</section>

			<!-- 右側：工地總覽列表（可收縮） -->
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
								<h2 class="text-xl font-semibold text-white xl:text-2xl 2xl:text-3xl">總覽</h2>
								<span
									class="ml-2 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm xl:text-sm"
								>
									{{ sites.length }}
								</span>
							</div>

							<!-- 搜尋框 -->
							<div class="mt-4">
								<input
									v-model="searchQuery"
									type="text"
									placeholder="搜尋工地..."
									class="w-full rounded-lg border-2 border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 backdrop-blur-sm transition-all focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 xl:text-base"
								/>
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
							class="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7"
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
							<!-- 載入狀態 -->
							<div v-if="isLoadingSites" class="flex items-center justify-center py-8">
								<div class="text-center text-white">
									<div class="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
									<p class="text-sm text-white/70">載入工地列表...</p>
								</div>
							</div>

							<!-- 工地卡片列表 -->
							<div v-else class="space-y-4">
								<div
									v-if="filteredSites.length === 0"
									class="h-full py-8 text-center text-sm text-white/60 xl:text-base"
								>
									沒有找到工地
								</div>
								<SiteOverviewCard
									v-for="site in filteredSites"
									:key="site.id"
									:site="site"
									@click="handleSiteSelect"
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
import { onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import type { PeopleCountingSite, PeopleCountingPersonnel, PeopleCountingLog } from "~/types/peopleCounting";

const peopleCountingApi = usePeopleCountingApi();
const toast = useToast();

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

	// ResizeObserver 會自動監聽所有尺寸變化
	leftSectionResizeObserver = new ResizeObserver(() => {
		updateLeftSectionHeight();
	});
	leftSectionResizeObserver.observe(leftSectionRef.value);
};

// 狀態管理
const sites = ref<PeopleCountingSite[]>([]);
const selectedSite = ref<PeopleCountingSite | null>(null);
const personnel = ref<PeopleCountingPersonnel[]>([]);
const logs = ref<PeopleCountingLog[]>([]);
const isLoadingSites = ref(false);
const isLoadingSite = ref(false);
const loadError = ref<string | null>(null);
const searchQuery = ref("");

// 側邊欄收縮狀態
const isSidebarCollapsed = ref(false);

// 選中的單位 ID（用於過濾人員和記錄）
const selectedUnitId = ref<number | null>(null);

// 計算屬性
const filteredSites = computed(() => {
	if (!searchQuery.value.trim()) {
		return sites.value;
	}
	const query = searchQuery.value.toLowerCase();
	return sites.value.filter(
		site => site.name.toLowerCase().includes(query) || site.region.toLowerCase().includes(query)
	);
});

// 載入工地列表
const loadSites = async () => {
	isLoadingSites.value = true;
	try {
		sites.value = await peopleCountingApi.getSites();
		console.log("[PeopleCounting] 載入工地列表成功:", sites.value.length);

		// 如果沒有選中的工地，且列表不為空，自動選擇第一個
		if (!selectedSite.value && sites.value.length > 0) {
			await handleSiteSelect(sites.value[0].id);
		}
	} catch (error) {
		console.error("[PeopleCounting] 載入工地列表失敗:", error);
		toast.error("載入工地列表失敗");
	} finally {
		isLoadingSites.value = false;
	}
};

// 載入工地詳情
const loadSiteDetail = async (siteId: number) => {
	isLoadingSite.value = true;
	loadError.value = null;
	selectedUnitId.value = null; // 重置選中的單位

	try {
		// 載入工地詳情
		selectedSite.value = await peopleCountingApi.getSiteDetail(siteId);

		// 載入人員列表（如果是第一個單位，預設載入）
		if (selectedSite.value.units && selectedSite.value.units.length > 0) {
			const firstUnit = selectedSite.value.units[0];
			await loadUnitPersonnel(firstUnit.id);
		} else {
			personnel.value = [];
		}

		// 載入進出場記錄
		await loadSiteLogs(siteId);
	} catch (error) {
		console.error("[PeopleCounting] 載入工地詳情失敗:", error);
		loadError.value = error instanceof Error ? error.message : "載入工地詳情失敗";
		toast.error("載入工地詳情失敗");
	} finally {
		isLoadingSite.value = false;
	}
};

// 載入單位人員
const loadUnitPersonnel = async (unitId: number) => {
	try {
		personnel.value = await peopleCountingApi.getUnitPersonnel(unitId);
	} catch (error) {
		console.error("[PeopleCounting] 載入單位人員失敗:", error);
		toast.error("載入單位人員失敗");
	}
};

// 載入工地進出場記錄
const loadSiteLogs = async (siteId: number, unitId?: number) => {
	try {
		logs.value = await peopleCountingApi.getSiteLogs(siteId, {
			limit: 50,
			unitId: unitId || undefined
		});
	} catch (error) {
		console.error("[PeopleCounting] 載入進出場記錄失敗:", error);
		toast.error("載入進出場記錄失敗");
	}
};

// 處理工地選擇
const handleSiteSelect = async (siteId: number) => {
	if (selectedSite.value?.id === siteId) {
		return; // 已經選中，不需要重新載入
	}
	await loadSiteDetail(siteId);
};

// 處理單位選擇
const handleUnitSelect = async (unitId: number | null) => {
	selectedUnitId.value = unitId;
	if (unitId) {
		// 載入該單位的人員
		await loadUnitPersonnel(unitId);
		// 重新載入該單位的進出場記錄
		if (selectedSite.value) {
			await loadSiteLogs(selectedSite.value.id, unitId);
		}
	} else {
		// 清除篩選，顯示所有記錄
		personnel.value = [];
		if (selectedSite.value) {
			await loadSiteLogs(selectedSite.value.id);
		}
	}
};

// 清理函數
onBeforeUnmount(() => {
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value);
		leftSectionResizeObserver.disconnect();
		leftSectionResizeObserver = null;
	}
});

// 初始化
onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver();

	try {
		await loadSites();
		// ResizeObserver 會自動監聽尺寸變化
	} catch (error) {
		console.error("初始化失敗:", error);
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

