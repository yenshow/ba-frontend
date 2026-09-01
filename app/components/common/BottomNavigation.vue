<template>
	<nav
		v-if="isAuthenticated"
		class="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 overflow-hidden rounded-full bg-slate-900/80 p-3 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out"
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
						'flex items-center justify-center rounded-full p-2 transition-all duration-200',
						'bg-white/10 hover:bg-white/20'
					]"
					@click.stop="navigateToRoute(currentActiveItem?.route || '/')"
					:aria-label="currentActiveItem?.name || '首頁'"
				>
					<img
						v-if="currentActiveItem?.isSvg ?? true"
						:src="currentActiveItem?.iconPath || '/layout/home.svg'"
						:alt="currentActiveItem?.name || '首頁'"
						:class="['h-8 w-8 2xl:h-10 2xl:w-10', 'brightness-0 invert']"
					/>
					<NuxtImg
						v-else-if="currentActiveItem"
						:src="currentActiveItem.iconPath"
						:alt="currentActiveItem.name"
						class="h-8 w-8 2xl:h-10 2xl:w-10"
					/>
					<img
						v-else
						src="/layout/home.svg"
						alt="首頁"
						class="h-8 w-8 brightness-0 invert 2xl:h-10 2xl:w-10"
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
							'group relative flex flex-col items-center justify-center gap-1 rounded-2xl p-2 transition-all duration-200',
							'min-w-[100px] text-white',
							isActive(item.route) ? 'bg-white/20' : 'hover:bg-white/15',
							isModuleLocked(item) && 'opacity-60'
						]"
						@click.stop="handleModuleClick(item)"
						:aria-label="item.name"
					>
						<!-- 圖標 -->
						<div class="relative">
							<NuxtImg
								:src="`/system/${item.icon}.png`"
								:alt="item.name"
								class="h-12 w-12 2xl:h-16 2xl:w-16"
							/>
							<!-- 鎖頭（未授權） -->
							<div
								v-if="isModuleLocked(item)"
								class="absolute -right-4 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 ring-1 ring-white/20"
								aria-hidden="true"
							>
								<CommonLicenseLockIcon class="h-8 w-8 text-white" />
							</div>
						</div>
						<!-- 文字標籤 -->
						<span class="text-xs 2xl:text-sm">
							{{ item.name }}
						</span>
					</button>
				</div>

				<!-- 分隔線 -->
				<div class="h-12 w-px bg-white/20"></div>

				<!-- 輔助功能區：由左至右 1.警示紀錄 2.系統總覽 3.系統設定 4.首頁 -->
				<div class="flex items-center gap-3">
					<!-- 1. 警示紀錄 -->
					<button
						:class="getButtonClasses(isActive('/core/alert-log'))"
						@click.stop="navigateToRoute('/core/alert-log')"
						aria-label="警示紀錄"
					>
						<div class="relative">
							<NuxtImg
								src="/layout/alert-logo-white.png"
								alt="警示紀錄"
								class="h-12 w-12 2xl:h-16 2xl:w-16"
							/>
							<span
								v-if="unresolvedAlertCount > 0"
								class="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white 2xl:h-7 2xl:w-7 2xl:text-base"
							>
								{{ unresolvedAlertCount > 99 ? "99+" : unresolvedAlertCount }}
							</span>
						</div>
					</button>

					<!-- 2. 系統總覽（core 模組；權限與 Central 相同） -->
					<div v-if="hasConstructionOverviewMenu" class="relative z-[100]" data-more-functions-menu>
						<button
							ref="moreFunctionsButtonRef"
							:class="getButtonClasses(showMoreFunctionsMenu)"
							@click.stop="toggleMoreFunctionsMenu"
							aria-label="系統總覽"
						>
							<img
								src="/layout/more-functions.svg"
								alt="系統總覽"
								class="h-12 w-12 brightness-0 invert 2xl:h-16 2xl:w-16"
							/>
						</button>
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
									v-if="showMoreFunctionsMenu"
									data-more-functions-dropdown
									:style="moreFunctionsMenuStyle"
									class="fixed z-[9999] w-52 rounded-lg border border-white/20 bg-slate-900/95 p-2 shadow-xl backdrop-blur-md"
								>
									<button
										v-for="module in constructionOverviewModules"
										:key="module.id"
										type="button"
										:class="[
											'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-all duration-200',
											isModuleLocked(module)
												? 'cursor-not-allowed text-white/50 opacity-60'
												: 'text-white/80 hover:bg-white/10 hover:text-white'
										]"
										@click="handleModuleClick(module)"
										:aria-label="module.name"
									>
										<div class="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
											<NuxtImg
												:src="`/system/${module.icon}.png`"
												:alt="module.name"
												class="h-8 w-8 object-contain"
											/>
											<div
												v-if="isModuleLocked(module)"
												class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/40"
												aria-hidden="true"
											>
												<CommonLicenseLockIcon class="h-3 w-3 text-white" />
											</div>
										</div>
										{{ module.name }}
									</button>
								</div>
							</Transition>
						</Teleport>
					</div>

					<!-- 3. 系統設定 -->
					<div class="relative z-[100]">
						<button
							ref="userMenuButtonRef"
							data-user-menu
							:class="getButtonClasses(showUserMenu)"
							@click.stop="toggleUserMenu"
							aria-label="系統設定"
						>
							<img
								src="/layout/setting.svg"
								alt="系統設定"
								class="h-12 w-12 brightness-0 invert 2xl:h-16 2xl:w-16"
							/>
						</button>
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
									class="fixed z-[9999] w-48 rounded-lg border border-white/20 bg-slate-900/95 p-2 shadow-xl backdrop-blur-md"
								>
									<!-- 使用者資訊區 -->
									<div class="mb-2 border-b border-white/10 px-3 py-2">
										<p class="text-sm font-semibold text-white">{{ user?.username || "使用者" }}</p>
										<p class="text-xs text-white/60">
											{{ getUserRoleLabel(user?.role) }}
										</p>
									</div>

									<div class="space-y-1">
										<template v-for="(group, groupIndex) in systemSettingsSections" :key="group.section">
											<p
												v-if="group.section !== 'session' && systemSettingsSectionLabels[group.section]"
												class="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-white/40"
											>
												{{ systemSettingsSectionLabels[group.section] }}
											</p>
											<template v-for="item in group.items" :key="item.id">
												<button
													v-if="item.kind === 'route' && item.route"
													class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
													@click="navigateToRoute(item.route)"
													:aria-label="item.label"
												>
													{{ item.label }}
												</button>
												<button
													v-else-if="item.kind === 'theme'"
													class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
													@click="handleThemeToggle"
													:aria-label="theme === 'light' ? '切換為黑暗模式' : '切換為明亮模式'"
												>
													{{ theme === "light" ? "黑暗模式" : "明亮模式" }}
												</button>
												<button
													v-else-if="item.kind === 'logout'"
													:class="[
														'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white',
														groupIndex > 0 ? 'mt-1 border-t border-white/10 pt-3' : ''
													]"
													@click="handleLogout"
													:aria-label="item.label"
												>
													<svg
														class="h-4 w-4 shrink-0"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
														aria-hidden="true"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
														/>
													</svg>
													{{ item.label }}
												</button>
											</template>
										</template>
									</div>
								</div>
							</Transition>
						</Teleport>
					</div>

					<!-- 4. 首頁 -->
					<button
						:class="getButtonClasses(isActive('/'))"
						@click.stop="navigateToRoute('/')"
						aria-label="首頁"
					>
						<img
							src="/layout/home.svg"
							alt="首頁"
							class="h-12 w-12 brightness-0 invert 2xl:h-16 2xl:w-16"
						/>
					</button>
				</div>
			</div>
		</Transition>
	</nav>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import type { SystemModule } from "~/types/system";
