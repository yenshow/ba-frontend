<template>
	<div class="group relative w-full py-4 2xl:py-5">
		<div v-if="isEditMode" class="absolute right-0 -top-4 z-20 flex items-center gap-2">
			<button type="button" :class="toolbarBtnClass" @click="handleResetOrder">還原預設</button>
			<button type="button" :class="toolbarBtnClass" @click="handleFinishEdit">完成</button>
		</div>

		<PermissionActionButton
			v-else-if="!isLoading"
			:allowed="canWrite"
			aria-label="調整系統模組順序"
			class="absolute right-0 -top-4 z-20 rounded-full bg-black/30 px-3 py-1 text-sm text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/50 2xl:text-base"
			@click="handleStartEdit"
		>
			調整順序
		</PermissionActionButton>

		<div class="flex items-center gap-2 2xl:gap-3">
			<!-- 固定占位，讓瀏覽／調整順序模式卡片寬度一致 -->
			<div :class="navSlotClass" :aria-hidden="isEditMode || undefined">
				<button
					v-if="!isEditMode"
					type="button"
					class="flex h-full w-full items-center justify-center rounded-full border-2 border-white/80 text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
					:disabled="!canNavigatePrevious || isLoading"
					aria-label="上一頁模組"
					@click="previousPage"
				>
					<svg
						class="h-6 w-6 2xl:h-8 2xl:w-8"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
			</div>

			<div class="relative min-w-0 flex-1">
				<div
					ref="measureRef"
					class="pointer-events-none absolute inset-x-0 top-0 -z-10 opacity-0"
					aria-hidden="true"
				>
					<div :class="MODULE_GRID_CLASS">
						<div
							v-for="index in MODULES_PER_PAGE"
							:key="`measure-${index}`"
							:class="tileClass"
							:style="MODULE_TILE_STYLE"
						/>
					</div>
				</div>

				<div v-if="isEditMode" class="show-scrollbar overflow-y-auto" :style="editScrollStyle">
					<div :class="MODULE_GRID_CLASS">
						<div
							v-for="module in orderedModules"
							:key="module.route"
							:aria-label="`${module.name}（拖曳以調整順序）`"
							draggable="true"
							:class="[
								tileClass,
								'cursor-move border-dashed bg-white/10 hover:bg-white/15',
								dragOverRoute === module.route && 'ring-2 ring-white/80',
							]"
							:style="MODULE_TILE_STYLE"
							@dragstart="(e) => handleDragStart(e, module.route)"
							@dragend="handleDragEnd"
							@dragover="(e) => handleDragOver(e, module.route)"
							@dragleave="handleDragLeave(module.route)"
							@drop="(e) => handleDrop(e, module.route)"
						>
							<div class="flex h-full flex-col items-center justify-center">
								<div :class="iconWrapClass">
									<NuxtImg
										:src="`/system/${module.icon}.png`"
										:alt="module.name"
										class="h-full w-full object-contain"
										draggable="false"
									/>
								</div>
								<h3 :class="titleClass">
									{{ module.name }}
								</h3>
							</div>
						</div>
					</div>
				</div>

				<div v-else :style="gridShellStyle">
					<div v-if="isLoading" :class="MODULE_GRID_CLASS" aria-hidden="true">
						<div
							v-for="index in MODULES_PER_PAGE"
							:key="`skeleton-${index}`"
							:class="[tileClass, 'animate-pulse border-white/30 bg-white/5']"
						>
							<div class="flex h-full flex-col items-center justify-center">
								<div :class="[iconWrapClass, 'rounded-full bg-white/15']" />
								<div class="mt-2 h-5 w-24 rounded bg-white/15 2xl:mt-3 2xl:h-6 2xl:w-28" />
							</div>
						</div>
					</div>

					<Transition v-else name="fade" mode="out-in">
						<div :key="currentPage" :class="MODULE_GRID_CLASS">
							<div
								v-for="module in pagedModules"
								:key="module.route"
								role="link"
								tabindex="0"
								:aria-label="module.name"
								:class="moduleTileClass(module)"
								:style="MODULE_TILE_STYLE"
								@click="handleModuleClick(module)"
								@keydown="(e) => handleModuleKeyDown(e, module)"
							>
								<div class="flex h-full flex-col items-center justify-center">
									<div :class="iconWrapClass">
										<NuxtImg
											:src="`/system/${module.icon}.png`"
											:alt="module.name"
											class="h-full w-full object-contain"
										/>
										<div
											v-if="isModuleLocked(module)"
											class="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/20 ring-1 ring-white/30 2xl:h-14 2xl:w-14"
										>
											<CommonLicenseLockIcon class="h-8 w-8 text-white 2xl:h-10 2xl:w-10" />
										</div>
									</div>
									<h3 :class="titleClass">
										{{ module.name }}
									</h3>
								</div>
							</div>
						</div>
					</Transition>
				</div>
			</div>

			<div :class="navSlotClass" :aria-hidden="isEditMode || undefined">
				<button
					v-if="!isEditMode"
					type="button"
					class="flex h-full w-full items-center justify-center rounded-full border-2 border-white/80 text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
					:disabled="!canNavigateNext || isLoading"
					aria-label="下一頁模組"
					@click="nextPage"
				>
					<svg
						class="h-6 w-6 2xl:h-8 2xl:w-8"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useAccessGate, useHomeRbac } from "~/composables/core/useAccessGate"
import { useHomeModuleOrder } from "~/composables/core/useHomeModuleOrder"
import { useToast } from "~/composables/core/useToast"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import type { CentralShellModule } from "~/config/centralModuleShell"
import { MSG_PERMISSION_LOCKED } from "~/utils/apiError"

