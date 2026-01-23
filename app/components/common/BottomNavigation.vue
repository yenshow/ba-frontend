<template>
	<nav
		v-if="isAuthenticated"
		class="fixed bottom-0 left-0 right-0 z-50 border-t border-white/20 bg-black/40 backdrop-blur-md"
	>
		<div class="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3">
			<!-- 主要導航項目 -->
			<div class="flex flex-1 items-center justify-center gap-2 md:gap-4">
				<button
					v-for="item in mainNavigationItems"
					:key="item.id"
					:class="[
						'group flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all duration-200',
						'min-w-[70px] md:min-w-[90px]',
						isActive(item.route)
							? 'bg-white/20 text-white shadow-lg'
							: 'text-white/70 hover:bg-white/10 hover:text-white'
					]"
					@click="navigateToRoute(item.route)"
				>
					<!-- 圖標 -->
					<div class="relative">
						<NuxtImg
							:src="`/system/${item.icon}.png`"
							:alt="item.name"
							class="h-6 w-6 transition-transform duration-200 md:h-7 md:w-7"
							:class="isActive(item.route) ? 'scale-110' : 'group-hover:scale-105'"
							width="28"
							height="28"
							quality="90"
							loading="lazy"
						/>
						<!-- 活動狀態指示點 -->
						<div
							v-if="isActive(item.route)"
							class="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white"
						></div>
					</div>
					<!-- 文字標籤 -->
					<span
						class="text-xs font-medium transition-all duration-200 md:text-sm"
						:class="isActive(item.route) ? 'font-semibold' : ''"
					>
						{{ item.name }}
					</span>
				</button>
			</div>

			<!-- 分隔線 -->
			<div class="mx-2 h-12 w-px bg-white/20 md:mx-4"></div>

			<!-- 輔助功能區 -->
			<div class="flex items-center gap-2 md:gap-3">
				<!-- 首頁按鈕 -->
				<button
					:class="[
						'flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all duration-200',
						'min-w-[60px] md:min-w-[70px]',
						isHomeActive
							? 'bg-white/20 text-white shadow-lg'
							: 'text-white/70 hover:bg-white/10 hover:text-white'
					]"
					@click="navigateToRoute('/')"
				>
					<NuxtImg
						src="/layout/home.svg"
						alt="首頁"
						class="h-6 w-6 transition-transform duration-200 md:h-7 md:w-7"
						:class="isHomeActive ? 'scale-110' : 'hover:scale-105'"
						width="28"
						height="28"
						quality="90"
						loading="lazy"
					/>
					<span class="text-xs font-medium md:text-sm">首頁</span>
				</button>

				<!-- 使用者資訊按鈕 -->
				<div class="relative">
					<button
						data-user-menu
						:class="[
							'flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all duration-200',
							'min-w-[60px] md:min-w-[70px]',
							showUserMenu
								? 'bg-white/20 text-white shadow-lg'
								: 'text-white/70 hover:bg-white/10 hover:text-white'
						]"
						@click="toggleUserMenu"
					>
						<NuxtImg
							src="/layout/user-info.svg"
							alt="使用者資訊"
							class="h-6 w-6 transition-transform duration-200 md:h-7 md:w-7"
							:class="showUserMenu ? 'scale-110' : 'hover:scale-105'"
							width="28"
							height="28"
							quality="90"
							loading="lazy"
						/>
						<span class="text-xs font-medium md:text-sm">使用者</span>
					</button>

					<!-- 使用者選單 -->
					<Transition
						enter-active-class="transition duration-200 ease-out"
						enter-from-class="transform scale-95 opacity-0"
						enter-to-class="transform scale-100 opacity-100"
						leave-active-class="transition duration-150 ease-in"
						leave-from-class="transform scale-100 opacity-100"
						leave-to-class="transform scale-95 opacity-0"
					>
						<div
							v-if="showUserMenu"
							data-user-dropdown
							class="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-white/20 bg-black/80 p-2 shadow-xl backdrop-blur-md"
						>
							<div class="mb-2 border-b border-white/10 px-3 py-2">
								<p class="text-sm font-semibold text-white">{{ user?.username || "使用者" }}</p>
								<p class="text-xs text-white/60">{{ user?.role === "admin" ? "管理員" : "操作員" }}</p>
							</div>
							<button
								class="w-full rounded-md px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
								@click="handleLogout"
							>
								登出
							</button>
						</div>
					</Transition>
				</div>

				<!-- 更多功能按鈕 -->
				<div class="relative">
					<button
						data-more-menu
						:class="[
							'flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all duration-200',
							'min-w-[60px] md:min-w-[70px]',
							showMoreMenu
								? 'bg-white/20 text-white shadow-lg'
								: 'text-white/70 hover:bg-white/10 hover:text-white'
						]"
						@click="toggleMoreMenu"
					>
						<NuxtImg
							src="/layout/more-functions.svg"
							alt="更多功能"
							class="h-6 w-6 transition-transform duration-200 md:h-7 md:w-7"
							:class="showMoreMenu ? 'scale-110' : 'hover:scale-105'"
							width="28"
							height="28"
							quality="90"
							loading="lazy"
						/>
						<span class="text-xs font-medium md:text-sm">更多</span>
					</button>

					<!-- 更多功能選單 -->
					<Transition
						enter-active-class="transition duration-200 ease-out"
						enter-from-class="transform scale-95 opacity-0"
						enter-to-class="transform scale-100 opacity-100"
						leave-active-class="transition duration-150 ease-in"
						leave-from-class="transform scale-100 opacity-100"
						leave-to-class="transform scale-95 opacity-0"
					>
						<div
							v-if="showMoreMenu"
							data-more-dropdown
							class="absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-white/20 bg-black/80 p-2 shadow-xl backdrop-blur-md"
						>
							<button
								v-for="item in moreMenuItems"
								:key="item.id"
								:class="[
									'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
									isActive(item.route)
										? 'bg-white/20 font-semibold text-white'
										: 'text-white/80 hover:bg-white/10 hover:text-white'
								]"
								@click="navigateToRoute(item.route)"
							>
								{{ item.name }}
							</button>
						</div>
					</Transition>
				</div>
			</div>
		</div>
	</nav>
