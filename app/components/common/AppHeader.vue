<template>
	<header
		:class="[
			'w-full border-b-[12px] border-solid 2xl:border-b-[16px]',
			isDark ? 'bg-[#003B45]' : 'bg-white',
		]"
		:style="{ borderBottomColor: headerBorderAccentColor }"
	>
		<div class="flex items-end justify-between h-[88px] px-12 pb-3 2xl:h-[96px] 2xl:px-16 2xl:pb-4">
			<!-- Logo -->
			<div class="h-[64px] 2xl:h-[72px]">
				<img
					src="/layout/yenshow-logo.svg"
					alt="YENSHOW"
					:class="['h-full object-contain', isDark ? 'logo-svg-dark' : 'logo-svg-light']"
				/>
			</div>

			<!-- System Title（模組名稱 + public/system 圖示） -->
			<div class="flex flex-1 justify-center">
				<div
					v-if="currentModule"
					class="system-title"
					:class="{ 'system-title--dark-ink': systemTitleChrome?.useDarkInk }"
					:style="systemTitleChrome?.style"
				>
					<NuxtImg
						:src="`/system/${currentModule.icon}.png`"
						:alt="currentModule.name"
						class="system-title-module-icon h-10 w-10 flex-shrink-0 object-contain 2xl:h-11 2xl:w-11"
						width="200"
						height="200"
					/>
					<span class="text-3xl font-semibold tracking-[8px] 2xl:text-4xl 2xl:tracking-[16px]">
						{{ currentModule.name }}
					</span>
				</div>
			</div>

			<!-- Right Icons：由左至右 1.警示紀錄 2.更多功能 | 3.用戶設定 4.首頁 -->
			<div class="flex items-center space-x-6 2xl:space-x-8">
				<!-- 1. 警示紀錄 -->
				<button :class="['icon-button relative', { 'icon-button-active': isAlertLogActive }]">
					<NuxtLink to="/core/alert-log">
						<img
							:src="isDark ? '/layout/alert-logo-white.png' : '/layout/alert-log.png'"
							alt="警示紀錄"
							class="h-12 w-12 2xl:h-14 2xl:w-14"
						/>
						<!-- 未解決警報數量徽章 -->
						<span
							v-if="unresolvedAlertCount > 0"
							class="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white 2xl:h-7 2xl:w-7 2xl:text-base"
						>
							{{ unresolvedAlertCount > 99 ? "99+" : unresolvedAlertCount }}
						</span>
					</NuxtLink>
				</button>
				<!-- 2. 更多功能 -->
				<div class="relative flex items-center" ref="moreMenuRef">
					<button
						@click.stop="toggleMoreMenu"
						:class="['icon-button', { 'icon-button-active': isMoreMenuOpen }]"
					>
						<img
							src="/layout/more-functions.svg"
							alt="更多功能"
							:class="['h-12 w-12 2xl:h-14 2xl:w-14', isDark ? 'icon-svg-dark' : 'icon-svg-light']"
						/>
					</button>
					<Transition
						enter-active-class="transition ease-out duration-100"
						enter-from-class="transform opacity-0 scale-95"
						enter-to-class="transform opacity-100 scale-100"
						leave-active-class="transition ease-in duration-75"
						leave-from-class="transform opacity-100 scale-100"
						leave-to-class="transform opacity-0 scale-95"
					>
						<div
							v-if="isMoreMenuOpen"
							@click.stop
							class="absolute right-0 top-full z-50 mt-2 flex h-[540px] w-48 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white py-2 shadow-lg 2xl:h-[600px]"
						>
							<div class="show-scrollbar flex-1 overflow-y-auto">
								<template
									v-for="(categoryGroup, index) in categoryGroups"
									:key="categoryGroup.category"
								>
									<div v-if="categoryGroup.modules.length">
										<p
											class="px-4 py-2 text-sm font-medium 2xl:text-base opacity-80"
											:style="getMoreMenuCategoryLabelStyle(categoryGroup.category)"
										>
											{{ categoryGroup.label }}
										</p>
										<ul class="space-y-0.5">
											<li v-for="module in categoryGroup.modules" :key="module.id">
												<!-- 有路由且已授權：可點擊導向 -->
												<NuxtLink
													v-if="module.route && !isModuleLocked(module)"
													:to="module.route"
													@click="closeMoreMenu"
													class="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-gray-100"
												>
													<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center">
														<NuxtImg
															:src="`/system/${module.icon}.png`"
															:alt="module.name"
															class="icon-dark h-8 w-8 object-contain"
															width="200"
															height="200"
														/>
													</div>
													<span class="text-sm text-gray-700 2xl:text-base">{{ module.name }}</span>
												</NuxtLink>
												<!-- 有路由但未授權：顯示鎖頭、點擊僅 toast -->
												<button
													v-else-if="module.route && isModuleLocked(module)"
													type="button"
													class="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2 text-left opacity-60 transition-colors hover:bg-gray-50"
													@click="handleModuleClick(module)"
													:aria-label="`${module.name}（未授權）`"
												>
													<div
														class="relative flex h-8 w-8 flex-shrink-0 items-center justify-center"
													>
														<NuxtImg
															:src="`/system/${module.icon}.png`"
															:alt="module.name"
															class="icon-dark h-8 w-8 object-contain"
															width="200"
															height="200"
														/>
														<span
															class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-300"
														>
															<CommonLicenseLockIcon class="h-3 w-3 text-gray-600" />
														</span>
													</div>
													<span class="text-sm text-gray-500 2xl:text-base">{{ module.name }}</span>
												</button>
											</li>
										</ul>
									</div>
								</template>
							</div>
						</div>
					</Transition>
				</div>
				<!-- 分隔線 -->
				<div class="h-12 w-[2px] 2xl:h-14" :class="isDark ? 'bg-white/30' : 'bg-black/30'"></div>

				<!-- 3. 用戶設定 -->
				<div class="relative flex items-center" ref="userMenuRef">
					<button
						@click.stop="toggleUserMenu"
						:class="['icon-button', { 'icon-button-active': isUserMenuOpen }]"
						aria-label="用戶設定"
					>
						<img
							src="/layout/setting.svg"
							alt="用戶設定"
							:class="['h-12 w-12 2xl:h-14 2xl:w-14', isDark ? 'icon-svg-dark' : 'icon-svg-light']"
						/>
					</button>

					<!-- Dropdown Menu：使用者資訊區、用戶管理、登入登出 -->
					<Transition
						enter-active-class="transition ease-out duration-100"
						enter-from-class="transform opacity-0 scale-95"
						enter-to-class="transform opacity-100 scale-100"
						leave-active-class="transition ease-in duration-75"
						leave-from-class="transform opacity-100 scale-100"
						leave-to-class="transform opacity-0 scale-95"
					>
						<div
							v-if="isUserMenuOpen"
							@click.stop
							class="absolute right-0 top-full z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
						>
							<!-- 使用者資訊區 -->
							<div class="flex justify-around border-b border-gray-100 py-2">
								<p class="text-base font-semibold text-gray-700 2xl:text-lg">
									{{ userInfo.name }}
								</p>
								<p class="text-sm text-gray-500 2xl:text-base">
									{{ userInfo.role }}
								</p>
							</div>

							<!-- Menu Items -->
							<div class="py-1">
								<!-- 用戶管理 (僅管理員顯示) -->
								<NuxtLink
									v-if="isAdmin"
									to="/core/users"
									@click="closeUserMenu"
									class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 2xl:text-base"
								>
									<svg
										class="h-8 w-8 flex-shrink-0 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
										/>
									</svg>
									用戶管理
								</NuxtLink>

								<!-- 授權管理 (僅管理員顯示) -->
								<NuxtLink
									v-if="isAdmin"
									to="/core/license"
									@click="closeUserMenu"
									class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 2xl:text-base"
								>
									<svg
										class="h-8 w-8 flex-shrink-0 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
										/>
									</svg>
									授權管理
								</NuxtLink>

								<!-- Theme -->
								<a
									href="#"
									@click.prevent="handleMenuItemClick('theme')"
									class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 2xl:text-base"
								>
									<svg
										v-if="theme === 'light'"
										class="h-8 w-8 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
										/>
									</svg>
									<svg
										v-else
										class="h-8 w-8 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
										/>
									</svg>
									{{ theme === "light" ? "黑暗模式" : "明亮模式" }}
								</a>

								<!-- 登入登出 -->
								<a
									href="#"
									@click.prevent="handleMenuItemClick('logout')"
									class="mt-1 flex items-center gap-3 border-t border-gray-100 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 2xl:text-base"
								>
									<svg
										class="h-8 w-8 text-red-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
										/>
									</svg>
									登出
								</a>
							</div>
						</div>
					</Transition>
				</div>

				<!-- 4. 首頁 -->
				<button class="icon-button" aria-label="首頁">
					<NuxtLink to="/">
						<img
							src="/layout/home.svg"
							alt="首頁"
							:class="['h-12 w-12 2xl:h-14 2xl:w-14', isDark ? 'icon-svg-dark' : 'icon-svg-light']"
						/>
					</NuxtLink>
				</button>
			</div>
		</div>
	</header>
