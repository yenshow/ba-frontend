<template>
	<div>
		<!-- 影像監控系統頁面內容 - 參考其他系統版面 -->
		<div
			class="flex min-w-0 flex-col items-stretch justify-center lg:flex-row"
			:class="isOverviewCollapsed ? 'gap-0' : 'gap-4 xl:gap-6 2xl:gap-8'"
		>
			<section class="relative min-w-0 flex-1 2xl:flex-[1.3]">
				<Transition name="fade" mode="out-in">
					<button
						v-if="isOverviewCollapsed"
						key="overview-expand-tab"
						type="button"
						class="absolute -right-px top-24 z-20 flex flex-col items-center gap-2 rounded-l-xl border-2 border-r-0 border-white/80 bg-white/30 px-2.5 py-4 text-white shadow-md transition-colors hover:bg-white/40 2xl:top-28"
						aria-label="展開列表"
						title="展開列表"
						@click="isOverviewCollapsed = false"
					>
						<span
							class="text-sm font-semibold tracking-[0.35em] text-white xl:text-base"
							style="writing-mode: vertical-rl"
						>
							列表
						</span>
					</button>
				</Transition>

				<div
					class="flex min-h-[664px] flex-col monitoring-panel overflow-hidden rounded-2xl p-6 2xl:min-h-[848px] 2xl:p-8"
				>
					<!-- 控制面板 -->
					<div class="mb-4">
						<SurveillanceControlPanel
							v-model="gridLayout"
							:total-cameras="cameras.length"
							:view-count="monitorViews.length"
							:max-views="parseInt(gridLayout)"
							@fullscreen="isFullscreenOpen = true"
						/>
					</div>

					<!-- 監控網格區 -->
					<div class="min-h-[400px] flex-1">
						<Transition name="fade" mode="out-in">
							<!-- 錯誤狀態 -->
							<div v-if="loadError" key="error" class="flex h-full items-center justify-center">
								<div class="rounded-lg bg-red-50/90 p-6 text-center dark:bg-red-900/30">
									<p class="text-red-600 dark:text-red-400">{{ loadError }}</p>
									<button
										@click="loadCameras"
										class="mt-4 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
									>
										重試
									</button>
								</div>
							</div>

							<!-- 監控網格 -->
							<div v-else-if="monitorViews.length > 0" key="grid">
								<SurveillanceCameraGrid
									:cameras="cameras"
									:views="monitorViews"
									:layout="gridLayout"
									@remove="handleRemoveView"
									@reload="handleReloadView"
								/>
							</div>

							<!-- 提示：如何將攝影機加入監控畫面 -->
							<div
								v-else
								key="empty"
								class="flex h-full min-h-[680px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
							>
								<div>
									<svg
										class="mx-auto mb-4 h-16 w-16 text-white/60"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
									<p class="text-2xl text-white/90 2xl:text-3xl">尚未加入攝影機</p>
									<p class="mt-2 text-base text-white/70 2xl:text-lg">
										請於側邊列表點選攝影機以加入監控畫面
									</p>
								</div>
							</div>
						</Transition>
					</div>
				</div>
			</section>

			<aside
				class="overview-sidebar"
				:class="isOverviewCollapsed ? 'overview-sidebar--collapsed' : 'overview-sidebar--expanded'"
				:aria-hidden="isOverviewCollapsed"
			>
				<div
					class="relative flex h-full min-h-0 flex-col monitoring-panel overflow-hidden rounded-2xl py-8"
				>
					<Transition name="fade" mode="out-in">
						<div
							v-if="!isOverviewCollapsed"
							key="overview-panel"
							class="flex h-full min-h-0 flex-col overflow-hidden"
						>
							<button
								type="button"
								class="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 text-white transition-colors hover:bg-white/20 2xl:h-12 2xl:w-12"
								aria-expanded="true"
								aria-label="收合列表"
								title="收合列表"
								@click="isOverviewCollapsed = true"
							>
								<svg
									class="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>

							<div class="mb-4 border-b border-white/30 px-4 pb-4">
								<div class="flex flex-col gap-4">
									<div class="flex items-center justify-center">
										<h2 class="text-xl font-semibold text-white xl:text-2xl 2xl:text-3xl">
											攝影機列表
										</h2>
										<span
											class="ml-2 rounded-full bg-white/20 px-2.5 py-0.5 text-base font-medium text-white backdrop-blur-sm 2xl:text-lg"
										>
											{{ filteredCameras.length }}
										</span>
									</div>
									<FilterDropdown
										v-model="surveillanceGroupFilter"
										:options="surveillanceGroupFilterOptions"
										placeholder="全部"
										text-size="text-sm 2xl:text-base"
									/>
								</div>
							</div>

							<div class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
								<div
									v-if="filteredCameraCategoryGroups.length === 0"
									class="py-8 text-center text-sm text-white/60 xl:text-base"
								>
									{{ cameras.length === 0 ? "沒有攝影機" : "此群組無攝影機" }}
								</div>
								<section
									v-for="(group, groupIndex) in filteredCameraCategoryGroups"
									:key="group.code"
									:class="['space-y-3', groupIndex > 0 ? 'border-t border-white/20 pt-6' : '']"
								>
									<h3 class="text-sm font-medium text-cyan-200/90 2xl:text-base">
										{{ group.label }}
										<span class="ml-1.5 text-xs font-normal text-white/50 2xl:text-sm">
											({{ group.items.length }})
										</span>
									</h3>
									<SurveillanceCameraCard
										v-for="camera in group.items"
										:key="camera.id"
										:camera="camera"
										:is-selected="selectedCameraIds.includes(camera.id)"
										:connectivity-status="deviceConnectivity.getStatus(camera.id)"
										:connectivity-loading="deviceConnectivity.isLoading(camera.id)"
										@select="handleCameraSelect"
									/>
								</section>
							</div>
						</div>
					</Transition>
				</div>
			</aside>
		</div>
	</div>

	<SurveillanceFullscreenGridDialog
		v-model="isFullscreenOpen"
		:cameras="cameras"
		:views="monitorViews"
		:layout="gridLayout"
		@remove="handleRemoveView"
		@reload="handleReloadView"
	/>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import { onMounted, onBeforeUnmount, watch, ref } from "vue"
