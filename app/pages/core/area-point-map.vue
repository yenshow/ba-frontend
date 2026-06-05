<template>
	<div>
		<!-- 主要內容區域：左右排版 -->
		<div class="flex justify-center gap-6 2xl:gap-8">
			<!-- 左側面板：區域選擇與編輯功能 -->
			<section class="flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="flex overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8"
				>
					<!-- 區域選擇 -->
					<div class="relative z-10 flex flex-col justify-between py-4 text-center text-white">
						<div class="space-y-4">
							<!-- 區域顯示 -->
							<div class="py-4">
								<span
									class="inline-flex text-nowrap border-b-2 border-white/70 pb-1 text-4xl tracking-widest 2xl:text-5xl"
								>
									{{ selectedZoneName }}
								</span>
							</div>
							<!-- 區域管理（RBAC；無權限時禁用以保留排版） -->
							<Transition name="fade-in">
								<PermissionActionButton
									v-show="!isInitialLoading"
									:allowed="canManageOperations"
									ariaLabel="區域管理"
									class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent p-3 text-base text-white transition-all enabled:hover:bg-white/10 2xl:text-lg"
									@click="handleOpenZoneDialog"
								>
									區域管理
								</PermissionActionButton>
							</Transition>
							<!-- 系統列表（篩選該樓層的系統顯示） -->
							<Transition name="fade-in">
								<div
									v-if="selectedZoneData && !isInitialLoading"
									class="absolute bottom-1/4 left-0 mt-6 space-y-2"
								>
									<template v-if="zoneSystemTypes.length > 0">
										<button
											v-for="systemType in zoneSystemTypes"
											:key="systemType"
											type="button"
											@click="handleSystemTypeToggle(systemType)"
											:class="[
												'w-full rounded-xl border-2 p-3 text-center text-base text-white transition-all 2xl:text-lg',
												selectedSystemType === systemType
													? 'border-white bg-white/20'
													: 'border-white/20 bg-white/5 hover:bg-white/10',
											]"
										>
											<div>
												{{ getLocationTypeLabel(systemType) }}
											</div>
										</button>
									</template>
									<div
										v-else
										class="rounded-xl border-2 border-white/30 bg-white/5 p-2 text-center text-xs text-white/60 2xl:text-base"
									>
										無系統
									</div>
								</div>
							</Transition>
						</div>
					</div>

					<!-- 中央區域平面圖 -->
					<div class="map-location-dots relative h-[600px] w-full p-4 2xl:h-[780px]">
						<NuxtImg
							v-if="zonePlanImage"
							:src="zonePlanImage"
							alt="區域平面圖"
							class="image-blur-load pointer-events-none h-full w-full object-contain"
							:class="{ 'image-loaded': isZonePlanLoaded }"
							width="auto"
							height="full"
							@load="isZonePlanLoaded = true"
						/>
						<div v-else class="flex h-full w-full items-center justify-center text-white/50">
							<span>尚未設定區域平面圖</span>
						</div>
						<!-- 地點點位（只顯示已定位的） -->
						<template v-for="location in currentZoneLocations" :key="location.id">
							<div class="location-dot-wrapper" :style="getLocationDotStyle(location)">
								<div
									class="location-dot"
									:class="{ 'is-active': selectedLocation === location.id }"
									role="button"
									tabindex="0"
									:data-status="dotStatusForLocation(location)"
									:data-flash="flashModeForLocation(location)"
									:title="tooltipLabelForLocation(location)"
									:aria-label="tooltipLabelForLocation(location)"
									@click.stop="selectLocation(location)"
								></div>
								<CategoryTooltip
									:show="true"
									:category-name="location.name"
									:is-normal="dotStatusForLocation(location) === 'normal'"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側總覽面板 -->
			<aside class="show-scrollbar flex-[0.8] overflow-y-auto 2xl:flex-[0.7]">
				<div
					class="rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8"
					:style="leftSectionHeight ? { minHeight: leftSectionHeight + 'px' } : undefined"
				>
					<!-- 總覽標題 -->
					<h2
						class="mb-4 text-center text-2xl font-semibold tracking-[12px] text-white 2xl:text-3xl"
					>
						總覽
					</h2>

					<!-- 載入狀態 -->
					<div v-if="isLoading" class="flex min-h-[200px] items-center justify-center">
						<div class="text-center text-white/60">
							<p class="text-base 2xl:text-lg">載入中...</p>
						</div>
					</div>

					<!-- 樓層列表 -->
					<div v-else-if="zones.length > 0" class="space-y-2">
						<button
							v-for="zone in sortedZones"
							:key="zone.id"
							type="button"
							class="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-left transition-all"
							:class="{
								'border-white/40 bg-white/20': selectedZone === zone.id,
							}"
							@click="handleZoneSelected(zone.id)"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-12 min-w-[60px] items-center justify-center rounded-lg border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30"
								>
									<span class="text-base font-bold text-white 2xl:text-lg">
										{{ zone.name }}
									</span>
								</div>
								<div class="flex-1">
									<div class="text-base text-white/80 2xl:text-lg">
										<template v-if="getZoneSystemTypes(zone).length > 0">
											{{
												getZoneSystemTypes(zone)
													.map((type) => getLocationTypeLabel(type))
													.join("、")
											}}
										</template>
										<span v-else class="text-white/50">無系統</span>
									</div>
								</div>
							</div>
						</button>
					</div>

					<!-- 空狀態 -->
					<div v-else class="flex min-h-[200px] items-center justify-center">
						<div class="text-center text-white/60">
							<p class="text-base 2xl:text-lg">尚無區域資料</p>
						</div>
					</div>
				</div>
			</aside>
		</div>
	</div>

	<!-- 地點管理對話框（有篩選系統時傳入 systemType，刪除地點僅從該系統移除） -->
	<LocationManagementDialog
		v-model="showLocationManagementDialog"
		:zone="selectedZoneData"
		:system-type="selectedSystemType ?? undefined"
		mode="delete-only"
		:read-only="true"
		:allow-delete-zone="canDeleteZone"
		:allow-delete-location="canDeleteLocationInDialog"
		@delete="handleDeleteUnifiedZone"
	/>
