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
									class="inline-flex text-nowrap border-b-2 border-white/70 pb-1 tracking-widest text-4xl 2xl:text-5xl"
								>
									{{ selectedZoneName }}
								</span>
							</div>
							<!-- 區域管理按鈕 -->
							<Transition name="fade-in">
								<button
									v-if="!isInitialLoading && isAdmin"
									type="button"
									@click="handleOpenZoneDialog"
									:class="[
										'whitespace-nowrap rounded-2xl p-3 text-base text-white transition-all 2xl:text-lg',
										'border-2 border-white/30 bg-transparent hover:bg-white/10',
									]"
									title="區域管理"
								>
									區域管理
								</button>
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
					<div class="relative h-[600px] w-full p-4 2xl:h-[780px]">
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
							<div class="location-dot-wrapper" :style="getLightingLocationStyle(location)">
								<div
									class="location-dot"
									:class="{ 'is-active': selectedLocation === location.id }"
									role="button"
									tabindex="0"
									:data-status="isLocationNormal(location) ? 'normal' : 'abnormal'"
									:title="`${location.name}：${isLocationNormal(location) ? '正常' : '異常'}`"
									:aria-label="`${location.name}：${isLocationNormal(location) ? '正常' : '異常'}`"
									@click.stop="selectLocation(location)"
								></div>
								<CategoryTooltip
									:show="true"
									:category-name="location.name"
									:is-normal="isLocationNormal(location)"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側總覽面板 -->
			<aside class="flex-[0.8] overflow-y-auto 2xl:flex-[0.7]">
				<div
					class="rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8"
					:style="leftSectionHeight ? { minHeight: leftSectionHeight + 'px' } : undefined"
				>
					<!-- 總覽標題 -->
					<h2
						class="mb-4 text-center font-semibold tracking-[12px] text-white text-2xl 2xl:text-3xl"
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

	<!-- 地點管理對話框 -->
	<LocationManagementDialog
		v-model="showLocationManagementDialog"
		:zone="selectedZoneData"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import type { UnifiedZone, UnifiedLocation, SystemType } from "~/types/location"
import { useLocationApi } from "~/composables/systems/location/useLocationApi"
import { useAuth } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useZoneManagement } from "~/composables/systems/useZoneManagement"
import { hasLightingCoordinates, getLightingLocationStyle } from "~/utils/locationAdapter"
import LocationManagementDialog from "~/components/location/LocationManagementDialog.vue"
import CategoryTooltip from "~/components/lighting/CategoryTooltip.vue"

definePageMeta({
	layout: "default",
})

const { isAdmin } = useAuth()
const locationApi = useLocationApi()
const toast = useToast()
const { handleError } = useErrorHandler()

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

// 其他狀態
const isZonePlanLoaded = ref(false)
const showLocationManagementDialog = ref(false)

// 選中的區域資料
const selectedZoneData = computed(() => {
	if (!selectedZone.value) return undefined
	return zones.value.find((zone) => zone.id === selectedZone.value)
})

// 選中的區域名稱
const selectedZoneName = computed(() => {
	return selectedZoneData.value?.name || ""
})

// 提取樓層的所有系統類型（共用函數）
const extractSystemTypes = (locations: UnifiedLocation[]): SystemType[] => {
	if (!locations || locations.length === 0) return []

	const systemTypes = new Set<SystemType>()
	locations.forEach((location) => {
		location.systems?.forEach((system) => {
			systemTypes.add(system.systemType)
		})
	})
	return Array.from(systemTypes)
}

// 選中區域的所有系統類型（去重）
const zoneSystemTypes = computed(() => {
	if (!selectedZoneData.value?.locations) return []
	return extractSystemTypes(selectedZoneData.value.locations)
})

// 取得指定區域的所有系統類型（用於總覽顯示）
const getZoneSystemTypes = (zone: UnifiedZone): SystemType[] => {
	if (!zone?.locations) return []
	return extractSystemTypes(zone.locations)
}

// 排序的區域列表
const sortedZones = computed(() => sortZones(zones.value))

// 區域示意圖
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

// 判斷地點是否正常（暫時都返回正常，未來可以根據系統狀態判斷）
const isLocationNormal = (location: UnifiedLocation): boolean => {
	// 未來可以根據系統狀態判斷
	return true
}

// 當前選中區域的地點列表（過濾掉未定位的點位，只有定位的點位才會顯示在地圖上）
// 並根據選中的系統類型進行篩選
const currentZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	if (!zone) return []

	// 先過濾有座標的地點（目前只有照明系統支援座標）
	let locations = (zone.locations || []).filter((loc) => hasLightingCoordinates(loc))

	// 如果選中了系統類型，進一步篩選
	if (selectedSystemType.value) {
		locations = locations.filter((loc) =>
			loc.systems?.some((system) => system.systemType === selectedSystemType.value)
		)
	}

	return locations
})

// 使用區域管理 composable
const {
	handleSaveZone: baseHandleSaveZone,
	handleDeleteZone: baseHandleDeleteZone,
	findEarliestZone,
	sortZones,
} = useZoneManagement<UnifiedZone>()

