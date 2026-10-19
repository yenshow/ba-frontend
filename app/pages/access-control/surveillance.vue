<template>
	<div>
		<div
			class="monitoring-page-layout"
			:class="isOverviewCollapsed ? 'gap-0' : 'gap-4 xl:gap-6 2xl:gap-8'"
		>
			<section class="monitoring-detail-section">
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
					ref="detailPanelRef"
					class="monitoring-detail-panel monitoring-panel rounded-2xl p-6 2xl:p-8"
				>
					<div class="mb-4 shrink-0">
						<SurveillanceControlPanel
							:model-value="gridLayout"
							:total-cameras="cameras.length + nvrDevices.length"
							:view-count="monitorViews.length"
							@update:model-value="handleLayoutChange"
							@fullscreen="isFullscreenOpen = true"
						/>
					</div>

					<div class="flex min-h-0 flex-1 flex-col">
						<Transition name="fade" mode="out-in">
							<div v-if="loadError" key="error" class="flex min-h-0 flex-1 items-center justify-center">
								<div class="rounded-lg bg-red-50/90 p-6 text-center dark:bg-red-900/30">
									<p class="text-red-600 dark:text-red-400">{{ loadError }}</p>
									<button
										type="button"
										class="mt-4 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
										@click="loadCameras"
									>
										重試
									</button>
								</div>
							</div>

							<div v-else-if="monitorViews.length > 0" key="grid" class="min-h-0 flex-1">
								<SurveillanceCameraGrid
									:cameras="cameras"
									:views="monitorViews"
									:layout="gridLayout"
									@remove="handleRemoveView"
									@reload="handleReloadView"
									@playback="handleOpenPlayback"
								/>
							</div>

							<div
								v-else
								key="empty"
								class="flex min-h-0 flex-1 items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
							>
								<div>
									<p class="text-2xl text-white/90 2xl:text-3xl">尚未加入攝影機</p>
									<p class="mt-2 text-base text-white/70 2xl:text-lg">
										請於側邊列表點選攝影機或 NVR 通道以加入監控畫面
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
				:style="asideHeightStyle"
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
											來源列表
										</h2>
										<span
											class="ml-2 rounded-full bg-white/20 px-2.5 py-0.5 text-base font-medium text-white backdrop-blur-sm 2xl:text-lg"
										>
											{{ filteredCameras.length + nvrDevices.length }}
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
								<section class="space-y-3">
									<h3 class="text-sm font-medium text-cyan-200/90 2xl:text-base">攝影機</h3>
									<div
										v-if="filteredCameraCategoryGroups.length === 0"
										class="py-4 text-center text-sm text-white/60 xl:text-base"
									>
										{{ cameras.length === 0 ? "沒有攝影機" : "此群組無攝影機" }}
									</div>
									<section
										v-for="(group, groupIndex) in filteredCameraCategoryGroups"
										:key="group.code"
										:class="['space-y-3', groupIndex > 0 ? 'border-t border-white/20 pt-4' : '']"
									>
										<h4 class="text-xs font-medium text-white/70 2xl:text-sm">
											{{ group.label }}
											<span class="ml-1.5 text-xs font-normal text-white/50">
												({{ group.items.length }})
											</span>
										</h4>
										<SurveillanceCameraCard
											v-for="camera in group.items"
											:key="camera.id"
											:camera="camera"
											:is-selected="selectedViewKeys.includes(cameraViewKey(camera.id))"
											:connectivity-status="deviceConnectivity.getStatus(camera.id)"
											:connectivity-loading="deviceConnectivity.isLoading(camera.id)"
											@select="handleCameraSelect"
										/>
									</section>
								</section>

								<section class="space-y-3 border-t border-white/20 pt-6">
									<h3 class="text-sm font-medium text-cyan-200/90 2xl:text-base">
										NVR
										<span class="ml-1.5 text-xs font-normal text-white/50">
											({{ nvrDevices.length }})
										</span>
									</h3>
									<div
										v-if="nvrDevices.length === 0"
										class="py-4 text-center text-sm text-white/60"
									>
										沒有 NVR 設備
									</div>
									<div
										v-for="nvr in nvrDevices"
										:key="nvr.id"
										class="rounded-lg border border-white/20 bg-white/5"
									>
										<button
											type="button"
											class="flex w-full items-center justify-between px-3 py-2.5 text-left text-white hover:bg-white/10"
											:aria-expanded="expandedNvrId === nvr.id"
											@click="handleToggleNvr(nvr.id)"
										>
											<span class="font-medium">{{ nvr.name }}</span>
											<span class="text-xs text-white/60">
												{{ expandedNvrId === nvr.id ? "收合" : "展開通道" }}
											</span>
										</button>
										<div v-if="expandedNvrId === nvr.id" class="space-y-2 border-t border-white/10 px-2 py-2">
											<p v-if="nvrChannelsLoading" class="px-2 py-2 text-xs text-white/60">
												載入通道中…
											</p>
											<p
												v-else-if="nvrChannelsError"
												class="px-2 py-2 text-xs text-red-300"
											>
												{{ nvrChannelsError }}
											</p>
											<button
												v-for="ch in nvrChannels"
												:key="`${nvr.id}-${ch.liveTrackId}`"
												type="button"
												:disabled="!ch.liveTrackId"
												:class="[
													'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors',
													ch.liveTrackId &&
													selectedViewKeys.includes(nvrChannelViewKey(nvr.id, ch.liveTrackId))
														? 'bg-white/20 text-white'
														: 'text-white/85 hover:bg-white/10',
													!ch.liveTrackId ? 'cursor-not-allowed opacity-40' : '',
												]"
												@click="handleNvrChannelSelect(nvr, ch)"
											>
												<span>
													{{ ch.name }}
													<span v-if="ch.ipAddress" class="ml-1 text-xs text-white/50">
														{{ ch.ipAddress }}
													</span>
												</span>
												<span
													:class="[
														'rounded-full px-2 py-0.5 text-xs',
														ch.online ? 'bg-green-500/30 text-green-100' : 'bg-white/15 text-white/60',
													]"
												>
													{{ ch.online ? "線上" : "離線" }}
												</span>
											</button>
										</div>
									</div>
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
		@reload="handleReloadView"
	/>

	<SurveillanceNvrPlaybackDialog
		v-model="playbackOpen"
		:nvr-id="playbackNvrId"
		:track-id="playbackTrackId"
		:title="playbackTitle"
	/>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import { onMounted, onBeforeUnmount, watch, ref, computed } from "vue"
