<template>
	<div class="relative">
		<!-- 左側切換按鈕 -->
		<button
			type="button"
			class="absolute left-0 top-1/2 z-10 flex h-14 w-14 -translate-x-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 2xl:h-20 2xl:w-20 2xl:-translate-x-20"
			:disabled="!canNavigatePrevious || isLoading"
			aria-label="上一頁模組"
			@click="previousPage"
		>
			<svg class="h-8 w-8 2xl:h-12 2xl:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 19l-7-7 7-7" />
			</svg>
		</button>

		<!-- 模組網格：使用過渡動畫 -->
		<div class="min-h-[420px] 2xl:min-h-[528px]">
			<Transition name="fade" mode="out-in">
				<div
					v-if="!isLoading"
					:key="`modules-${currentPage}-${systemModules.length}`"
					class="grid grid-cols-4 gap-x-6 gap-y-3 px-3 py-6 2xl:gap-x-8 2xl:gap-y-4 2xl:px-4 2xl:py-8"
				>
					<template v-for="module in currentModules" :key="module.id">
						<div
							v-if="module.route"
							role="link"
							tabindex="0"
							:aria-label="module.name"
							:class="[
								'aspect-square cursor-pointer overflow-hidden rounded-xl border-2 border-white/80 transition-all hover:bg-white/5',
								isModuleLocked(module) && 'opacity-60',
							]"
							:style="{
								boxShadow:
									'inset -7px 7px 7px rgba(255, 255, 255, 0.25), inset 7px -7px 10px rgba(0, 0, 0, 0.25)',
							}"
							@click="handleModuleClick(module)"
							@keydown="(e) => handleModuleKeyDown(e, module)"
						>
							<div class="flex h-full flex-col items-center justify-center">
								<div class="flex items-center justify-center">
									<div
										class="relative flex h-24 w-24 items-center justify-center 2xl:h-28 2xl:w-28"
									>
										<NuxtImg
											:src="`/system/${module.icon}.png`"
											:alt="module.name"
											class="h-full w-full object-contain"
										/>
										<!-- 鎖頭（未授權） -->
										<div
											v-if="isModuleLocked(module)"
											class="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/20 ring-1 ring-white/30 2xl:h-16 2xl:w-16"
										>
											<CommonLicenseLockIcon class="h-8 w-8 text-white 2xl:h-12 2xl:w-12" />
										</div>
									</div>
								</div>
								<div class="mt-2 2xl:mt-4">
									<h3
										class="ms-[6px] whitespace-nowrap text-xl tracking-[6px] text-white 2xl:text-2xl"
									>
										{{ module.name }}
									</h3>
								</div>
							</div>
						</div>
					</template>
				</div>
			</Transition>
		</div>

		<!-- 右側切換按鈕 -->
		<button
			type="button"
			class="absolute right-0 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 translate-x-11 items-center justify-center rounded-full border-2 border-white/80 text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 2xl:h-20 2xl:w-20 2xl:translate-x-20"
			:disabled="!canNavigateNext || isLoading"
			aria-label="下一頁模組"
			@click="nextPage"
		>
			<svg class="h-8 w-8 2xl:h-12 2xl:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
</template>

<script setup lang="ts">
import { useLicense } from "~/composables/core/useLicense"
import { useToast } from "~/composables/core/useToast"
import { LICENSE_MESSAGE_LOCKED, PERMISSION_MESSAGE_LOCKED } from "~/utils/licenseUtils"
import type { SystemModule } from "~/types/system"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"

const moduleRegistry = useModuleRegistry()
const { isModuleLocked: isModuleLockedByLicense } = useLicense()
const toast = useToast()

/** 模組是否鎖住：授權不足或無該系統權限 */
const isModuleLocked = (module: SystemModule) =>
	isModuleLockedByLicense(module) || !moduleRegistry.canAccessModule(module)

const systemModules = computed(() => moduleRegistry.getAllModules())

const handleModuleClick = (module: SystemModule) => {
	if (!moduleRegistry.canAccessModule(module)) {
		toast.warning(PERMISSION_MESSAGE_LOCKED)
		return
	}
	if (isModuleLockedByLicense(module)) {
		toast.warning(LICENSE_MESSAGE_LOCKED)
		return
	}
	navigateTo(module.route)
}

const handleModuleKeyDown = (e: KeyboardEvent, module: SystemModule) => {
	if (e.key !== "Enter" && e.key !== " ") return
	e.preventDefault()
	handleModuleClick(module)
}

const currentPage = ref(0)
const isLoading = ref(true)

// 追蹤視窗寬度以實現響應式
// 在 SSR 和 CSR 初期都使用相同的初始值，避免 hydration mismatch
const windowWidth = ref(1024)

// 根據螢幕尺寸計算每頁顯示的模組數量
const modulesPerPage = computed(() => {
	// lg: 1024px, xl: 1280px, 2xl: 1536px
	if (windowWidth.value >= 1536) {
		return 8 // 2xl: 2行 × 4列 = 8個
	} else if (windowWidth.value >= 1280) {
		return 8 // xl: 2行 × 4列 = 8個
	} else if (windowWidth.value >= 1024) {
		return 6 // lg: 2行 × 3列 = 6個
	} else {
		return 8 // origin: 2行 × 4列 = 8個
	}
})

const currentModules = computed(() => {
	const start = currentPage.value * modulesPerPage.value
	return systemModules.value.slice(start, start + modulesPerPage.value)
})

const canNavigatePrevious = computed(() => currentPage.value > 0)

const canNavigateNext = computed(
	() => (currentPage.value + 1) * modulesPerPage.value < systemModules.value.length
)

// 監聽視窗大小變化，重置頁面以避免顯示空頁面
let handleResize: (() => void) | null = null
let lastModulesPerPage = 8 // 初始值

onMounted(() => {
	void moduleRegistry.ensureLoaded()
	// onMounted 只在客戶端執行，所以在這裡更新視窗寬度是安全的
	// 這確保 SSR 和 CSR 初始狀態一致（都使用 1024），然後在客戶端掛載後更新
	windowWidth.value = window.innerWidth
	lastModulesPerPage = modulesPerPage.value

	handleResize = () => {
		windowWidth.value = window.innerWidth
		const newModulesPerPage = modulesPerPage.value
		// 如果每頁數量改變，重置到第一頁以避免顯示空頁面
		if (newModulesPerPage !== lastModulesPerPage) {
			currentPage.value = 0
			lastModulesPerPage = newModulesPerPage
		}
	}

	window.addEventListener("resize", handleResize)

	// 模擬載入時間，確保骨架屏至少顯示一小段時間以提供更好的 UX
	setTimeout(() => {
		isLoading.value = false
	}, 300)
})

onUnmounted(() => {
	if (handleResize) {
		window.removeEventListener("resize", handleResize)
	}
})

const nextPage = () => {
	if (canNavigateNext.value) {
		currentPage.value++
	}
}

const previousPage = () => {
	if (canNavigatePrevious.value) {
		currentPage.value--
	}
}
</script>