</template>

<script setup lang="ts">
import { getSystemModulesByCategory } from "~/config/system-modules";
import type { SystemModule } from "~/types/system";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";

const route = useRoute();
const router = useRouter();
const { user, isAuthenticated, logout } = useAuth();
const toast = useToast();

// 主要導航項目（根據圖片中的5個核心功能）
const mainNavigationItems = computed<SystemModule[]>(() => {
	const allModules = getSystemModulesByCategory("all");
	// 根據圖片，主要導航項目順序為：人流統計、環境品質、影像監視、車輛進出、警示紀錄
	const mainNavIds = [5, 4, 7, 6, 3]; // 對應的 ID，按順序排列
	// 確保按照指定順序排列
	return mainNavIds
		.map(id => allModules.find(module => module.id === id))
		.filter((module): module is SystemModule => module !== undefined);
});

// 更多功能選單項目（其他系統模組）
const moreMenuItems = computed<SystemModule[]>(() => {
	const allModules = getSystemModulesByCategory("all");
	const mainNavIds = [5, 4, 7, 6, 3]; // 主要導航的 ID
	return allModules.filter(module => !mainNavIds.includes(module.id));
});

// 選單顯示狀態
const showUserMenu = ref(false);
const showMoreMenu = ref(false);

// 檢查路由是否為活動狀態
const isActive = (routePath: string): boolean => {
	if (routePath === "/") {
		return route.path === "/";
	}
	return route.path.startsWith(routePath);
};

// 檢查首頁是否為活動狀態
const isHomeActive = computed(() => route.path === "/");

// 切換使用者選單
const toggleUserMenu = () => {
	showUserMenu.value = !showUserMenu.value;
	if (showUserMenu.value) {
		showMoreMenu.value = false;
	}
};

// 切換更多功能選單
const toggleMoreMenu = () => {
	showMoreMenu.value = !showMoreMenu.value;
	if (showMoreMenu.value) {
		showUserMenu.value = false;
	}
};

// 導航到指定路由
const navigateToRoute = (routePath: string) => {
	showUserMenu.value = false;
	showMoreMenu.value = false;
	router.push(routePath);
};

// 處理登出
const handleLogout = async () => {
	try {
		logout();
		toast.success("已登出");
		await router.push("/login");
	} catch (error) {
		toast.error("登出失敗");
	}
};

// 點擊外部關閉選單
const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	// 檢查點擊是否在選單區域內
	const userMenuButton = target.closest("[data-user-menu]");
	const moreMenuButton = target.closest("[data-more-menu]");
	const userMenuDropdown = target.closest("[data-user-dropdown]");
	const moreMenuDropdown = target.closest("[data-more-dropdown]");

	if (!userMenuButton && !moreMenuButton && !userMenuDropdown && !moreMenuDropdown) {
		showUserMenu.value = false;
		showMoreMenu.value = false;
	}
};

onMounted(() => {
	if (process.client) {
		document.addEventListener("click", handleClickOutside);
	}
});

onBeforeUnmount(() => {
	if (process.client) {
		document.removeEventListener("click", handleClickOutside);
	}
});
</script>

<style scoped>
/* 確保導航欄在底部且不遮擋內容 */
nav {
	box-shadow:
		0 -4px 6px -1px rgba(0, 0, 0, 0.1),
		0 -2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
