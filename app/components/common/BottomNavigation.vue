<template>
	<nav
		v-if="isAuthenticated"
		class="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 overflow-hidden transition-all duration-300 backdrop-blur-xl p-3 bg-slate-900/80 shadow-2xl rounded-full ease-in-out"
		@mouseenter="handleMouseEnter"
		@mouseleave="handleMouseLeave"
	>
		<!-- 收縮狀態：顯示當前活動項目的圖標 -->
		<Transition
			mode="out-in"
			enter-active-class="transition-all duration-300"
			enter-from-class="opacity-0"
			enter-to-class="opacity-100"
			leave-active-class="transition-all duration-300"
			leave-from-class="opacity-100"
			leave-to-class="opacity-0"
		>
			<div v-if="!isExpanded" key="collapsed" class="flex items-center justify-center gap-3">
				<!-- 當前活動項目的圖標 -->
				<button
					:class="[
						'flex items-center justify-center p-2 rounded-full transition-all duration-200',
						'bg-white/10 hover:bg-white/20'
					]"
					@click.stop="navigateToRoute(currentActiveItem?.route || '/')"
					:aria-label="currentActiveItem?.name || '首頁'"
				>
					<NuxtImg
						:src="currentActiveItem?.iconPath || '/layout/home.svg'"
						:alt="currentActiveItem?.name || '首頁'"
						:class="[
							'h-8 w-8 2xl:h-10 2xl:w-10',
							(currentActiveItem?.isSvg ?? true) && 'brightness-0 invert'
						]"
						width="200"
						height="200"
						quality="90"
						loading="lazy"
					/>
				</button>
			</div>
			
			<!-- 展開狀態：顯示完整導航 -->
			<div v-else key="expanded" class="flex items-center justify-center gap-6">
				<!-- 主要導航項目 -->
				<div class="flex items-center justify-center gap-3">
					<button
						v-for="item in mainNavigationItems"
						:key="item.id"
						:class="[
							'group relative flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all duration-200',
							'text-white min-w-[100px]',
							isActive(item.route) ? 'bg-white/20' : 'hover:bg-white/15'
						]"
						@click.stop="navigateToRoute(item.route)"
						:aria-label="item.name"
					>
						<!-- 圖標 -->
						<div class="relative">
						<NuxtImg
							:src="`/system/${item.icon}.png`"
							:alt="item.name"
							class="h-12 w-12 2xl:h-16 2xl:w-16"
							width="200"
							height="200"
							quality="90"
							loading="lazy"
						/>
						</div>
						<!-- 文字標籤 -->
						<span class="text-xs 2xl:text-sm">
							{{ item.name }}
						</span>
					</button>
				</div>
				
				<!-- 分隔線 -->
				<div class="h-12 w-px bg-white/20"></div>
				
				<!-- 輔助功能區 -->
				<div class="flex items-center gap-3">
					<!-- 輔助功能按鈕（警示紀錄、設備管理、全區點位圖） -->
					<button
						v-for="item in filteredAuxiliaryItems"
						:key="item.id"
						:class="getButtonClasses(isActive(item.route))"
						@click.stop="navigateToRoute(item.route)"
						:aria-label="item.name"
					>
						<NuxtImg
							:src="item.icon"
							:alt="item.name"
							:class="[
								'h-12 w-12 2xl:h-16 2xl:w-16',
								item.isSvg && 'brightness-0 invert'
							]"
							width="200"
							height="200"
							quality="90"
							loading="lazy"
						/>
					</button>

					<!-- 使用者資訊按鈕 -->
					<div class="relative z-[100]">
						<button
							ref="userMenuButtonRef"
							data-user-menu
							:class="getButtonClasses(showUserMenu)"
							@click.stop="toggleUserMenu"
							aria-label="使用者資訊"
						>
							<NuxtImg
								src="/layout/user-info.svg"
								alt="使用者資訊"
								class="h-12 w-12 2xl:h-16 2xl:w-16 brightness-0 invert"
								width="200"
								height="200"
								quality="90"
								loading="lazy"
							/>
						</button>

						<!-- 使用者選單 -->
						<Teleport to="body">
							<Transition
								enter-active-class="transition-all duration-200"
								enter-from-class="opacity-0 translate-y-1"
								enter-to-class="opacity-100 translate-y-0"
								leave-active-class="transition-all duration-200"
								leave-from-class="opacity-100 translate-y-0"
								leave-to-class="opacity-0 translate-y-1"
							>
								<div
									v-if="showUserMenu"
									data-user-dropdown
									:style="userMenuStyle"
									class="fixed rounded-lg border border-white/20 bg-slate-900/95 p-2 shadow-xl backdrop-blur-md z-[9999] w-48"
								>
									<!-- 使用者資訊區 -->
									<div class="mb-2 border-b border-white/10 px-3 py-2">
										<p class="text-sm font-semibold text-white">{{ user?.username || "使用者" }}</p>
										<p class="text-xs text-white/60">{{ user?.role === "admin" ? "管理員" : user?.role === "operator" ? "操作員" : "檢視者" }}</p>
									</div>
									
									<!-- 選單項目 -->
									<div class="space-y-1">
										<!-- 使用者管理（僅管理員可見） -->
										<button
											v-if="isAdmin"
											class="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
											@click="handleUserManagement"	
											aria-label="使用者管理"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
											</svg>
											使用者管理
										</button>
										
										<!-- 登出按鈕 -->
										<button
											class="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
											@click="handleLogout"
											aria-label="登出"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
											</svg>
											登出
										</button>
									</div>
								</div>
							</Transition>
						</Teleport>
					</div>

					<!-- 首頁按鈕（最右側） -->
					<button
						:class="getButtonClasses(isActive('/'))"
						@click.stop="navigateToRoute('/')"
						aria-label="首頁"
					>
						<NuxtImg
							src="/layout/home.svg"
							alt="首頁"
							class="h-12 w-12 2xl:h-16 2xl:w-16 brightness-0 invert"
							width="200"
							height="200"
							quality="90"
							loading="lazy"
						/>
					</button>
				</div>
			</div>
		</Transition>
	</nav>