</template>

<script setup lang="ts">
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor"
import { useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useToast } from "~/composables/core/useToast"
import { useTheme } from "~/composables/core/useTheme"
import { hexRelativeLuminance, hexToRgba } from "~/utils/colorUtils"
import { LICENSE_MESSAGE_LOCKED, PERMISSION_MESSAGE_LOCKED } from "~/utils/licenseUtils"
import type { SystemModule } from "~/types/system"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import {
	MODULE_CATEGORY_ACCENT_HEX,
	MODULE_CATEGORY_LABELS,
	MODULE_CATEGORY_ORDER,
} from "~/constants/moduleCategories"

// 用戶選單狀態
const isUserMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// 更多功能選單狀態
const isMoreMenuOpen = ref(false)
const moreMenuRef = ref<HTMLElement | null>(null)

// 認證狀態
const { user, isAdmin, hasModulePermission, logout: authLogout } = useAuth()
const { isModuleLocked: isModuleLockedByLicense } = useLicense()
const toast = useToast()

/** 模組是否鎖住：授權不足或無該系統權限 */
const isModuleLocked = (module: SystemModule) =>
	isModuleLockedByLicense(module) || !hasModulePermission(module)

const handleModuleClick = (module: SystemModule) => {
	if (!hasModulePermission(module)) {
		toast.warning(PERMISSION_MESSAGE_LOCKED)
		closeMoreMenu()
		return
	}
	if (isModuleLockedByLicense(module)) {
		toast.warning(LICENSE_MESSAGE_LOCKED)
		closeMoreMenu()
	}
}