import type { GridLayout, MonitorView, NvrVirtualChannel } from "~/types/surveillance"
import type { CameraDeviceConfig, Device } from "~/types/device"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useStreamStatus } from "~/composables/monitoring/useStreamStatus"
import { useMonitoringAsideHeightSync } from "~/composables/monitoring/useMonitoringAsideHeightSync"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useNvrApi } from "~/composables/systems/surveillance/useNvrApi"
import { isNvrCamera } from "~/utils/nvrWebUrl"
import {
	cameraViewKey,
	nvrChannelViewKey,
} from "~/utils/surveillanceViewKey"
import { useDeviceConnectivity } from "~/composables/systems/devices/useDeviceConnectivity"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import SurveillanceControlPanel from "~/components/surveillance/SurveillanceControlPanel.vue"
import SurveillanceCameraGrid from "~/components/surveillance/SurveillanceCameraGrid.vue"
import SurveillanceCameraCard from "~/components/surveillance/SurveillanceCameraCard.vue"
import SurveillanceFullscreenGridDialog from "~/components/surveillance/SurveillanceFullscreenGridDialog.vue"
import SurveillanceNvrPlaybackDialog from "~/components/surveillance/SurveillanceNvrPlaybackDialog.vue"
import { groupDevicesByModelCategory } from "~/utils/cameraModelCategories"
import { useSurveillanceRbac } from "~/composables/core/useAccessGate"

const LAYOUT_ORDER: readonly GridLayout[] = ["1", "4", "9", "16"]

const layoutThatFits = (count: number): GridLayout =>
	LAYOUT_ORDER.find((layout) => parseInt(layout, 10) >= count) ?? "16"

const { canControlStream } = useSurveillanceRbac()
const toast = useToast()
const { handleError } = useErrorHandler()

const streamStatus = useStreamStatus()
const nvrApi = useNvrApi()
const loadError = ref<string | null>(null)
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
const nvrDevices = ref<Device[]>([])
const expandedNvrId = ref<number | null>(null)
const nvrChannels = ref<NvrVirtualChannel[]>([])
const nvrChannelsLoading = ref(false)
const nvrChannelsError = ref<string | null>(null)

const playbackOpen = ref(false)
const playbackNvrId = ref(0)
const playbackTrackId = ref(0)
const playbackTitle = ref("")

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

const gridLayout = ref<GridLayout>("1")
const selectedViewKeys = computed(() => monitorViews.value.map((view) => view.viewKey))
const isFullscreenOpen = ref(false)
const isOverviewCollapsed = ref(false)
const { detailPanelRef, asideHeightStyle } = useMonitoringAsideHeightSync()

const syncLayoutToViewCount = () => {
	const count = monitorViews.value.length
	if (count === 0) {
		gridLayout.value = "1"
		return
	}
	const exact = LAYOUT_ORDER.find((layout) => parseInt(layout, 10) === count)
	if (!exact) return
	if (parseInt(exact, 10) < parseInt(gridLayout.value, 10)) {
		gridLayout.value = exact
	}
}