const MODULES_PER_PAGE = 4
const MODULE_GRID_CLASS = "mx-auto grid w-full grid-cols-2 grid-rows-2 gap-4 2xl:gap-5"
const MODULE_TILE_STYLE = {
	boxShadow:
		"inset -7px 7px 7px rgba(255, 255, 255, 0.25), inset 7px -7px 10px rgba(0, 0, 0, 0.25)",
}
const toolbarBtnClass =
	"rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition-colors hover:bg-black/50 2xl:text-base"
const tileClass = "aspect-square overflow-hidden rounded-xl border-2 border-white/80"
const navSlotClass = "h-10 w-10 shrink-0 2xl:h-14 2xl:w-14"
const iconWrapClass = "relative flex h-24 w-24 items-center justify-center 2xl:h-28 2xl:w-28"
const titleClass =
	"mt-2 ms-[6px] whitespace-nowrap text-xl tracking-[6px] text-white 2xl:mt-3 2xl:text-2xl"

const moduleRegistry = useModuleRegistry()
const { orderedModules, resetToDefault, moveModule } = useHomeModuleOrder()
const accessGate = useAccessGate()
const { canWrite } = useHomeRbac()
const toast = useToast()

const isEditMode = ref(false)
const currentPage = ref(0)
const draggedRoute = ref<string | null>(null)
const dragOverRoute = ref<string | null>(null)
const measureRef = ref<HTMLElement | null>(null)
const lockedGridHeight = ref(0)

const isModuleLocked = (module: CentralShellModule) => accessGate.isModuleLocked(module)

const moduleTileClass = (module: CentralShellModule) =>
	isModuleLocked(module)
		? [tileClass, "cursor-not-allowed opacity-60 transition-opacity duration-200"]
		: [tileClass, "cursor-pointer"]

const isLoading = computed(
	() =>
		(moduleRegistry.isLoading.value && orderedModules.value.length === 0) ||
		!accessGate.isModuleAccessReady.value
)

const pagedModules = computed(() => {
	const start = currentPage.value * MODULES_PER_PAGE
	return orderedModules.value.slice(start, start + MODULES_PER_PAGE)
})

const lockedHeightStyle = computed(() =>
	lockedGridHeight.value > 0 ? { height: `${lockedGridHeight.value}px` } : undefined
)

const gridShellStyle = computed(() =>
	lockedGridHeight.value > 0 ? { minHeight: `${lockedGridHeight.value}px` } : undefined
)

const editScrollStyle = lockedHeightStyle

const canNavigatePrevious = computed(() => currentPage.value > 0)
const canNavigateNext = computed(
	() => (currentPage.value + 1) * MODULES_PER_PAGE < orderedModules.value.length
)

const syncGridHeight = () => {
	if (!measureRef.value) return
	lockedGridHeight.value = measureRef.value.offsetHeight
}

const handleModuleClick = async (module: CentralShellModule) => {
	await accessGate.ensureAccessReady()
	if (!accessGate.canAccessModule(module)) {
		toast.warning(MSG_PERMISSION_LOCKED)
		return
	}
	navigateTo(module.route)
}

const handleModuleKeyDown = (e: KeyboardEvent, module: CentralShellModule) => {
	if (e.key !== "Enter" && e.key !== " ") return
	e.preventDefault()
	handleModuleClick(module)
}

const handleStartEdit = () => {
	syncGridHeight()
	isEditMode.value = true
	currentPage.value = 0
	nextTick(syncGridHeight)
}

const handleFinishEdit = () => {
	isEditMode.value = false
	handleDragEnd()
	nextTick(syncGridHeight)
}

const handleResetOrder = () => {
	resetToDefault()
	toast.success(TOAST.HOME_MODULE_ORDER_RESET)
}

const handleDragStart = (event: DragEvent, route: string) => {
	draggedRoute.value = route
	event.dataTransfer?.setData("text/plain", route)
	if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
}

const handleDragEnd = () => {
	draggedRoute.value = null
	dragOverRoute.value = null
}

const handleDragOver = (event: DragEvent, route: string) => {
	if (!draggedRoute.value || draggedRoute.value === route) return
	event.preventDefault()
	if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
	dragOverRoute.value = route
}

const handleDragLeave = (route: string) => {
	if (dragOverRoute.value === route) dragOverRoute.value = null
}

const handleDrop = (event: DragEvent, targetRoute: string) => {
	event.preventDefault()
	const fromRoute = draggedRoute.value ?? event.dataTransfer?.getData("text/plain")
	if (!fromRoute || fromRoute === targetRoute) return
	moveModule(fromRoute, targetRoute)
	handleDragEnd()
}

watch(
	() => orderedModules.value.length,
	() => {
		const maxPage = Math.max(0, Math.ceil(orderedModules.value.length / MODULES_PER_PAGE) - 1)
		if (currentPage.value > maxPage) currentPage.value = maxPage
	}
)

watch(isLoading, (loading) => {
	if (!loading) nextTick(syncGridHeight)
})

let measureResizeObserver: ResizeObserver | null = null

onMounted(() => {
	if (!import.meta.client) return
	nextTick(() => {
		syncGridHeight()
		if (!measureRef.value) return
		measureResizeObserver = new ResizeObserver(() => syncGridHeight())
		measureResizeObserver.observe(measureRef.value)
	})
})

onUnmounted(() => {
	measureResizeObserver?.disconnect()
	measureResizeObserver = null
})

const previousPage = () => {
	if (canNavigatePrevious.value) currentPage.value--
}

const nextPage = () => {
	if (canNavigateNext.value) currentPage.value++
}
</script>