import { useAuth } from "~/composables/core/useAuth";
import { getUserRoleLabel } from "~/utils/userRoleLabels";
import { useToast } from "~/composables/core/useToast";
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor";
import { useAccessGate } from "~/composables/core/useAccessGate";
import { MSG_PERMISSION_LOCKED } from "~/utils/apiError";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import {
	useAppShellNavigation,
} from "~/composables/core/useAppShellNavigation";
import { SYSTEM_SETTINGS_SECTION_LABELS } from "~/utils/appShellNavigationUtils";
import { useTheme } from "~/composables/core/useTheme";
import { navigateConstructionRoute } from "~/utils/constructionNavigationUtils";

const route = useRoute();
const router = useRouter();
const { user, isAuthenticated, logout } = useAuth();
const { constructionOverviewModules, hasConstructionOverviewMenu, systemSettingsSections } =
	useAppShellNavigation();
const systemSettingsSectionLabels = SYSTEM_SETTINGS_SECTION_LABELS;
const { theme, toggleTheme } = useTheme();
const toast = useToast();
const accessGate = useAccessGate();
const moduleRegistry = useModuleRegistry();

// 未解決警報數量（生命週期由 layout default/auxiliary 的 startMonitoring 管理）
const { unresolvedAlertCount, loadUnresolvedAlertCount } = useAlertMonitor();

