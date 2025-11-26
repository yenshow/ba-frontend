<template>
	<header class="bg-white border-b-[8px] xl:border-b-[12px] 2xl:border-b-[16px] border-[#00BAC2] w-full">
		<div class="flex justify-between items-end h-[64px] xl:h-[88px] 2xl:h-[96px] pb-2 xl:pb-3 2xl:pb-4 px-8 xl:px-12 2xl:px-16">
			<!-- Logo -->
			<div class="h-[56px] xl:h-[64px] 2xl:h-[72px]">
				<NuxtImg src="/layout/logo.png" alt="YENSHOW" class="h-full object-contain" width="full" height="72" loading="eager" preload />
			</div>

			<!-- System Title -->
			<div class="flex-1 flex justify-center">
				<div v-if="currentModuleName" class="system-title">
					<span class="text-3xl 2xl:text-4xl font-semibold tracking-[8px] ms-[8px] 2xl:tracking-[16px] 2xl:ms-[16px]">
						{{ currentModuleName }}
					</span>
				</div>
			</div>

			<!-- Right Icons -->
			<div class="flex items-center space-x-4 xl:space-x-6 2xl:space-x-8">
				<button :class="['icon-button', { 'icon-button-active': isAlertLogActive }]">
					<NuxtImg src="/layout/alert-log.png" alt="警示紀錄" class="w-8 h-8 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 object-contain" width="56" height="56" />
				</button>
				<div class="relative flex items-center" ref="moreMenuRef">
					<button @click.stop="toggleMoreMenu" :class="['icon-button', { 'icon-button-active': isMoreMenuOpen }]">
						<NuxtImg src="/layout/more-functions.png" alt="更多功能" class="w-8 h-8 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 object-contain" width="56" height="56" />
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
							class="absolute right-0 top-full mt-2 w-48 h-[540px] 2xl:h-[600px] bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 flex flex-col overflow-hidden"
						>
							<div class="flex-1 overflow-y-auto">
								<div v-if="primaryModules.length" class="pb-2">
									<p class="px-4 py-2 text-sm 2xl:text-base text-gray-500">主要系統</p>
									<ul class="space-y-0.5">
										<li v-for="module in primaryModules" :key="module.id">
											<NuxtLink :to="module.route" @click="closeMoreMenu" class="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors">
												<div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
													<NuxtImg :src="`/system/${module.icon}.png`" :alt="module.name" class="w-8 h-8 object-contain icon-dark" width="200" height="200" />
												</div>
												<span class="text-sm 2xl:text-base text-gray-700">{{ module.name }}</span>
											</NuxtLink>
										</li>
									</ul>
								</div>
								<div v-if="extendedModules.length" class="pt-2 border-t border-gray-100">
									<p class="px-4 py-2 text-sm 2xl:text-base text-gray-500">擴充功能</p>
									<ul class="space-y-0.5">
										<li v-for="module in extendedModules" :key="module.id">
											<NuxtLink :to="module.route" @click="closeMoreMenu" class="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors">
												<div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
													<NuxtImg :src="`/system/${module.icon}.png`" :alt="module.name" class="w-8 h-8 object-contain icon-dark" width="200" height="200" />
												</div>
												<span class="text-sm 2xl:text-base text-gray-700">{{ module.name }}</span>
											</NuxtLink>
										</li>
									</ul>
								</div>
							</div>
						</div>
					</Transition>
				</div>
				<div class="w-[1.5px] h-8 xl:h-12 2xl:h-14 bg-black/30"></div>

				<!-- User Info Dropdown -->
				<div class="relative flex items-center" ref="userMenuRef">
					<button @click.stop="toggleUserMenu" :class="['icon-button', { 'icon-button-active': isUserMenuOpen }]">
						<NuxtImg src="/layout/user-info.png" alt="用戶資訊" class="w-8 h-8 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 object-contain" width="56" height="56" />
					</button>

					<!-- Dropdown Menu -->
					<Transition
						enter-active-class="transition ease-out duration-100"
						enter-from-class="transform opacity-0 scale-95"
						enter-to-class="transform opacity-100 scale-100"
						leave-active-class="transition ease-in duration-75"
						leave-from-class="transform opacity-100 scale-100"
						leave-to-class="transform opacity-0 scale-95"
					>
						<div v-if="isUserMenuOpen" @click.stop class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
							<!-- User Info Section (if logged in) -->
							<div v-if="isLoggedIn" class="px-4 py-3 border-b border-gray-100">
								<p class="text-sm 2xl:text-base font-semibold text-gray-900">{{ userInfo.name }}</p>
								<p class="text-xs 2xl:text-sm text-gray-500 mt-1">{{ userInfo.email }}</p>
							</div>

							<!-- Menu Items -->
							<div class="py-1">
								<!-- Login (if not logged in) -->
								<NuxtLink
									v-if="!isLoggedIn"
									to="/login"
									@click="closeUserMenu"
									class="flex items-center gap-3 px-4 py-2 text-sm 2xl:text-base text-gray-700 hover:bg-gray-100 transition-colors"
								>
									<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
										/>
									</svg>
									登入
								</NuxtLink>

								<!-- Profile (if logged in) -->
								<a
									v-if="isLoggedIn"
									href="#"
									@click.prevent="handleMenuItemClick('profile')"
									class="flex items-center gap-3 px-4 py-2 text-sm 2xl:text-base text-gray-700 hover:bg-gray-100 transition-colors"
								>
									<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
									個人資料
								</a>

								<!-- Account Settings (if logged in) -->
								<a
									v-if="isLoggedIn"
									href="#"
									@click.prevent="handleMenuItemClick('settings')"
									class="flex items-center gap-3 px-4 py-2 text-sm 2xl:text-base text-gray-700 hover:bg-gray-100 transition-colors"
								>
									<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
										/>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									帳號設定
								</a>

								<!-- Divider (if logged in) -->
								<div v-if="isLoggedIn" class="border-t border-gray-100 my-1"></div>

								<!-- Language -->
								<a
									href="#"
									@click.prevent="handleMenuItemClick('language')"
									class="flex items-center gap-3 px-4 py-2 text-sm 2xl:text-base text-gray-700 hover:bg-gray-100 transition-colors"
								>
									<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
										/>
									</svg>
									語言設定
								</a>

								<!-- Theme -->
								<a
									href="#"
									@click.prevent="handleMenuItemClick('theme')"
									class="flex items-center gap-3 px-4 py-2 text-sm 2xl:text-base text-gray-700 hover:bg-gray-100 transition-colors"
								>
									<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
										/>
									</svg>
									主題設定
								</a>

								<!-- Logout (if logged in) -->
								<a
									v-if="isLoggedIn"
									href="#"
									@click.prevent="handleMenuItemClick('logout')"
									class="flex items-center gap-3 px-4 py-2 text-sm 2xl:text-base text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
								>
									<svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

				<button class="icon-button">
					<NuxtLink to="/">
						<NuxtImg src="/layout/home.png" alt="首頁" class="w-8 h-8 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 object-contain" width="56" height="56" />
					</NuxtLink>
				</button>
			</div>
		</div>
	</header>