const roleLabels: Record<string, string> = {
	admin: "管理員",
	operator: "操作員",
	viewer: "檢視者",
}

const userInfo = computed(() => ({
	name: user.value?.username || "",
	role: user.value?.role ? roleLabels[user.value.role] || user.value.role : "",
}))

const route = useRoute()
const systemModulesApi = useModuleRegistry()

const currentModule = computed(() => systemModulesApi.getUiModuleByRoute(route.path))

const defaultHeaderBorderAccent = { dark: "#007878", light: "#00BAC2" } as const

const moduleAccentHex = computed(() => {
	const m = currentModule.value
	return m ? MODULE_CATEGORY_ACCENT_HEX[m.category] : null
})

const { theme, isDark, toggleTheme } = useTheme()

const headerBorderAccentColor = computed(
	() =>
		moduleAccentHex.value ??
		(isDark.value ? defaultHeaderBorderAccent.dark : defaultHeaderBorderAccent.light)
)

/** System Title 背景／陰影與淺色底用深字 */
const systemTitleChrome = computed(() => {
	const hex = moduleAccentHex.value
	if (!hex) {
		return null
	}
	return {
		style: {
			background: hexToRgba(hex, 0.88),
			boxShadow: `0 0 22px ${hexToRgba(hex, 0.42)}, inset 0 0 18px rgba(255, 255, 255, 0.08)`,
		},
		useDarkInk: hexRelativeLuminance(hex) > 0.55,
	}
})

