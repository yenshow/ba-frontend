<template>
	<div>
		<!-- 人流統計系統頁面內容 -->
		<div class="flex justify-center gap-6 2xl:gap-8">
			<!-- 左側：詳細工地資訊（主要內容 - 大） -->
			<section class="relative flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="relative flex flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 2xl:p-6 min-h-[664px] 2xl:min-h-[848px]"
				>
					<!-- 位置標題與地點選擇 -->
					<div
						class="absolute left-1/2 top-0 flex h-[36px] translate-x-[-50%] items-center justify-center bg-white text-lg text-[#595959] 2xl:text-xl"
						style="clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, calc(0% + 24px) 100%)"
					>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="ps-[12px] text-[21px] 2xl:text-[28px]">{{
								getLocationZone(selectedLocation)
							}}</span>
						</div>
						<div class="h-[24px] w-px bg-[#595959]"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="pe-[12px] text-[21px] 2xl:text-[28px]">{{
								selectedLocation.name
							}}</span>
						</div>
					</div>

					<button
						v-if="isOperator"
						type="button"
						class="absolute left-8 top-2 rounded-lg border-2 border-white/30 bg-transparent px-4 py-2 text-sm text-white transition-all hover:bg-white/10 2xl:text-base"
						aria-label="地點管理"
						@click="handleOpenLocationDialog"
					>
						地點管理
					</button>
					<button
						type="button"
						class="absolute right-8 top-2 rounded-lg border-2 border-white/30 bg-transparent px-4 py-2 text-sm text-white transition-all hover:bg-white/10 2xl:text-base"
						aria-label="開啟完整報表"
						@click="handleOpenSimulation"
					>
						完整報表
					</button>

					<!-- 左側內容：分為左右兩區塊 -->
					<template v-if="selectedLocation">
						<div class="mt-16 flex">
							<!-- 左側-左：統計 + 記錄表 -->
							<div class="flex-1">
								<LocationStatsPanel
									:entry-count="selectedLocation.entryCount || 0"
									:exit-count="selectedLocation.exitCount || 0"
									:current-count="currentCount"
									:logs="logs"
								/>
							</div>
							<!-- 左側-右：單位列表 + 人員名單 -->
							<div class="flex-1 border-l-2 border-white/30 ms-4 ps-4">
								<LocationDetailPanel
									:location="selectedLocation"
									:personnel="personnel"
									:selected-unit-id="selectedUnitId"
									@unit-select="handleUnitSelect"
								/>
							</div>
						</div>
					</template>

					<!-- 提示：選擇地點 -->
					<div
						v-else
						class="mt-12 flex h-full min-h-[600px] w-full items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
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
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								/>
							</svg>
							<p class="font-medium text-white/90 text-2xl 2xl:text-3xl">請選擇地點</p>
							<p class="mt-2 text-base text-white/70 2xl:text-lg">
								請從右側列表點選地點以查看詳細資訊
							</p>
						</div>
					</div>
				</div>
			</section>

			<!-- 右側：工地總覽列表（可收縮） -->
			<aside
				:class="[
					'flex flex-col transition-all duration-500 ease-in-out',
					isSidebarCollapsed ? 'flex-[0.05]' : 'flex-[0.8] 2xl:flex-[0.7]',
				]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<div
					class="relative h-full min-w-[72px] overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-white/80 bg-white/30 py-8 2xl:min-w-[84px]"
				>
					<!-- 標題與收縮按鈕 -->
					<Transition name="fade">
						<h2
							v-if="!isSidebarCollapsed"
							key="title"
							class="mb-4 text-center font-semibold tracking-[12px] text-white text-2xl 2xl:text-3xl"
							style="padding-left: 12px"
						>
							總覽
						</h2>
					</Transition>
					<button
						type="button"
						class="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 text-white hover:bg-white/20 2xl:h-12 2xl:w-12"
						@click="isSidebarCollapsed = !isSidebarCollapsed"
						:title="isSidebarCollapsed ? '展開列表' : '收縮列表'"
					>
						<svg
							class="h-6 w-6 2xl:h-7 2xl:w-7"
							:class="{ 'rotate-180': isSidebarCollapsed }"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>

					<!-- 側邊欄內容 -->
					<Transition name="fade">
						<div
							v-if="!isSidebarCollapsed"
							key="content"
							class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
						>
							<div class="space-y-4">
								<template v-if="locations.length > 0">
									<LocationOverviewCard
										v-for="location in locationsForOverview"
										:key="getLocationId(location)"
										:location="location"
										:selected="isCurrentLocation(location)"
										@click="handleLocationSelect"
										class="cursor-pointer transition-all"
										:class="{
											'ring-2 ring-cyan-400': isCurrentLocation(location),
											'hover:ring-2 hover:ring-cyan-300/50': true,
										}"
									/>
								</template>
								<div v-else class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無地點資料</p>
									<p class="mt-2 text-sm 2xl:text-base">請在「地點管理」中新增地點</p>
								</div>
							</div>
						</div>
					</Transition>
				</div>
			</aside>
		</div>
	</div>
	<ZoneManagementDialog
		v-model="showLocationManagementDialog"
		:zones="peopleCountingZones"
		system-type="people_counting"
		:require-image-url="false"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
	<SimulationFrame v-model="showSimulationFrame" title="人流統計 - 完整報表">
		<PeopleCountingSimulation
			:logs="simulationLogs"
			:data-source="selectedLocation?.dataSource"
			:site-summary="
				selectedLocation
					? {
							entryCount: selectedLocation.entryCount ?? 0,
							exitCount: selectedLocation.exitCount ?? 0,
							units: selectedLocation.units ?? []
						}
					: undefined
			"
			:zone-name="simulationZoneName"
			:location-name="simulationLocationName"
			:time-range="simulationTimeRange"
			:pagination="simulationPagination"
			@update:time-range="handleSimulationTimeRangeUpdate"
		/>
	</SimulationFrame>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, nextTick, computed, ref } from "vue"
