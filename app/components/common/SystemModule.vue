<template>
	<div class="relative">
		<!-- 左側切換按鈕 -->
		<button
			v-if="canNavigatePrevious && !isLoading"
			class="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center text-white border-2 border-white/80 transition-all hover:bg-white/10 w-12 h-12 xl:w-14 xl:h-14 2xl:w-20 2xl:h-20 -translate-x-8 xl:-translate-x-12 2xl:-translate-x-20"
			@click="previousPage"
		>
			<svg class="w-8 h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 19l-7-7 7-7" />
			</svg>
		</button>

		<!-- 骨架屏 -->
		<div v-if="isLoading" class="grid grid-cols-4 gap-y-2 xl:gap-y-3 2xl:gap-y-4 gap-x-4 xl:gap-x-6 2xl:gap-x-8 p-2 xl:p-3 2xl:p-4">
			<div
				v-for="n in 8"
				:key="`skeleton-${n}`"
				class="aspect-square overflow-hidden border-2 border-white/30 rounded-xl"
				style="
					box-shadow:
						inset -7px 7px 7px rgba(255, 255, 255, 0.15),
						inset 7px -7px 10px rgba(0, 0, 0, 0.15);
				"
			>
				<div class="flex flex-col items-center justify-center h-full animate-pulse">
					<!-- Icon 骨架 -->
					<div class="flex items-center justify-center">
						<div class="w-24 h-24 2xl:w-28 2xl:h-28 bg-white/20 rounded-lg"></div>
					</div>

					<!-- Label 骨架 -->
					<div class="mt-2 xl:mt-3 2xl:mt-4">
						<div class="h-6 xl:h-7 2xl:h-8 w-32 bg-white/20 rounded"></div>
					</div>
				</div>
			</div>
		</div>

		<!-- 模組網格 -->
		<div v-else class="grid grid-cols-4 gap-y-2 xl:gap-y-3 2xl:gap-y-4 gap-x-4 xl:gap-x-6 2xl:gap-x-8 p-2 xl:p-3 2xl:p-4">
			<NuxtLink
				v-for="module in currentModules"
				:key="module.id"
				:to="module.route"
				class="group aspect-square overflow-hidden border-2 border-white/80 rounded-xl cursor-pointer transition-all hover:bg-white/5"
				style="
					box-shadow:
						inset -7px 7px 7px rgba(255, 255, 255, 0.25),
						inset 7px -7px 10px rgba(0, 0, 0, 0.25);
				"
			>
				<div class="flex flex-col items-center justify-center h-full">
					<!-- Icon -->
					<div class="flex items-center justify-center">
						<div class="w-24 h-24 2xl:w-28 2xl:h-28 flex items-center justify-center">
							<img :src="`/system/${module.icon}.png`" :alt="module.name" class="w-full h-full object-contain" />
						</div>
					</div>

					<!-- Label -->
					<div class="mt-2 xl:mt-3 2xl:mt-4">
						<h3 class="text-white text-lg xl:text-xl 2xl:text-2xl tracking-[6px] ms-[6px] whitespace-nowrap">
							{{ module.name }}
						</h3>
					</div>
				</div>
			</NuxtLink>
		</div>

		<!-- 右側切換按鈕 -->
		<button
			v-if="canNavigateNext && !isLoading"
			class="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center text-white border-2 border-white/80 transition-all hover:bg-white/10 w-12 h-12 xl:w-14 xl:h-14 2xl:w-20 2xl:h-20 translate-x-8 xl:translate-x-12 2xl:translate-x-20"
			@click="nextPage"
		>
			<svg class="w-8 h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
</template>

<script setup lang="ts">
import { useSystem } from "~/composables/useSystem";

const { getAllModules } = useSystem();
const systemModules = computed(() => getAllModules());

const currentPage = ref(0);
const isLoading = ref(true);

// 追蹤視窗寬度以實現響應式
// 在 SSR 和 CSR 初期都使用相同的初始值，避免 hydration mismatch
const windowWidth = ref(1024);

// 根據螢幕尺寸計算每頁顯示的模組數量
const modulesPerPage = computed(() => {
	// lg: 1024px, xl: 1280px, 2xl: 1536px
	if (windowWidth.value >= 1536) {
		return 8; // 2xl: 2行 × 4列 = 8個
	} else if (windowWidth.value >= 1280) {
		return 8; // xl: 2行 × 4列 = 8個
	} else if (windowWidth.value >= 1024) {
		return 6; // lg: 2行 × 3列 = 6個
	} else {
		return 8; // origin: 2行 × 4列 = 8個
	}
});

const currentModules = computed(() => {
	const start = currentPage.value * modulesPerPage.value;
	return systemModules.value.slice(start, start + modulesPerPage.value);
});

const canNavigatePrevious = computed(() => currentPage.value > 0);

const canNavigateNext = computed(() => (currentPage.value + 1) * modulesPerPage.value < systemModules.value.length);

// 監聽視窗大小變化，重置頁面以避免顯示空頁面
let handleResize: (() => void) | null = null;
let lastModulesPerPage = 8; // 初始值

onMounted(() => {
	// onMounted 只在客戶端執行，所以在這裡更新視窗寬度是安全的
	// 這確保 SSR 和 CSR 初始狀態一致（都使用 1024），然後在客戶端掛載後更新
	windowWidth.value = window.innerWidth;
	lastModulesPerPage = modulesPerPage.value;

	handleResize = () => {
		windowWidth.value = window.innerWidth;
		const newModulesPerPage = modulesPerPage.value;
		// 如果每頁數量改變，重置到第一頁以避免顯示空頁面
		if (newModulesPerPage !== lastModulesPerPage) {
			currentPage.value = 0;
			lastModulesPerPage = newModulesPerPage;
		}
	};

	window.addEventListener("resize", handleResize);

	// 模擬載入時間，確保骨架屏至少顯示一小段時間以提供更好的 UX
	setTimeout(() => {
		isLoading.value = false;
	}, 300);
});

onUnmounted(() => {
	if (handleResize) {
		window.removeEventListener("resize", handleResize);
	}
});

const nextPage = () => {
	if (canNavigateNext.value) {
		currentPage.value++;
	}
};

const previousPage = () => {
	if (canNavigatePrevious.value) {
		currentPage.value--;
	}
};
</script>