</template>

<script setup lang="ts">
import { getSystemModulesByCategory } from "~/config/system-modules";
import type { SystemModule } from "~/types/system";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";

const route = useRoute();
const router = useRouter();
const { user, isAuthenticated, isAdmin, logout } = useAuth();
const toast = useToast();

// 主要導航項目（移除警示紀錄，已移至輔助功能區）
const mainNavigationItems = computed<SystemModule[]>(() => {
	const allModules = getSystemModulesByCategory("all");
	const mainNavIds = [6, 5, 8, 7]; // 人流統計、環境品質、影像監視、車輛進出
	return mainNavIds
		.map(id => allModules.find(module => module.id === id))
		.filter((module): module is SystemModule => module !== undefined);
});

// 輔助功能項目配置
const auxiliaryItems = [
	{ id: 'alert-log', name: '警示紀錄', route: '/core/alert-log', icon: '/layout/alert-logo-white.png', isSvg: false },
	{ id: 'equipment-management', name: '設備管理', route: '/core/equipment-management', icon: '/layout/devices.svg', isSvg: true },
	{ id: 'area-point-map', name: '全區點位圖', route: '/core/area-point-map', icon: '/layout/map.svg', isSvg: true },
	{ id: 'users', name: '使用者管理', route: '/core/users', icon: '/layout/user-info.svg', isSvg: true },
	{ id: 'home', name: '首頁', route: '/', icon: '/layout/home.svg', isSvg: true }
] as const;

// 過濾後的輔助功能項目（排除使用者管理和首頁）
const filteredAuxiliaryItems = computed(() => 
	auxiliaryItems.filter(item => item.id !== 'users' && item.id !== 'home')
);

// 展開/收縮狀態
const isExpanded = ref(false);
const showUserMenu = ref(false);
const userMenuButtonRef = ref<HTMLElement | null>(null);
const userMenuStyle = ref<Record<string, string>>({});
let collapseTimer: ReturnType<typeof setTimeout> | null = null;