import type {
	PeopleCountingZone,
	PeopleCountingLocation,
	PeopleCountingLog,
} from "~/types/peopleCounting"
import LocationDetailPanel from "~/components/people-counting/LocationDetailPanel.vue"
import LocationStatsPanel from "~/components/people-counting/LocationStatsPanel.vue"
import LocationOverviewCard from "~/components/people-counting/LocationOverviewCard.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import SimulationFrame from "~/components/common/SimulationFrame.vue"
import PeopleCountingSimulation from "~/components/people-counting/PeopleCountingSimulation.vue"
import { usePeopleCountingState } from "~/composables/systems/peopleCounting/usePeopleCountingState"
import { usePeopleCountingWebSocket } from "~/composables/systems/peopleCounting/usePeopleCountingWebSocket"
import { usePeopleCountingLocationApi } from "~/composables/location/api/usePeopleCountingLocationApi"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { usePeopleCountingApi } from "~/composables/systems/peopleCounting/usePeopleCountingApi"
import { unifiedToPeopleCountingZone } from "~/utils/locationAdapter"
import { useZoneSystemAdapter } from "~/composables/location/adapters/useZoneSystemAdapter"
import { getTodayDateRangeUTC } from "~/utils/dateUtils"
import type { UnifiedZone } from "~/types/location"
import { useAuth } from "~/composables/core/useAuth"
import {
	firstFlatSiteMatchingSortedZoneLocations,
	sortFlatSitesBySortedZoneLocations,
} from "~/utils/sortOrder"

const { isOperator } = useAuth()

// 使用統一的狀態管理
const {
	locations,
	selectedLocation,
	personnel,
	logs,
	peopleCountingZones,
	selectedUnitId,
	loadLocations,
	loadLocationDetail,
	loadZones,
	handleUnitSelect,
	getLocationZone,
} = usePeopleCountingState()
const peopleCountingApi = usePeopleCountingApi()

// 右側總覽：依 zones/locations 排序後再補 zone 名稱（UI 順序要跟「上下調整」一致）
const locationsForOverview = computed(() => {
	const sitesWithLocationId = (locations.value as PeopleCountingLocation[]).filter(
		(l): l is PeopleCountingLocation & { locationId: number } => l.locationId != null
	)
	const ordered = sortFlatSitesBySortedZoneLocations(
		peopleCountingZones.value,
		sitesWithLocationId
	) as (PeopleCountingLocation & { locationId: number })[]
	return ordered.map((location) => ({
		...location,
		overviewZoneName: getLocationZone(location),
	}))
})

const isIsapiCamera = computed(() => selectedLocation.value?.dataSource === "isapi_camera")

// 計算在場人數：所有單位的 currentCount 總和
const currentCount = computed(() => {
	if (!selectedLocation.value?.units) return 0
	// 攝影機：站點在場數以站點總計（entryCount - exitCount）為準，避免用單位加總造成口徑不一致
	if (isIsapiCamera.value) {
		const entry = selectedLocation.value.entryCount ?? 0
		const exit = selectedLocation.value.exitCount ?? 0
		return Math.max(0, entry - exit)
	}
	return selectedLocation.value.units.reduce((sum, unit) => sum + (unit.currentCount || 0), 0)
})

// WebSocket 事件處理
const { setupEventListeners } = usePeopleCountingWebSocket()

// 左側區域的 ref 和高度
const leftSectionRef = ref<HTMLElement | null>(null)
const leftSectionHeight = ref<number | null>(null)