const MAIN_NAV_ROUTE_ORDER = [
	"/access-control/people-counting",
	"/security/environment",
	"/access-control/surveillance",
	"/access-control/vehicle-access"
] as const;

const mainNavigationItems = computed<SystemModule[]>(() => {
	const modules = moduleRegistry
		.getAllModules()
		.filter((m) => MAIN_NAV_ROUTE_ORDER.includes(m.route as (typeof MAIN_NAV_ROUTE_ORDER)[number]));
	const byRoute = new Map(modules.map(m => [m.route, m] as const));
	const ordered = MAIN_NAV_ROUTE_ORDER.map(r => byRoute.get(r)).filter(Boolean) as SystemModule[];
	// 若 registry 內容有增減（或排序調整），將未列入固定順序者補在後面
	const leftovers = modules.filter(m => !MAIN_NAV_ROUTE_ORDER.includes(m.route as any));
	return [...ordered, ...leftovers];
});

// 輔助功能：當前活動項目用（警示紀錄、首頁）
const auxiliaryItemsForActive = [
	{
		id: "alert-log",
		name: "警示紀錄",
		route: "/core/alert-log",
		icon: "/layout/alert-logo-white.png",
		isSvg: false
	},
	{ id: "home", name: "首頁", route: "/", icon: "/layout/home.svg", isSvg: true }
] as const;

// 展開/收縮狀態
const isExpanded = ref(false);
const showUserMenu = ref(false);
const showMoreFunctionsMenu = ref(false);
const userMenuButtonRef = ref<HTMLElement | null>(null);
const moreFunctionsButtonRef = ref<HTMLElement | null>(null);
const userMenuStyle = ref<Record<string, string>>({});
const moreFunctionsMenuStyle = ref<Record<string, string>>({});
let collapseTimer: ReturnType<typeof setTimeout> | null = null;

// 檢查路由是否為活動狀態
const isActive = (routePath: string): boolean =>
	routePath === "/" ? route.path === "/" : route.path.startsWith(routePath);

type ActiveNavItem = { id: string; name: string; route: string; iconPath: string; isSvg: boolean };

const toActiveItem = (
	item: { id: string; name: string; route: string; icon: string },
	isSvg: boolean
): ActiveNavItem => ({
	id: item.id,
	name: item.name,
	route: item.route,
	iconPath: item.icon,
	isSvg
});

const currentActiveItem = computed<ActiveNavItem | null>(() => {
	const mainActive = mainNavigationItems.value.find(item => isActive(item.route));
	if (mainActive) {
		return toActiveItem(
			{ ...mainActive, id: String(mainActive.id), icon: `/system/${mainActive.icon}.png` },
			false
		);
	}
	const moreActive = constructionOverviewModules.value.find(item => isActive(item.route));
	if (moreActive) {
		return toActiveItem(
			{ ...moreActive, id: String(moreActive.id), icon: `/system/${moreActive.icon}.png` },
			false
		);
	}
	const auxActive = auxiliaryItemsForActive.find(item => isActive(item.route));
	return auxActive ? toActiveItem(auxActive, auxActive.isSvg) : null;
});

// 按鈕樣式類別
const getButtonClasses = (isActive: boolean) => [
	"group flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200",
	"text-white min-w-[64px]",
	isActive ? "bg-white/20" : "hover:bg-white/15"
];

/** 依按鈕位置計算下拉樣式（共用） */
const setDropdownPosition = (
	buttonEl: HTMLElement | null,
	isOpen: boolean,
	styleRef: Ref<Record<string, string>>
) => {
	if (!buttonEl || !isOpen) {
		styleRef.value = {};
		return;
	}
	const rect = buttonEl.getBoundingClientRect();
	styleRef.value = {
		bottom: `${window.innerHeight - rect.top + 8}px`,
		right: `${window.innerWidth - rect.right}px`
	};
};

