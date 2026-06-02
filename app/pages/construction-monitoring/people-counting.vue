<template>
	<div>
		<!-- 人流統計系統頁面內容 -->
		<div
			class="flex min-w-0 items-stretch justify-center"
			:class="isOverviewCollapsed ? 'gap-0' : 'gap-4 xl:gap-6 2xl:gap-8'"
		>
			<section class="relative min-w-0 flex-1 2xl:flex-[1.3]">
				<Transition name="fade" mode="out-in">
					<button
						v-if="isOverviewCollapsed"
						key="overview-expand-tab"
						type="button"
						class="absolute -right-px top-24 z-20 flex flex-col items-center gap-2 rounded-l-xl border-2 border-r-0 border-white/80 bg-white/30 px-2.5 py-4 text-white shadow-md transition-colors hover:bg-white/40 2xl:top-32"
						aria-label="展開總覽"
						title="展開總覽"
						@click="isOverviewCollapsed = false"
					>
						<span
							class="text-sm font-semibold tracking-[0.35em] text-white xl:text-base"
							style="writing-mode: vertical-rl"
						>
							總覽
						</span>
						<svg
							class="h-5 w-5 shrink-0 2xl:h-6 2xl:w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>
				</Transition>

				<div
					class="relative flex min-h-[664px] flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 2xl:min-h-[848px] 2xl:p-6"
				>
					<!-- 位置標題與地點選擇 -->
					<div
						class="absolute left-1/2 top-0 flex h-[36px] translate-x-[-50%] items-center justify-center bg-white text-[#595959] 2xl:h-[48px]"
						style="clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, calc(0% + 24px) 100%)"
					>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="ps-[12px] text-[24px] 2xl:text-[36px]">{{
								getLocationZone(selectedLocation)
							}}</span>
						</div>
						<div class="h-[24px] w-px bg-[#595959]"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="pe-[12px] text-[24px] 2xl:text-[36px]">{{
								selectedLocation.name
							}}</span>
						</div>
					</div>

					<button
						v-if="isAdmin"
						type="button"
						class="absolute left-8 top-2 rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:text-base"
						aria-label="地點管理"
						@click="handleOpenLocationDialog"
					>
						地點管理
					</button>
					<button
						type="button"
						class="absolute right-8 top-2 rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:text-base"
						aria-label="開啟完整報表"
						@click="handleOpenSimulation"
					>
						完整報表
					</button>

					<Transition name="fade" mode="out-in">
						<div
							v-if="selectedLocation || isLoadingLocation"
							:key="detailPanelKey"
							class="mt-16 flex min-h-0 flex-1 flex-col"
							:class="isOverviewCollapsed && 'mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px]'"
						>
							<div
								v-if="isLoadingLocation"
								class="grid min-h-[480px] flex-1 grid-cols-2 gap-4"
								aria-busy="true"
								aria-label="載入地點詳情"
							>
								<div class="h-full animate-pulse rounded-xl bg-white/10" />
								<div class="h-full animate-pulse rounded-xl bg-white/10" />
							</div>
							<div
								v-else-if="selectedLocation"
								class="flex min-h-0 flex-1"
								:class="{ 'monitoring-detail-enlarged': isOverviewCollapsed }"
							>
								<div class="min-w-0 flex-1">
									<LocationStatsPanel
										:entry-count="selectedLocation.entryCount || 0"
										:exit-count="selectedLocation.exitCount || 0"
										:current-count="currentCount"
										:logs="logs"
										:data-source="selectedLocation?.dataSource"
										:display-columns="selectedLocation?.logDisplayColumns"
									/>
								</div>
								<div class="ms-4 min-w-0 flex-1 border-l-2 border-white/30 ps-4">
									<LocationDetailPanel
										:location="selectedLocation"
										:personnel="personnel"
										:selected-unit-id="selectedUnitId"
										@unit-select="handleUnitSelect"
									/>
								</div>
							</div>
						</div>

						<div
							v-else-if="locations.length > 0"
							key="pick-location"
							class="mt-12 flex min-h-[600px] w-full items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
						>
							<p class="text-xl font-medium text-white/90 xl:text-2xl 2xl:text-3xl">請選擇地點</p>
							<p class="mt-2 text-sm text-white/70 xl:text-base">
								請從右側總覽點選地點以查看詳細資訊
							</p>
						</div>
					</Transition>
				</div>
			</section>

			<aside
				class="overview-sidebar"
				:class="isOverviewCollapsed ? 'overview-sidebar--collapsed' : 'overview-sidebar--expanded'"
				:aria-hidden="isOverviewCollapsed"
			>
				<div
					class="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 py-8"
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
								aria-label="收縮總覽"
								title="收縮總覽"
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

							<h2
								class="mb-4 text-center text-xl font-semibold tracking-[12px] text-white xl:text-2xl 2xl:text-3xl"
								style="padding-left: 12px"
							>
								總覽
							</h2>

							<div
								ref="overviewListRef"
								class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
							>
								<template v-if="locationsForOverview.length > 0">
									<LocationOverviewCard
										v-for="location in locationsForOverview"
										:key="getLocationId(location)"
										:data-overview-location-id="getLocationId(location)"
										:location="location"
										class="cursor-pointer transition-all hover:ring-2 hover:ring-cyan-300/50"
										:class="{ 'ring-2 ring-cyan-400': isCurrentLocation(location) }"
										@click="handleLocationSelect"
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
		v-if="isAdmin"
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
			:location-options="simulationLocationOptions"
			:location-summaries="simulationLocationSummaries"
			:location-display-columns="simulationLocationDisplayColumns"
			:time-range="simulationTimeRange"
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
import LocationStatsPanel from "~/components/people-counting/LocationStatsPanel.vue"
import LocationDetailPanel from "~/components/people-counting/LocationDetailPanel.vue"
import LocationOverviewCard from "~/components/people-counting/LocationOverviewCard.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import SimulationFrame from "~/components/common/SimulationFrame.vue"
import PeopleCountingSimulation from "~/components/people-counting/PeopleCountingSimulation.vue"
import { usePeopleCountingState } from "~/composables/systems/peopleCounting/usePeopleCountingState"
import { usePeopleCountingLocationApi } from "~/composables/location/api/usePeopleCountingLocationApi"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import { useZoneSystemAdapter } from "~/composables/location/adapters/useZoneSystemAdapter"
import {
	usePeopleCountingApi,
	PEOPLE_COUNTING_FULL_REPORT_LIMIT,
} from "~/composables/systems/peopleCounting/usePeopleCountingApi"
import { useAuth } from "~/composables/core/useAuth"
import { useApiBase } from "~/composables/core/useApiBase"
import {
	buildLogsTimeQuery,
	toSimulationTimeRange,
	type OperationalDayRangeResponse,
} from "~/utils/entryExitTimeRange"
import {
	firstFlatSiteMatchingSortedZoneLocations,
	sortFlatSitesBySortedZoneLocations,
} from "~/utils/sortOrder"
import { computeCumulativePresence } from "~/utils/entryExitStats"