// 載入區域列表
const loadZones = async () => {
	isLoading.value = true
	try {
		const response = await locationApi.getZones()
		zones.value = response.zones

		// 如果沒有選中的區域且有區域資料，優先選擇最先創建的
		if (!selectedZone.value && zones.value.length > 0) {
			const earliestZone = findEarliestZone(zones.value)
			if (earliestZone) {
				selectedZone.value = earliestZone.id
			} else {
				// 如果無法判斷，選擇第一個
				selectedZone.value = zones.value[0].id
			}
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoading.value = false
	}
}

// 處理區域選擇
const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedLocation.value = ""
	// 切換區域時重置系統篩選
	selectedSystemType.value = null
}

// 處理系統類型切換（點擊已選中的系統類型則取消選中，回到全部）
const handleSystemTypeToggle = (systemType: SystemType) => {
	if (selectedSystemType.value === systemType) {
		// 如果點擊的是已選中的系統類型，取消選中（顯示全部）
		selectedSystemType.value = null
	} else {
		// 否則選中該系統類型
		selectedSystemType.value = systemType
	}
}

// 選中地點
const selectLocation = (location: UnifiedLocation) => {
	selectedLocation.value = location.id
}

// 系統類型標籤映射（提取為常數，避免重複定義）
const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
	environment: "環境監測",
	lighting: "照明系統",
	people_counting: "人流統計",
	vehicle_access: "車輛通行",
}

// 取得系統類型標籤
const getLocationTypeLabel = (systemType: SystemType): string => {
	return SYSTEM_TYPE_LABELS[systemType] || systemType
}

// 處理打開區域管理對話框
const handleOpenZoneDialog = async () => {
	if (zones.value.length === 0) {
		await loadZones()
	}
	showLocationManagementDialog.value = true
}

// 處理儲存區域
const handleSaveZone = async (zone: UnifiedZone) => {
	await baseHandleSaveZone(
		zone,
		zones,
		async (z: UnifiedZone) => {
			return z.id
				? await locationApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						locations: z.locations,
					})
				: await locationApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						locations: z.locations,
					})
		},
		{
			selectedZoneRef: selectedZone,
			closeDialogRef: showLocationManagementDialog,
		}
	)
}

// 處理刪除區域（當其他系統刪除區域時，全區點位圖需要重新載入資料）
const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, zones, locationApi.deleteZone, {
		selectedZoneRef: selectedZone,
		findEarliestZone,
		reloadZones: loadZones, // 刪除後重新載入所有系統的區域資料
	})
}

// 監聽頁面可見性變化，當頁面重新可見時重新載入資料
const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") {
		// 頁面可見時，重新載入區域資料以確保資料同步
		void loadZones()
	}
}

// 初始化載入
onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver()

	try {
		// 載入區域列表
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
	document.addEventListener("visibilitychange", handleVisibilityChange)
})

// 清理
onBeforeUnmount(() => {
	document.removeEventListener("visibilitychange", handleVisibilityChange)
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value)
		leftSectionResizeObserver.disconnect()
		leftSectionResizeObserver = null
	}
})
</script>

<style scoped>
/* 按鈕進場動畫 */
.fade-in-enter-active {
	transition:
		opacity 0.4s ease-in,
		transform 0.4s ease-out;
}

.fade-in-enter-from {
	opacity: 0;
	transform: translateY(-10px);
}

.fade-in-enter-to {
	opacity: 1;
	transform: translateY(0);
}

/* 圖片載入動畫 */
.image-blur-load {
	transition:
		filter 0.6s ease-in-out,
		opacity 0.6s ease-in-out;
	filter: blur(20px);
	opacity: 0.6;
}

.image-blur-load.image-loaded {
	filter: blur(0);
	opacity: 1;
}

/* 地點點位樣式 */
.location-dot-wrapper {
	position: absolute;
	z-index: 10;
}

.location-dot {
	position: absolute;
	width: 48px;
	height: 48px;
	border-radius: 9999px;
	transform: translate(-50%, -50%);
	border: 2px solid transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	backdrop-filter: blur(3px);
	transition:
		box-shadow 0.2s ease,
		border-color 0.2s ease,
		background 0.2s ease;
}

.location-dot::before {
	content: "";
	position: absolute;
	inset: 6px;
	border-radius: inherit;
	transition: background 0.2s ease;
}

.location-dot::after {
	position: relative;
	content: "";
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
}

/* 正常狀態 */
.location-dot[data-status="normal"] {
	background: rgba(28, 200, 138, 0.28);
	border-color: rgba(28, 200, 138, 0.6);
}

.location-dot[data-status="normal"]::before {
	background: #1cc88a;
}

.location-dot[data-status="normal"]::after {
	content: "✓";
}

/* 異常狀態 */
.location-dot[data-status="abnormal"] {
	background: rgba(245, 101, 101, 0.32);
	border-color: rgba(245, 101, 101, 0.72);
	animation: dot-alert 1.6s ease-in-out infinite;
}

.location-dot[data-status="abnormal"]::before {
	background: #f56565;
}

.location-dot[data-status="abnormal"]::after {
	content: "!";
}

/* 選中狀態 */
.location-dot.is-active {
	box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
	border-color: rgba(255, 255, 255, 0.8);
}

@keyframes dot-alert {
	0%,
	100% {
		box-shadow: 0 0 18px rgba(245, 101, 101, 0.6);
	}
	50% {
		box-shadow: 0 0 28px rgba(245, 101, 101, 0.95);
	}
}
</style>