// ResizeObserver 用於動態監聽左側區域高度變化
let leftSectionResizeObserver: ResizeObserver | null = null

// 更新左側高度
const updateLeftSectionHeight = () => {
	if (leftSectionRef.value) {
		leftSectionHeight.value = leftSectionRef.value.offsetHeight
	}
}

// 初始化 ResizeObserver
const initLeftSectionObserver = () => {
	if (typeof ResizeObserver === "undefined") return
	if (!leftSectionRef.value) return

	leftSectionResizeObserver = new ResizeObserver((entries) => {
		if (entries.length) {
			leftSectionHeight.value = entries[0].contentRect.height
		}
	})
	leftSectionResizeObserver.observe(leftSectionRef.value)
}

// 側邊欄收縮狀態
const isSidebarCollapsed = ref(false)

// 地點管理與模擬框狀態
const showLocationManagementDialog = ref(false)
const showSimulationFrame = ref(false)

const { start: todayStart, end: todayEnd } = getTodayDateRangeUTC()
const simulationTimeRange = ref({
	startDate: todayStart.toISOString(),
	endDate: todayEnd.toISOString(),
	preset: "today",
})

// 模擬框用：區域名、地點名
const simulationZoneName = computed(() =>
	selectedLocation.value ? (getLocationZone(selectedLocation.value) ?? "") : ""
)
const simulationLocationName = computed(() => selectedLocation.value?.name ?? "")

const simulationLogs = ref<PeopleCountingLog[]>([])
const simulationOffset = ref(0)
const simulationPageSize = 500

const loadSimulationLogs = async (offset = 0) => {
	const loc = selectedLocation.value
	if (!loc?.locationId) {
		simulationLogs.value = []
		return
	}
	simulationOffset.value = offset
	const { startDate, endDate } = simulationTimeRange.value
	try {
		simulationLogs.value = await peopleCountingApi.getLocationLogs(loc.locationId, {
			limit: simulationPageSize,
			offset,
			...(startDate && { startTime: startDate }),
			...(endDate && { endTime: endDate }),
		})
	} catch {
		simulationLogs.value = []
	}
}

const handleSimulationTimeRangeUpdate = (v: {
	startDate: string
	endDate: string
	preset: string
}) => {
	simulationTimeRange.value = v
	void loadSimulationLogs(0)
}

const handleOpenSimulation = async () => {
	const { start, end } = getTodayDateRangeUTC()
	simulationTimeRange.value = {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset: "today",
	}
	showSimulationFrame.value = true
	await loadSimulationLogs(0)
}

const simulationPagination = computed(() => ({
	offset: simulationOffset.value,
	hasPrev: simulationOffset.value > 0,
	hasNext: simulationLogs.value.length === simulationPageSize,
	onPrev: () => loadSimulationLogs(Math.max(0, simulationOffset.value - simulationPageSize)),
	onNext: () => loadSimulationLogs(simulationOffset.value + simulationPageSize),
}))

// 選中地點 ID（用於刪除邏輯，與環境品質保持一致）
const selectedLocationId = ref<string>("")

// 取得適配器（用於獲取統一的 getLocationId 方法）
const adapter = useZoneSystemAdapter<PeopleCountingZone, PeopleCountingLocation>("people_counting")

// 從地點對象獲取 ID（用於刪除邏輯，與環境品質保持一致）
// 使用適配器提供的統一方法
const getLocationId = (location: PeopleCountingLocation): string => {
	const zoneName = getLocationZone(location)
	const zone = peopleCountingZones.value.find((z) =>
		(z.locations || []).some((l) => l === location || (l.id && location.id && l.id === location.id))
	)
	if (!zone || !adapter.getLocationId) {
		return `${zoneName || "unknown"}-${location.name}`
	}
	const idx = (zone.locations || []).findIndex(
		(l) => l === location || (l.id && location.id && l.id === location.id)
	)
	if (idx < 0) return `${zoneName || "unknown"}-${location.name}`
	return adapter.getLocationId({ zone, location, locationIndex: idx })
}

// 監聽 selectedLocation 變化，同步更新 selectedLocationId（用於刪除邏輯）
watch(
	() => selectedLocation.value,
	(newLocation) => {
		selectedLocationId.value = newLocation ? getLocationId(newLocation) : ""
	},
	{ immediate: true }
)

// 監聽左側區域高度變化由 ResizeObserver 處理，僅需在地點變化時更新一次
watch([selectedLocation, locations, peopleCountingZones], () => {
	nextTick(() => {
		updateLeftSectionHeight()
	})
})

// 檢查是否為當前選中的地點（與 construction 一致：單一 canonical id，僅一卡高亮／左側白條）
const isCurrentLocation = (location: PeopleCountingLocation): boolean => {
	return getLocationId(location) === selectedLocationId.value
}