const { isAdmin } = useAuth()

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
	setupEventListeners,
	isLoadingLocation,
} = usePeopleCountingState()

const peopleCountingApi = usePeopleCountingApi()
const { request } = useApiBase()
const fetchTodaySimulationRange = async () => {
	const range = await request<OperationalDayRangeResponse>(`/entry-exit/time-range?preset=today`)
	return toSimulationTimeRange(range, "today")
}

// 右側總覽：顯示 zone 名稱（不影響詳情載入）
const locationsForOverview = computed(() => {
	const locationsWithId = locations.value.filter(
		(l): l is PeopleCountingLocation & { locationId: number } => l.locationId != null
	)
	const ordered = sortFlatSitesBySortedZoneLocations(peopleCountingZones.value, locationsWithId)
	return ordered.map((location) => ({
		...location,
		overviewZoneName: getLocationZone(location),
	}))
})

const isIsapiCamera = computed(() => selectedLocation.value?.dataSource === "isapi_camera")

// 在場：transition 以 API currentCount 為準；攝影機以進−出
const currentCount = computed(() => {
	if (!selectedLocation.value) return 0
	if (isIsapiCamera.value) {
		return computeCumulativePresence(
			selectedLocation.value.entryCount ?? 0,
			selectedLocation.value.exitCount ?? 0
		)
	}
	if (selectedLocation.value.currentCount != null) {
		return selectedLocation.value.currentCount
	}
	if (!selectedLocation.value.units) return 0
	return selectedLocation.value.units.reduce((sum, unit) => sum + (unit.currentCount || 0), 0)
})

const isOverviewCollapsed = ref(false)
const overviewListRef = ref<HTMLElement | null>(null)
const detailPanelKey = computed(() => selectedLocationId.value || "__none__")

// 地點管理與模擬框狀態
const showLocationManagementDialog = ref(false)
const showSimulationFrame = ref(false)

const simulationTimeRange = ref({
	startDate: "",
	endDate: "",
	preset: "today",
})

const simulationLogs = ref<PeopleCountingLog[]>([])

type SimulationLocationOption = {
	locationId: number
	label: string
	zoneName: string
	locationName: string
	dataSource?: PeopleCountingLocation["dataSource"]
}

const simulationLocationOptions = computed((): SimulationLocationOption[] => {
	const opts: SimulationLocationOption[] = []
	for (const zone of peopleCountingZones.value) {
		for (const loc of zone.locations ?? []) {
			const locationId = loc.id != null ? Number(loc.id) : NaN
			if (!Number.isFinite(locationId)) continue
			const zoneName = zone.name || ""
			const locationName = loc.name || ""
			opts.push({
				locationId,
				label: [zoneName, locationName].filter(Boolean).join("-") || String(locationId),
				zoneName,
				locationName,
				dataSource: loc.dataSource,
			})
		}
	}
	return opts
})