</template>

<script setup lang="ts">
import type { UnifiedZone, UnifiedLocation, SystemType } from "~/types/location"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { useAreaPointMapRbac } from "~/composables/core/useAccessGate"
import { useAreaPointMap } from "~/composables/monitoring/useAreaPointMap"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import LocationManagementDialog from "~/components/location/LocationManagementDialog.vue"
import CategoryTooltip from "~/components/common/CategoryTooltip.vue"
import { useVisibilityAutoRefresh } from "~/composables/monitoring/useVisibilityAutoRefresh"
import { getSystemTypeLabel } from "~/types/location"

definePageMeta({
	layout: "default",
})

const { canDeleteZone, canDeleteLocation, canManageOperations, canDeleteLocationForSystem } =
	useAreaPointMapRbac()

const canDeleteLocationInDialog = computed(() =>
	canDeleteLocationForSystem(selectedSystemType.value)
)
const locationApi = useLocationApi()
const { handleError } = useErrorHandler()
const { handleDeleteZone: baseHandleDeleteZone, sortZones } = useZoneManagement<
	UnifiedLocation,
	UnifiedZone
>()

// 左側區域參考與高度（用於使右側面板同高）
const leftSectionRef = ref<HTMLElement | null>(null)
const leftSectionHeight = ref<number | null>(null)

// ResizeObserver 監聽左側高度
let leftSectionResizeObserver: ResizeObserver | null = null

const updateLeftSectionHeight = () => {
	if (!leftSectionRef.value) return
	leftSectionHeight.value = leftSectionRef.value.offsetHeight
}

const initLeftSectionObserver = () => {
	if (typeof ResizeObserver === "undefined" || !leftSectionRef.value) return
	leftSectionResizeObserver = new ResizeObserver((entries) => {
		if (entries.length) {
			leftSectionHeight.value = entries[0].contentRect.height
		}
	})
	leftSectionResizeObserver.observe(leftSectionRef.value)
}