const getMoreMenuCategoryLabelStyle = (category: SystemModule["category"]) => {
	const hex = MODULE_CATEGORY_ACCENT_HEX[category]
	return {
		backgroundColor: hex,
		color: hexRelativeLuminance(hex) > 0.55 ? "#1a1a1a" : "#ffffff",
	}
}

// 按分類分組的模組（標籤／順序與 SSOT `moduleCategories` 一致）
const categoryGroups = computed(() => {
	return MODULE_CATEGORY_ORDER.map((category) => {
		const modules = systemModulesApi.getModulesByCategory(category)
		return {
			category,
			label: MODULE_CATEGORY_LABELS[category],
			modules,
		}
	}).filter((group) => group.modules.length > 0)
})

// Active 狀態判斷
const isAlertLogActive = computed(() => route.path === "/core/alert-log")

// 未解決警報數量（僅消費 useAlertMonitor 的 ref，生命週期由 default.vue 管理）
const { unresolvedAlertCount, loadUnresolvedAlertCount } = useAlertMonitor()

const closeUserMenu = () => {
	isUserMenuOpen.value = false
}

const closeMoreMenu = () => {
	isMoreMenuOpen.value = false
}

// 切換用戶選單
const toggleUserMenu = () => {
	isUserMenuOpen.value = !isUserMenuOpen.value
	if (isUserMenuOpen.value) {
		closeMoreMenu()
	}
}

// 切換更多功能選單
const toggleMoreMenu = () => {
	isMoreMenuOpen.value = !isMoreMenuOpen.value
	if (isMoreMenuOpen.value) {
		closeUserMenu()
	}
}

// 處理選單項目點擊
const handleMenuItemClick = (action: string) => {
	switch (action) {
		case "theme":
			// 切換主題
			toggleTheme()
			break
		case "logout":
			// 處理登出
			handleLogout()
			break
	}
	closeUserMenu()
	closeMoreMenu()
}

// 處理登出
const handleLogout = async () => {
	authLogout()
	await navigateTo("/login")
}

// 點擊外部關閉選單
const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as Node
	if (userMenuRef.value && !userMenuRef.value.contains(target)) {
		closeUserMenu()
	}
	if (moreMenuRef.value && !moreMenuRef.value.contains(target)) {
		closeMoreMenu()
	}
}

// 監聽點擊事件
onMounted(() => {
	document.addEventListener("click", handleClickOutside)
	void systemModulesApi.ensureLoaded()
})

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside)
})

watch(
	() => route.path,
	() => {
		closeUserMenu()
		closeMoreMenu()
		// 當路由變化到警示紀錄頁面時，更新數量
		if (route.path === "/core/alert-log") {
			void loadUnresolvedAlertCount()
		}
	}
)
</script>

<style scoped>
.system-title {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 2.6rem;
	clip-path: polygon(
		22px 0,
		calc(100% - 22px) 0,
		100% 50%,
		calc(100% - 22px) 100%,
		22px 100%,
		0 50%
	);
	overflow: hidden;
	color: #ffffff;
}

/* 淺色分類底：深字＋深色圖示 */
.system-title--dark-ink {
	color: #1a1a1a;
}

/* 與選單相同來源之 PNG；深底用反白、淺底用實色 */
.system-title-module-icon {
	filter: brightness(0) invert(1);
}

.system-title--dark-ink .system-title-module-icon {
	filter: brightness(0) opacity(0.88);
}

.system-title::before {
	content: "";
	position: absolute;
	inset: 4px;
	clip-path: inherit;
	opacity: 0.45;
}

.icon-button {
	transition: all 0.2s ease;
	opacity: 0.8;
	border-radius: 8px;
	padding: 4px;
}

.icon-button:hover {
	opacity: 1;
}

.icon-button-active {
	opacity: 1;
	box-shadow:
		0 4px 12px rgba(0, 0, 0, 0.15),
		0 2px 4px rgba(0, 0, 0, 0.1);
}

.icon-dark {
	filter: brightness(0.65);
}

.icon-svg-light {
	filter: none;
}

.icon-svg-dark {
	filter: brightness(0) invert(1);
}

.logo-svg-light {
	filter: none;
}

.logo-svg-dark {
	filter: brightness(0) invert(1);
}
</style>