</template>

<script setup lang="ts">
// 用戶選單狀態
const isUserMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

// 更多功能選單狀態
const isMoreMenuOpen = ref(false);
const moreMenuRef = ref<HTMLElement | null>(null);

// 登入狀態（模擬數據，之後可從 store 或 API 獲取）
const isLoggedIn = ref(false);
const userInfo = ref({
	name: "張三",
	email: "zhang.san@example.com"
});

const { getModuleByRoute, getModulesByCategory } = useSystem();
const route = useRoute();

const currentModule = computed(() => getModuleByRoute(route.path));
const currentModuleName = computed(() => currentModule.value?.name ?? "");
const primaryModules = computed(() => getModulesByCategory("primary"));
const extendedModules = computed(() => getModulesByCategory("extended"));

// Active 狀態判斷
const isAlertLogActive = computed(() => route.path === "/system/alert-log");

const closeUserMenu = () => {
	isUserMenuOpen.value = false;
};

const closeMoreMenu = () => {
	isMoreMenuOpen.value = false;
};

// 切換用戶選單
const toggleUserMenu = () => {
	isUserMenuOpen.value = !isUserMenuOpen.value;
	if (isUserMenuOpen.value) {
		closeMoreMenu();
	}
};

// 切換更多功能選單
const toggleMoreMenu = () => {
	isMoreMenuOpen.value = !isMoreMenuOpen.value;
	if (isMoreMenuOpen.value) {
		closeUserMenu();
	}
};

// 處理選單項目點擊
const handleMenuItemClick = (action: string) => {
	switch (action) {
		case "profile":
			// 跳轉到個人資料頁面
			navigateTo("/profile");
			break;
		case "settings":
			// 跳轉到帳號設定頁面
			navigateTo("/settings");
			break;
		case "language":
			// 打開語言設定（可以顯示語言選擇器）
			console.log("語言設定");
			break;
		case "theme":
			// 切換主題
			console.log("主題設定");
			break;
		case "logout":
			// 處理登出
			handleLogout();
			break;
	}
	closeUserMenu();
	closeMoreMenu();
};

// 處理登出
const handleLogout = () => {
	// 這裡可以清除 token、session 等
	isLoggedIn.value = false;
	// 可選：跳轉到登入頁
	// navigateTo("/login");
};

// 點擊外部關閉選單
const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as Node;
	if (userMenuRef.value && !userMenuRef.value.contains(target)) {
		closeUserMenu();
	}
	if (moreMenuRef.value && !moreMenuRef.value.contains(target)) {
		closeMoreMenu();
	}
};

// 監聽點擊事件
onMounted(() => {
	document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside);
});

watch(
	() => route.path,
	() => {
		closeUserMenu();
		closeMoreMenu();
	}
);
</script>

<style scoped>
.system-title {
	position: relative;
	display: inline-flex;
	align-items: center;
	padding: 0.75rem 2.6rem;
	background: rgba(0, 186, 194, 0.8);
	box-shadow:
		0 0 22px rgba(19, 168, 175, 0.42),
		inset 0 0 18px rgba(255, 255, 255, 0.08);
	clip-path: polygon(22px 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 22px 100%, 0 50%);
	overflow: hidden;
	color: #ffffff;
}

.system-title::before {
	content: "";
	position: absolute;
	inset: 4px;
	clip-path: inherit;
	opacity: 0.45;
}

.system-title::after {
	content: "";
	position: absolute;
	top: -12%;
	left: -45%;
	width: 45%;
	height: 124%;
	background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
	opacity: 0.6;
	transform: skewX(-17deg);
	animation: system-title-scan 3.8s linear infinite;
}

@keyframes system-title-scan {
	0% {
		transform: translateX(0) skewX(-15deg);
	}
	100% {
		transform: translateX(290%) skewX(-15deg);
	}
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
</style>
