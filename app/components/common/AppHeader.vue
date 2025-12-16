<template>
  <header
    class="w-full border-b-[8px] border-[#00BAC2] bg-white xl:border-b-[12px] 2xl:border-b-[16px]"
  >
    <div
      class="flex h-[64px] items-end justify-between px-8 pb-2 xl:h-[88px] xl:px-12 xl:pb-3 2xl:h-[96px] 2xl:px-16 2xl:pb-4"
    >
      <!-- Logo -->
      <div class="h-[56px] xl:h-[64px] 2xl:h-[72px]">
        <NuxtImg
          src="/layout/logo.png"
          alt="YENSHOW"
          class="h-full object-contain"
          width="full"
          height="72"
          loading="eager"
          preload
        />
      </div>

      <!-- System Title -->
      <div class="flex flex-1 justify-center">
        <div v-if="currentModuleName" class="system-title">
          <span
            class="ms-[8px] text-3xl font-semibold tracking-[8px] 2xl:ms-[16px] 2xl:text-4xl 2xl:tracking-[16px]"
          >
            {{ currentModuleName }}
          </span>
        </div>
      </div>

      <!-- Right Icons -->
      <div class="flex items-center space-x-4 xl:space-x-6 2xl:space-x-8">
        <!-- 設備管理 -->
        <button
          :class="['icon-button', { 'icon-button-active': isDevicesActive }]"
        >
          <NuxtLink to="/system/devices">
            <NuxtImg
              src="/layout/devices.png"
              alt="設備管理"
              class="h-8 w-8 object-contain xl:h-12 xl:w-12 2xl:h-14 2xl:w-14"
              width="56"
              height="56"
            />
          </NuxtLink>
        </button>
        <!-- 警示紀錄 -->
        <button
          :class="['icon-button', { 'icon-button-active': isAlertLogActive }]"
        >
          <NuxtLink to="/system/alert-log">
            <NuxtImg
              src="/layout/alert-log.png"
              alt="警示紀錄"
              class="h-8 w-8 object-contain xl:h-12 xl:w-12 2xl:h-14 2xl:w-14"
              width="56"
              height="56"
            />
          </NuxtLink>
        </button>
        <!-- 更多功能 -->
        <div class="relative flex items-center" ref="moreMenuRef">
          <button
            @click.stop="toggleMoreMenu"
            :class="['icon-button', { 'icon-button-active': isMoreMenuOpen }]"
          >
            <NuxtImg
              src="/layout/more-functions.png"
              alt="更多功能"
              class="h-8 w-8 object-contain xl:h-12 xl:w-12 2xl:h-14 2xl:w-14"
              width="56"
              height="56"
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
              <div class="flex-1 overflow-y-auto">
                <div v-if="primaryModules.length" class="pb-2">
                  <p class="px-4 py-2 text-sm text-gray-500 2xl:text-base">
                    主要系統
                  </p>
                  <ul class="space-y-0.5">
                    <li v-for="module in primaryModules" :key="module.id">
                      <NuxtLink
                        :to="module.route"
                        @click="closeMoreMenu"
                        class="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-gray-100"
                      >
                        <div
                          class="flex h-8 w-8 flex-shrink-0 items-center justify-center"
                        >
                          <NuxtImg
                            :src="`/system/${module.icon}.png`"
                            :alt="module.name"
                            class="icon-dark h-8 w-8 object-contain"
                            width="200"
                            height="200"
                          />
                        </div>
                        <span class="text-sm text-gray-700 2xl:text-base">{{
                          module.name
                        }}</span>
                      </NuxtLink>
                    </li>
                  </ul>
                </div>
                <div
                  v-if="extendedModules.length"
                  class="border-t border-gray-100 pt-2"
                >
                  <p class="px-4 py-2 text-sm text-gray-500 2xl:text-base">
                    擴充功能
                  </p>
                  <ul class="space-y-0.5">
                    <li v-for="module in extendedModules" :key="module.id">
                      <NuxtLink
                        :to="module.route"
                        @click="closeMoreMenu"
                        class="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-gray-100"
                      >
                        <div
                          class="flex h-8 w-8 flex-shrink-0 items-center justify-center"
                        >
                          <NuxtImg
                            :src="`/system/${module.icon}.png`"
                            :alt="module.name"
                            class="icon-dark h-8 w-8 object-contain"
                            width="200"
                            height="200"
                          />
                        </div>
                        <span class="text-sm text-gray-700 2xl:text-base">{{
                          module.name
                        }}</span>
                      </NuxtLink>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Transition>
        </div>
        <div class="h-8 w-[1.5px] bg-black/30 xl:h-12 2xl:h-14"></div>

        <!-- 用戶資訊 -->
        <div class="relative flex items-center" ref="userMenuRef">
          <button
            @click.stop="toggleUserMenu"
            :class="['icon-button', { 'icon-button-active': isUserMenuOpen }]"
          >
            <NuxtImg
              src="/layout/user-info.png"
              alt="用戶資訊"
              class="h-8 w-8 object-contain xl:h-12 xl:w-12 2xl:h-14 2xl:w-14"
              width="56"
              height="56"
            />
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
            <div
              v-if="isUserMenuOpen"
              @click.stop
              class="absolute right-0 top-full z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
            >
              <!-- User Info Section -->
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
                <!-- User Management (Admin only) -->
                <NuxtLink
                  v-if="isAdmin"
                  to="/system/users"
                  @click="closeUserMenu"
                  class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 2xl:text-base"
                >
                  <svg
                    class="h-8 w-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
                  class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 2xl:text-base"
                >
                  <svg
                    class="h-8 w-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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

        <!-- 首頁 -->
        <button class="icon-button">
          <NuxtLink to="/">
            <NuxtImg
              src="/layout/home.png"
              alt="首頁"
              class="h-8 w-8 object-contain xl:h-12 xl:w-12 2xl:h-14 2xl:w-14"
              width="56"
              height="56"
            />
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
  viewer: "檢視者",
};

const userInfo = computed(() => ({
  name: user.value?.username || "",
  role: user.value?.role ? roleLabels[user.value.role] || user.value.role : "",
}));

const { getModuleByRoute, getModulesByCategory } = useSystem();
const route = useRoute();

const currentModule = computed(() => getModuleByRoute(route.path));
const currentModuleName = computed(() => currentModule.value?.name ?? "");
const primaryModules = computed(() => getModulesByCategory("primary"));
const extendedModules = computed(() => getModulesByCategory("extended"));

// Active 狀態判斷
const isDevicesActive = computed(() => route.path === "/system/devices");
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
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
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
