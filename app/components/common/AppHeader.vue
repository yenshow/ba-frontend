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
				<!-- Modbus 設備管理 -->
				<button :class="['icon-button', { 'icon-button-active': isModbusDevicesActive }]">
					<NuxtLink to="/system/modbus-devices">
						<NuxtImg src="/layout/modbus.png" alt="設備管理" class="w-8 h-8 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 object-contain" width="56" height="56" />
					</NuxtLink>
				</button>
				<!-- 警示紀錄 -->
				<button :class="['icon-button', { 'icon-button-active': isAlertLogActive }]">
					<NuxtImg src="/layout/alert-log.png" alt="警示紀錄" class="w-8 h-8 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 object-contain" width="56" height="56" />
				</button>
				<!-- 更多功能 -->
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

				<!-- 用戶資訊 -->
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
						<div v-if="isUserMenuOpen" @click.stop class="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
							<!-- User Info Section -->
							<div class="py-2 flex justify-around border-b border-gray-100">
								<p class="text-base 2xl:text-lg font-semibold text-gray-700">{{ userInfo.name }}</p>
								<p class="text-sm 2xl:text-base text-gray-500">{{ userInfo.role }}</p>
							</div>

							<!-- Menu Items -->
							<div class="py-1">
								<!-- User Management (Admin only) -->
								<NuxtLink
									v-if="isAdmin"
									to="/system/users"
									@click="closeUserMenu"
									class="flex items-center gap-3 px-4 py-2 text-sm 2xl:text-base text-gray-700 hover:bg-gray-100 transition-colors"
								>
									<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
										/>
									</svg>
									用戶管理
								</NuxtLink>

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

								<!-- Logout -->
								<a
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

				<!-- 首頁 -->
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

// 認證狀態
const { user, isAdmin, logout: authLogout } = useAuth();

const roleLabels: Record<string, string> = {
	admin: "管理員",
	operator: "操作員",
	viewer: "檢視者"
};

const userInfo = computed(() => ({
	name: user.value?.username || "",
	role: user.value?.role ? roleLabels[user.value.role] || user.value.role : ""
}));

const { getModuleByRoute, getModulesByCategory } = useSystem();
const route = useRoute();

const currentModule = computed(() => getModuleByRoute(route.path));
const currentModuleName = computed(() => currentModule.value?.name ?? "");
const primaryModules = computed(() => getModulesByCategory("primary"));
const extendedModules = computed(() => getModulesByCategory("extended"));

// Active 狀態判斷
const isModbusDevicesActive = computed(() => route.path === "/system/modbus-devices");
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
const handleLogout = async () => {
	authLogout();
	await navigateTo("/login");
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