// 區域資料
const zones = ref<UnifiedZone[]>([])
const isLoading = ref(false)
const isInitialLoading = ref(true)

// 選中的區域與地點
const selectedZone = ref<string>("")
const selectedLocation = ref<string>("")
// 選中的系統類型（用於篩選）
const selectedSystemType = ref<SystemType | null>(null)

// 選中的區域資料
const selectedZoneData = computed(() => {
	if (!selectedZone.value) return undefined
	return zones.value.find((zone) => zone.id === selectedZone.value)
})

const {
	zoneSystemTypes,
	getZoneSystemTypes,
	currentZoneLocations,
	getLocationDotStyle,
	dotStatusForLocation,
	flashModeForLocation,
	tooltipLabelForLocation,
	handleSystemTypeToggle,
	stopOverviewAutoRefresh,
	stopAllSystemAutoRefresh,
	handleRuntimeVisibility,
} = useAreaPointMap({ selectedZone, selectedSystemType, selectedZoneData })

// 其他狀態
const isZonePlanLoaded = ref(false)
const showLocationManagementDialog = ref(false)

// 選中的區域名稱
const selectedZoneName = computed(() => {
	return selectedZoneData.value?.name || ""
})

// 排序的區域列表
const sortedZones = computed(() => sortZones(zones.value))

// 區域示意圖
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const firstZoneByDisplayOrder = (zs: UnifiedZone[]) => sortZones(zs)[0] ?? null

// 載入區域列表
const loadZones = async () => {
	isLoading.value = true
	try {
		const response = await locationApi.getZones()
		zones.value = response.zones

		// 若尚未選區域，依 sort_order／名稱慣例選排序後第一個
		if (!selectedZone.value && zones.value.length > 0) {
			const first = firstZoneByDisplayOrder(zones.value)
			if (first?.id) selectedZone.value = first.id
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoading.value = false
	}
}

const handleDeleteUnifiedZone = async (zoneId: string) => {
	if (!canDeleteZone.value) return

	await baseHandleDeleteZone(zoneId, zones, locationApi.deleteZone, {
		selectedZoneRef: selectedZone,
		selectedLocationRef: selectedLocation,
		findEarliestZone: firstZoneByDisplayOrder,
		getLocationId: (loc) => String(loc.id || ""),
		systemType: selectedSystemType.value ?? undefined,
		reloadZones: async () => {
			await loadZones()
			showLocationManagementDialog.value = false
		},
	})
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedLocation.value = ""
	// 切換區域時重置系統篩選
	selectedSystemType.value = null
}

const selectLocation = (location: UnifiedLocation) => {
	selectedLocation.value = location.id
}

const getLocationTypeLabel = getSystemTypeLabel

// 處理打開區域管理對話框
const handleOpenZoneDialog = async () => {
	if (!canManageOperations.value) return
	if (zones.value.length === 0) {
		await loadZones()
	}
	showLocationManagementDialog.value = true
}

// 監聽頁面可見性變化，當頁面重新可見時重新載入資料
const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") {
		// 頁面可見時，重新載入區域資料以確保資料同步
		void loadZones()
		handleRuntimeVisibility()
	}
}

const visibilityRefresh = useVisibilityAutoRefresh({
	start: () => {},
	stop: () => {},
	onVisible: handleVisibilityChange,
})

// 初始化載入
onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver()

	try {
		// 載入區域列表（狀態快照與輪詢由 useAreaPointMap watch immediate 啟動）
		await loadZones()

		// 同步右側高度
		await nextTick()
		updateLeftSectionHeight()
	} catch (error) {
		handleError(error, "初始化失敗")
	} finally {
		// 初始載入完成，顯示按鈕和系統列表（使用淡入動畫）
		isInitialLoading.value = false
	}

	// 監聽頁面可見性變化
	visibilityRefresh.start()
})

// 清理
onBeforeUnmount(() => {
	visibilityRefresh.stop()
	stopOverviewAutoRefresh()
	stopAllSystemAutoRefresh()
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value)
		leftSectionResizeObserver.disconnect()
		leftSectionResizeObserver = null
	}
})
</script>

<style scoped></style>