// 處理地點選擇
const handleLocationSelect = async (locationId: number) => {
	if (selectedLocation.value?.locationId === locationId) {
		return // 已經選中，不需要重新載入
	}
	await loadLocationDetail(locationId)
}

// 設置 WebSocket 事件監聽器
let cleanupWebSocket: (() => void) | null = null

// 使用區域管理 composable
const peopleCountingLocationApi = usePeopleCountingLocationApi()
const locationApi = useLocationApi()
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<PeopleCountingLocation, PeopleCountingZone>()

// 處理儲存區域
const handleSaveZone = async (zone: PeopleCountingZone) => {
	await baseHandleSaveZone(
		zone,
		peopleCountingZones,
		async (z: PeopleCountingZone) => {
			// 檢查是否為臨時 ID（以 temp- 開頭）或有效的數字 ID
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await peopleCountingLocationApi.updateZone(z.id, {
						name: z.name,
						locations: z.locations,
					})
				: await peopleCountingLocationApi.createZone({
						name: z.name,
						locations: z.locations,
					})
			// 確保返回的 zone 有 id
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as PeopleCountingZone & {
				id: string
			}
			return {
				merged: result.merged,
				message: result.message,
				zone: zoneWithId,
			}
		},
		{
			// 保存後重新載入地點列表（因為地點變更可能影響地點列表）
			onAfterSave: async () => {
				await loadLocations()
			},
		}
	)
}

// 處理刪除區域
const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, peopleCountingZones, peopleCountingLocationApi.deleteZone, {
		// 選中狀態管理（與環境品質保持一致）
		selectedLocationRef: selectedLocationId,
		getLocationId,
		// 系統特定的刪除選項
		systemType: "people_counting",
		// 刪除後重新載入區域與地點列表（確保 UI 立即反映刪除結果）
		onAfterDelete: async () => {
			await loadZones()
			await loadLocations()
		},
	})
}

// 處理打開地點管理對話框
const handleOpenLocationDialog = async () => {
	// 如果還沒有載入區域數據，先載入
	if (peopleCountingZones.value.length === 0) {
		await loadZones()
	}
	// 打開對話框
	showLocationManagementDialog.value = true
}

// 監聽對話框打開狀態，載入區域數據
watch(
	() => showLocationManagementDialog.value,
	(newValue) => {
		if (newValue && peopleCountingZones.value.length === 0) {
			loadZones()
		}
	}
)

// 初始化
onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver()

	// 設置 WebSocket 事件監聽：收到 YSCP 事件後重新載入資料
	// 使用防抖優化（500ms），避免短時間內多次觸發
	cleanupWebSocket = setupEventListeners(async () => {
		const locationId = selectedLocation.value?.locationId

		// 並行載入地點列表和詳情（如果有的話）
		// 使用 Promise.allSettled 確保即使一個失敗也不影響另一個
		// 錯誤已在 composable 中統一處理
		await Promise.allSettled([
			loadLocations(), // 載入列表（更新統計和總覽卡片）
			locationId ? loadLocationDetail(locationId) : Promise.resolve(),
		])

		// 確保所有計算屬性和元件在資料載入後重新計算
		// 使用 nextTick 確保 Vue 響應式系統完成所有更新
		await nextTick()

		// 更新左側區域高度（因為資料變化可能影響佈局）
		updateLeftSectionHeight()
	}, 500) // 防抖延遲 500ms

	try {
		// 優化：先載入地點列表（內部會並行請求 zones），然後使用返回的 zones 數據
		// 這樣可以避免重複請求 zones
		await loadLocations()

		// 如果 loadLocations 沒有返回 zones（例如已有緩存），則單獨載入
		if (peopleCountingZones.value.length === 0) {
			await loadZones()
		}

		if (!selectedLocation.value && locations.value.length > 0) {
			const sitesWithLocationId = (locations.value as PeopleCountingLocation[]).filter(
				(l): l is PeopleCountingLocation & { locationId: number } => l.locationId != null
			)
			const hit = firstFlatSiteMatchingSortedZoneLocations(
				peopleCountingZones.value,
				sitesWithLocationId
			)
			if (hit?.locationId != null) {
				await handleLocationSelect(hit.locationId)
			}
		}
	} catch (error) {
		// 錯誤已在 composable 中處理
	}

	// 更新左側高度（初始化）
	nextTick(() => {
		updateLeftSectionHeight()
	})
})

// 清理函數
onBeforeUnmount(() => {
	// 清理 ResizeObserver
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value)
		leftSectionResizeObserver.disconnect()
		leftSectionResizeObserver = null
	}

	// 清理 WebSocket 事件監聽器
	if (cleanupWebSocket) {
		cleanupWebSocket()
		cleanupWebSocket = null
	}
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