const trimNewestViewsToFit = (maxViews: number) => {
	if (monitorViews.value.length <= maxViews) return
	const sorted = [...monitorViews.value].sort((a, b) => a.position - b.position)
	sorted.slice(maxViews).forEach((view) => streamStatus.removeMonitorView(view.viewKey))
}

const loadCameraGroups = async () => {
	try {
		const res = await deviceApi.getCameraGroups()
		cameraGroups.value = res.groups ?? []
	} catch {
		cameraGroups.value = []
	}
}

const loadNvrDevices = async () => {
	try {
		const res = await deviceApi.getDevices({ type_code: "camera", limit: 500 })
		nvrDevices.value = (res.devices || []).filter(isNvrCamera)
	} catch {
		nvrDevices.value = []
	}
}

const loadCameras = async () => {
	loadError.value = null
	try {
		await Promise.all([streamStatus.loadCameras(), loadNvrDevices()])
	} catch (error) {
		const errorMsg = handleError(error, "載入攝影機列表失敗")
		loadError.value = errorMsg || "載入攝影機列表失敗"
	}
}

const handleToggleNvr = async (nvrId: number) => {
	if (expandedNvrId.value === nvrId) {
		expandedNvrId.value = null
		nvrChannels.value = []
		nvrChannelsError.value = null
		return
	}
	expandedNvrId.value = nvrId
	nvrChannelsLoading.value = true
	nvrChannelsError.value = null
	nvrChannels.value = []
	try {
		nvrChannels.value = await nvrApi.listChannels(nvrId)
	} catch (error) {
		nvrChannelsError.value = handleError(error, "載入 NVR 通道失敗") || "載入 NVR 通道失敗"
	} finally {
		nvrChannelsLoading.value = false
	}
}

const ensureCanAddView = (): boolean => {
	if (!canControlStream.value) {
		toast.warning(TOAST.SURVEILLANCE_NO_STREAM_PERMISSION)
		return false
	}
	const needed = monitorViews.value.length + 1
	if (needed > 16) {
		toast.warning(TOAST.SURVEILLANCE_MAX_VIEWS(16))
		return false
	}
	const currentMax = parseInt(gridLayout.value, 10)
	if (needed > currentMax) {
		gridLayout.value = layoutThatFits(needed)
	}
	return true
}

const handleReloadView = async (viewKey: string) => {
	if (!canControlStream.value) {
		toast.warning(TOAST.SURVEILLANCE_NO_STREAM_PERMISSION)
		return
	}
	try {
		await streamStatus.reloadMonitorView(viewKey)
	} catch (error) {
		handleError(error, "重新載入串流失敗")
	}
}

const handleRemoveView = (viewKey: string) => {
	streamStatus.removeMonitorView(viewKey)
	syncLayoutToViewCount()
}

const handleCameraSelect = async (deviceId: number) => {
	const viewKey = cameraViewKey(deviceId)
	if (monitorViews.value.some((v) => v.viewKey === viewKey)) {
		handleRemoveView(viewKey)
		return
	}
	if (!ensureCanAddView()) return
	try {
		await streamStatus.addMonitorView({ kind: "camera", deviceId })
		toast.success(TOAST.SURVEILLANCE_VIEW_ADDED)
	} catch (error) {
		handleError(error, "啟動串流失敗")
	}
}

const handleNvrChannelSelect = async (nvr: Device, ch: NvrVirtualChannel) => {
	const proxyChannelId = ch.liveTrackId
	if (proxyChannelId == null) return
	const viewKey = nvrChannelViewKey(nvr.id, proxyChannelId)
	if (monitorViews.value.some((v) => v.viewKey === viewKey)) {
		handleRemoveView(viewKey)
		return
	}
	if (!ensureCanAddView()) return
	const title = `${nvr.name} · ${ch.name}`
	try {
		await streamStatus.addMonitorView({
			kind: "nvr",
			nvrId: nvr.id,
			proxyChannelId,
			title,
		})
		toast.success(TOAST.SURVEILLANCE_VIEW_ADDED)
	} catch (error) {
		handleError(error, "啟動 NVR 通道串流失敗")
	}
}

const handleOpenPlayback = (view: MonitorView) => {
	if (view.proxyChannelId == null) return
	playbackNvrId.value = view.deviceId
	playbackTrackId.value = view.proxyChannelId
	playbackTitle.value = view.title || `通道 ${view.proxyChannelId}`
	playbackOpen.value = true
}

const handleLayoutChange = (newLayout: GridLayout) => {
	if (newLayout === gridLayout.value) return
	trimNewestViewsToFit(parseInt(newLayout, 10))
	gridLayout.value = newLayout
}

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