// 檢查路由是否為活動狀態
const isActive = (routePath: string): boolean => 
	routePath === "/" ? route.path === "/" : route.path.startsWith(routePath);

// 獲取當前活動的導航項目
const currentActiveItem = computed(() => {
	const mainActive = mainNavigationItems.value.find(item => isActive(item.route));
	if (mainActive) {
		return {
			id: String(mainActive.id),
			name: mainActive.name,
			route: mainActive.route,
			iconPath: `/system/${mainActive.icon}.png`,
			isSvg: false
		};
	}
	
	const auxiliaryActive = auxiliaryItems.find(item => isActive(item.route));
	return auxiliaryActive ? {
		id: auxiliaryActive.id,
		name: auxiliaryActive.name,
		route: auxiliaryActive.route,
		iconPath: auxiliaryActive.icon,
		isSvg: auxiliaryActive.isSvg
	} : null;
});

// 按鈕樣式類別
const getButtonClasses = (isActive: boolean) => [
	'group flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200',
	'text-white min-w-[64px]',
	isActive ? 'bg-white/20' : 'hover:bg-white/15'
];

// 計算使用者選單的位置
const updateUserMenuPosition = () => {
	if (!userMenuButtonRef.value || !showUserMenu.value) {
		userMenuStyle.value = {};
		return;
	}
	const rect = userMenuButtonRef.value.getBoundingClientRect();
	userMenuStyle.value = {
		bottom: `${window.innerHeight - rect.top + 8}px`,
		right: `${window.innerWidth - rect.right}px`
	};
};

// 監聽選單顯示狀態變化
watch(showUserMenu, (newValue) => {
	if (!process.client) return;
	
	if (newValue) {
		updateUserMenuPosition();
		window.addEventListener("resize", updateUserMenuPosition);
		window.addEventListener("scroll", updateUserMenuPosition, true);
	} else {
		window.removeEventListener("resize", updateUserMenuPosition);
		window.removeEventListener("scroll", updateUserMenuPosition, true);
	}
});

// Hover 事件處理
const handleMouseEnter = () => {
	if (collapseTimer) {
		clearTimeout(collapseTimer);
		collapseTimer = null;
	}
	isExpanded.value = true;
};

const handleMouseLeave = () => {
	// 如果使用者選單已打開，不自動收縮導航欄
	if (showUserMenu.value) return;
	
	// 延遲收縮，避免滑鼠移動時意外關閉（與動畫時長一致）
	collapseTimer = setTimeout(() => {
		isExpanded.value = false;
	}, 300);
};

const toggleUserMenu = () => {
	showUserMenu.value = !showUserMenu.value;
};

const navigateToRoute = (routePath: string) => {
	showUserMenu.value = false;
	router.push(routePath);
};

const handleUserManagement = () => {
	showUserMenu.value = false;
	router.push("/core/users");
};

const handleLogout = async () => {
	try {
		showUserMenu.value = false;
		logout();
		toast.success("已登出");
		await router.push("/login");
	} catch (error) {
		toast.error("登出失敗");
	}
};

const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	const isInsideMenu = target.closest("[data-user-menu]") || target.closest("[data-user-dropdown]");
	const isInsideNav = target.closest("nav");
	
	if (!isInsideMenu) {
		showUserMenu.value = false;
	}
	
	// 如果點擊在導航欄外部，收縮導航欄
	if (!isInsideNav && isExpanded.value) {
		isExpanded.value = false;
	}
};

// 生命週期
onMounted(() => {
	if (process.client) {
		document.addEventListener("click", handleClickOutside);
	}
});

onBeforeUnmount(() => {
	if (process.client) {
		document.removeEventListener("click", handleClickOutside);
		window.removeEventListener("resize", updateUserMenuPosition);
		window.removeEventListener("scroll", updateUserMenuPosition, true);
		if (collapseTimer) clearTimeout(collapseTimer);
	}
});
</script>