import type { GridLayout, MonitorView } from "~/types/surveillance"
import type { CameraDeviceConfig } from "~/types/device"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useStreamStatus } from "~/composables/monitoring/useStreamStatus"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useDeviceConnectivity } from "~/composables/systems/devices/useDeviceConnectivity"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import SurveillanceControlPanel from "~/components/surveillance/SurveillanceControlPanel.vue"
import SurveillanceCameraGrid from "~/components/surveillance/SurveillanceCameraGrid.vue"
import SurveillanceCameraCard from "~/components/surveillance/SurveillanceCameraCard.vue"
import SurveillanceFullscreenGridDialog from "~/components/surveillance/SurveillanceFullscreenGridDialog.vue"
import { groupDevicesByModelCategory } from "~/utils/cameraModelCategories"
import { useSurveillanceRbac } from "~/composables/core/useAccessGate"

const { canControlStream } = useSurveillanceRbac()
const toast = useToast()
const { handleError } = useErrorHandler()

// 使用統一串流狀態管理
const streamStatus = useStreamStatus()

// 載入錯誤狀態
const loadError = ref<string | null>(null)

// 從統一串流狀態管理取得資料
const cameras = computed(() => streamStatus.cameras.value)
const monitorViews = computed(() => streamStatus.monitorViews.value)

const deviceConnectivity = useDeviceConnectivity({ debounceMs: 150 })

watch(
	() => cameras.value.map((c) => c.id),
	(ids) => deviceConnectivity.refreshDebounced(ids),
	{ immediate: true }
)

const deviceApi = useDeviceApi()
const surveillanceGroupFilter = ref<string>("")
const cameraGroups = ref<string[]>([])
const surveillanceGroupFilterOptions = computed(() => [
	{ value: "", label: "全部" },
	...cameraGroups.value.map((g) => ({ value: g, label: g })),
])
const filteredCameras = computed(() => {
	const group = surveillanceGroupFilter.value?.trim()
	return group
		? cameras.value.filter((c) => (c.config as CameraDeviceConfig)?.group?.trim() === group)
		: cameras.value
})

const filteredCameraCategoryGroups = computed(() =>
	groupDevicesByModelCategory([...filteredCameras.value])
)

// 布局管理
const gridLayout = ref<GridLayout>("1")
const selectedCameraIds = computed(() => monitorViews.value.map((view) => view.deviceId))

const isFullscreenOpen = ref(false)

const isOverviewCollapsed = ref(false)

const loadCameraGroups = async () => {
	try {
		const res = await deviceApi.getCameraGroups()
		cameraGroups.value = res.groups ?? []
	} catch {
		cameraGroups.value = []
	}
}

const loadCameras = async () => {
	loadError.value = null

	try {
		await streamStatus.loadCameras()
	} catch (error) {
		const errorMsg = handleError(error, "載入攝影機列表失敗")
		loadError.value = errorMsg || "載入攝影機列表失敗"
	}
}

const handleReloadView = async (deviceId: number) => {
	if (!canControlStream.value) {
		toast.warning(TOAST.SURVEILLANCE_NO_STREAM_PERMISSION)
		return
	}
	try {
		await streamStatus.reloadMonitorView(deviceId)
	} catch (error) {
		handleError(error, "重新載入串流失敗")
	}
}

// 選擇攝影機會加入或移除監控畫面（呼叫 stream/start）
const handleCameraSelect = async (deviceId: number) => {
	const existing = monitorViews.value.find((v) => v.deviceId === deviceId)
	if (existing) {
		streamStatus.removeMonitorView(deviceId)
		return
	}

	if (!canControlStream.value) {
		toast.warning(TOAST.SURVEILLANCE_NO_STREAM_PERMISSION)
		return
	}

	const maxViews = parseInt(gridLayout.value)
	if (monitorViews.value.length >= maxViews) {
		toast.warning(TOAST.SURVEILLANCE_MAX_VIEWS(maxViews))
		return
	}

	try {
		await streamStatus.addMonitorView(deviceId)
		toast.success(TOAST.SURVEILLANCE_VIEW_ADDED)
	} catch (error) {
		handleError(error, "啟動串流失敗")
	}
}

const handleRemoveView = (deviceId: number) => {
	streamStatus.removeMonitorView(deviceId)
}

// 當布局變更時，調整畫面數量
watch(gridLayout, (newLayout) => {
	const maxViews = parseInt(newLayout)
	if (monitorViews.value.length > maxViews) {
		// 移除超出上限的畫面
		const viewsToRemove = monitorViews.value.slice(maxViews)
		viewsToRemove.forEach((view) => {
			streamStatus.removeMonitorView(view.deviceId)
		})
	}
})

watch(
	() => isFullscreenOpen.value,
	(isOpen) => {
		if (!isOpen) return
		if (gridLayout.value !== "9" && gridLayout.value !== "16") {
			isFullscreenOpen.value = false
		}
	}
)

onMounted(async () => {
	void loadCameraGroups()

	try {
		await loadCameras()
	} catch (error) {
		handleError(error, "初始化失敗")
	}
})

onBeforeUnmount(() => {
	isFullscreenOpen.value = false
	streamStatus.clearAllMonitorViews()
})
</script>