const updateUserMenuPosition = () =>
	setDropdownPosition(userMenuButtonRef.value, showUserMenu.value, userMenuStyle);
const updateMoreFunctionsMenuPosition = () =>
	setDropdownPosition(
		moreFunctionsButtonRef.value,
		showMoreFunctionsMenu.value,
		moreFunctionsMenuStyle
	);

const updateAllDropdownPositions = () => {
	updateUserMenuPosition();
	updateMoreFunctionsMenuPosition();
};

watch(
	[showUserMenu, showMoreFunctionsMenu],
	([userOpen, moreOpen]) => {
		if (!process.client) return;
		const anyOpen = userOpen || moreOpen;
		if (anyOpen) {
			updateAllDropdownPositions();
			window.addEventListener("resize", updateAllDropdownPositions);
			window.addEventListener("scroll", updateAllDropdownPositions, true);
		} else {
			userMenuStyle.value = {};
			moreFunctionsMenuStyle.value = {};
			window.removeEventListener("resize", updateAllDropdownPositions);
			window.removeEventListener("scroll", updateAllDropdownPositions, true);
		}
	},
	{ immediate: false }
);

// Hover 事件處理
const handleMouseEnter = () => {
	if (collapseTimer) {
		clearTimeout(collapseTimer);
		collapseTimer = null;
	}
	isExpanded.value = true;
};

const handleMouseLeave = () => {
	// 若使用者選單或更多功能選單已打開，不自動收縮導航欄
	if (showUserMenu.value || showMoreFunctionsMenu.value) return;

	// 延遲收縮，避免滑鼠移動時意外關閉（與動畫時長一致）
	collapseTimer = setTimeout(() => {
		isExpanded.value = false;
	}, 300);
};

/** 關閉所有下拉選單，避免重複寫入 */
const closeAllMenus = () => {
	showUserMenu.value = false;
	showMoreFunctionsMenu.value = false;
};

const toggleUserMenu = () => {
	showMoreFunctionsMenu.value = false;
	showUserMenu.value = !showUserMenu.value;
};

const toggleMoreFunctionsMenu = () => {
	showUserMenu.value = false;
	showMoreFunctionsMenu.value = !showMoreFunctionsMenu.value;
};

const navigateToRoute = (routePath: string) => {
	closeAllMenus();
	navigateConstructionRoute(route.path, routePath, path => router.push(path));
};

const isModuleLocked = (module: SystemModule) => accessGate.isModuleLocked(module);

const handleModuleClick = async (module: SystemModule) => {
	await accessGate.ensureAccessReady();
	if (!accessGate.canAccessModule(module)) {
		toast.warning(MSG_PERMISSION_LOCKED);
		closeAllMenus();
		return;
	}

	navigateToRoute(module.route);
};

const handleThemeToggle = () => {
	toggleTheme();
	showUserMenu.value = false;
};

const handleLogout = async () => {
	try {
		closeAllMenus();
		await logout();
		toast.success("已登出");
		await router.push("/login");
	} catch (error) {
		toast.error("登出失敗");
	}
};

const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	const isInsideUserMenu =
		target.closest("[data-user-menu]") || target.closest("[data-user-dropdown]");
	const isInsideMoreMenu =
		target.closest("[data-more-functions-menu]") || target.closest("[data-more-functions-dropdown]");
	const isInsideNav = target.closest("nav");

	if (!isInsideUserMenu) showUserMenu.value = false;
	if (!isInsideMoreMenu) showMoreFunctionsMenu.value = false;

	// 如果點擊在導航欄外部，收縮導航欄
	if (!isInsideNav && isExpanded.value) {
		isExpanded.value = false;
	}
};

// 生命週期
onMounted(() => {
	if (process.client) {
		document.addEventListener("click", handleClickOutside);
		void loadUnresolvedAlertCount();
	}
});

watch(
	() => route.path,
	() => {
		if (route.path === "/core/alert-log") {
			void loadUnresolvedAlertCount();
		}
	}
);

onBeforeUnmount(() => {
	if (process.client) {
		document.removeEventListener("click", handleClickOutside);
		window.removeEventListener("resize", updateAllDropdownPositions);
		window.removeEventListener("scroll", updateAllDropdownPositions, true);
		if (collapseTimer) clearTimeout(collapseTimer);
	}
});
</script>