const simulationLocationSummaries = computed(() => {
	const map: Record<
		number,
		{
			entryCount: number
			exitCount: number
			units: PeopleCountingLocation["units"]
			dataSource?: PeopleCountingLocation["dataSource"]
		}
	> = {}
	for (const loc of locations.value) {
		if (loc.locationId == null) continue
		map[loc.locationId] = {
			entryCount: loc.entryCount ?? 0,
			exitCount: loc.exitCount ?? 0,
			units: loc.units ?? [],
			dataSource: loc.dataSource,
		}
	}
	return map
})

const simulationLocationDisplayColumns = computed(() => {
	const map: Record<number, string[] | null | undefined> = {}
	for (const loc of locations.value) {
		if (loc.locationId == null) continue
		map[loc.locationId] = loc.logDisplayColumns ?? null
	}
	return map
})

/** 完整報表：跨地點載入時間區間內紀錄 */
const loadSimulationLogs = async () => {
	const { startDate, endDate, preset } = simulationTimeRange.value
	const timeQuery = buildLogsTimeQuery(preset, startDate, endDate)
	try {
		simulationLogs.value = await peopleCountingApi.getAllLocationLogs({
			limit: PEOPLE_COUNTING_FULL_REPORT_LIMIT,
			...timeQuery,
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
	void loadSimulationLogs()
}

const handleOpenSimulation = async () => {
	simulationTimeRange.value = await fetchTodaySimulationRange()
	showSimulationFrame.value = true
	await loadSimulationLogs()
}

const selectedLocationId = ref<string>("")

// 取得適配器（用於獲取統一的 getLocationId 方法）
const adapter = useZoneSystemAdapter<PeopleCountingZone, PeopleCountingLocation>("people_counting")

// 從地點對象獲取 ID（用於刪除邏輯，與環境品質保持一致）
// 使用適配器提供的統一方法
const getLocationId = (location: PeopleCountingLocation): string => {
	const zoneName = getLocationZone(location)
	const zone =
		peopleCountingZones.value.find((z) =>
			(z.locations || []).some(
				(l) => l === location || (l.id && location.id && l.id === location.id)
			)
		) ?? null
	if (!zone || !adapter.getLocationId) return `${zoneName || "unknown"}-${location.name}`
	const idx = (zone.locations || []).findIndex(
		(l) => l === location || (l.id && location.id && l.id === location.id)
	)
	if (idx < 0) return `${zoneName || "unknown"}-${location.name}`
	return adapter.getLocationId({ zone, location, locationIndex: idx })
}

watch(
	() => selectedLocation.value,
	(loc) => {
		selectedLocationId.value = loc ? getLocationId(loc) : ""
	},
	{ immediate: true }
)

const scrollActiveOverviewIntoView = () => {
	const id = selectedLocationId.value
	if (!id || isOverviewCollapsed.value) return
	const root = overviewListRef.value
	if (!root) return
	root.querySelector(`[data-overview-location-id="${CSS.escape(id)}"]`)?.scrollIntoView({
		block: "nearest",
		behavior: "smooth",
	})
}

watch(selectedLocationId, () => {
	nextTick(() => scrollActiveOverviewIntoView())
})

watch(isOverviewCollapsed, (collapsed) => {
	if (!collapsed) nextTick(() => scrollActiveOverviewIntoView())
})

// 檢查是否為當前選中的地點（與 environment 一致：使用單一 canonical id，僅一卡高亮）
const isCurrentLocation = (location: PeopleCountingLocation): boolean => {
	return getLocationId(location) === selectedLocationId.value
}

const handleLocationSelect = async (locationId: number) => {
	if (selectedLocation.value?.locationId === locationId) return
	const loc = locationsForOverview.value.find((l) => l.locationId === locationId)
	if (loc) selectedLocationId.value = getLocationId(loc)
	await loadLocationDetail(locationId)
}

// 設置 WebSocket 事件監聽器
let cleanupWebSocket: (() => void) | null = null

// 使用區域管理 composable
const peopleCountingLocationApi = usePeopleCountingLocationApi()
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
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await peopleCountingLocationApi.createZone({
						name: z.name,
						sortOrder: z.sortOrder,
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
				await loadZones()
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
	if (!isAdmin.value) return
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
	cleanupWebSocket = setupEventListeners(async () => {
		const locationId = selectedLocation.value?.locationId
		await Promise.allSettled([
			loadLocations(),
			locationId ? loadLocationDetail(locationId) : Promise.resolve(),
		])
	}, 500)

	try {
		await loadLocations()
		if (peopleCountingZones.value.length === 0) await loadZones()

		if (!selectedLocation.value && locations.value.length > 0) {
			const locationsWithId = locations.value.filter(
				(l): l is typeof l & { locationId: number } => l.locationId != null
			)
			const hit = firstFlatSiteMatchingSortedZoneLocations(
				peopleCountingZones.value,
				locationsWithId
			)
			if (hit?.locationId != null) await handleLocationSelect(hit.locationId)
		}
	} catch {
		// 錯誤已在 composable 處理
	}

	await nextTick()
	scrollActiveOverviewIntoView()
})

onBeforeUnmount(() => {
	if (cleanupWebSocket) {
		cleanupWebSocket()
		cleanupWebSocket = null
	}
})
</script>
