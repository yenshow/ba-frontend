<template>
	<div>
		<div class="flex justify-center gap-4 xl:gap-6 2xl:gap-8">
			<!-- 左側：主要內容 -->
			<section class="relative flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="relative flex min-h-[664px] flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 2xl:min-h-[848px] 2xl:p-6"
				>
					<!-- 位置標題 -->
					<div
						class="absolute left-1/2 top-0 flex h-[36px] translate-x-[-50%] items-center justify-center bg-white text-[#595959] 2xl:h-[48px]"
						style="clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, calc(0% + 24px) 100%)"
					>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="ps-[12px] text-[24px] 2xl:text-[36px]">
								{{ getLocationZone(selectedLocation) || "－" }}
							</span>
						</div>
						<div class="h-[24px] w-px bg-[#595959]"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedLocation" class="pe-[12px] text-[24px] 2xl:text-[36px]">
								{{ selectedLocation.name }}
							</span>
						</div>
					</div>

					<button
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

					<template v-if="selectedLocation">
						<div class="mt-16 flex flex-col gap-12">
							<!-- 統計：進場／出場／在場車輛 -->
							<div class="flex-1">
								<VehicleStatsPanel
									:entry-count="entryCount"
									:exit-count="exitCount"
									:current-count="onSiteCount"
								/>
							</div>
							<!-- 當日記錄表 + 車輛群組（依 platform.vehicle_list.person_group_id + person_group 穩定取得，進出由 passageway_log_data 計算） -->
							<div class="grid grid-cols-2 gap-4">
								<!-- 當日過車記錄表 -->
								<div class="space-y-3">
									<!-- 時間篩選：今日／昨日 -->
									<div class="flex flex-wrap items-center gap-2">
										<span class="text-sm text-white/80 2xl:text-base">時間：</span>
										<button
											v-for="opt in timeRangeOptions"
											:key="opt.value"
											type="button"
											class="rounded-lg px-4 py-2 text-sm font-medium transition-colors 2xl:text-base"
											:class="
												filters.timeRange === opt.value
													? 'bg-cyan-500/80 text-white'
													: 'bg-white/20 text-white hover:bg-white/30'
											"
											:aria-label="`篩選${opt.label}`"
											@click="handleTimeRangeChange(opt.value)"
										>
											{{ opt.label }}
										</button>
									</div>
									<div v-if="isLoadingLogs" class="flex justify-center py-8">
										<div
											class="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
										></div>
									</div>
									<div v-else>
										<VehicleDataLogTable :logs="logs" />
									</div>
								</div>
								<!-- 車輛群組（工程部、行銷部等，點開顯示該群組過車記錄） -->
								<VehicleOrganizationGroupPanel
									:groups="organizationGroups ?? []"
									:selected-group-key="selectedOrganizationKey ?? undefined"
									@select="handleOrganizationGroupSelect"
								/>
							</div>
						</div>
					</template>

					<!-- 未選地點：請從右側選擇 -->
					<div
						v-else-if="locations.length > 0"
						class="mt-12 flex min-h-[600px] w-full items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
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
									d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m-6-1a1 1 0 001-1V7m8 10v3m0 0v-3m0 0h-3m3 0h3"
								/>
							</svg>
							<p class="text-xl font-medium text-white/90 xl:text-2xl 2xl:text-3xl">請選擇地點</p>
							<p class="mt-2 text-sm text-white/70 xl:text-base">
								請從右側列表點選地點以查看詳細資訊
							</p>
						</div>
					</div>
					<!-- 尚無地點 -->
					<div
						v-else-if="locations.length === 0 && !isLoadingZones"
						class="mt-12 flex min-h-[400px] w-full items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-12 text-center"
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
									d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1h-1m-6-1a1 1 0 001-1V7m8 10v3m0 0v-3m0 0h-3m3 0h3"
								/>
							</svg>
							<p class="text-xl font-medium text-white/90 xl:text-2xl 2xl:text-3xl">
								尚無車輛進出地點
							</p>
							<p class="mt-2 text-sm text-white/70 xl:text-base">
								請在「地點管理」中新增含車輛進出系統的地點
							</p>
						</div>
					</div>
				</div>
			</section>

			<!-- 右側：總覽 -->
			<aside
				:class="[
					'flex flex-col transition-all duration-500 ease-in-out',
					isSidebarCollapsed ? 'flex-[0.05]' : 'flex-[0.8] 2xl:flex-[0.7]',
				]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<div
					class="show-scrollbar relative flex h-full min-w-[72px] flex-col overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-white/80 bg-white/30 py-8 transition-all duration-500 ease-in-out 2xl:min-w-[84px]"
				>
					<Transition name="fade">
						<h2
							v-if="!isSidebarCollapsed"
							key="title"
							class="mb-4 text-center text-xl font-semibold tracking-[12px] text-white xl:text-2xl 2xl:text-3xl"
							style="padding-left: 12px"
						>
							總覽
						</h2>
					</Transition>
					<button
						type="button"
						class="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 text-white transition-colors hover:bg-white/20 2xl:h-12 2xl:w-12"
						:title="isSidebarCollapsed ? '展開列表' : '收縮列表'"
						@click="isSidebarCollapsed = !isSidebarCollapsed"
					>
						<svg
							class="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7"
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

					<Transition name="fade">
						<div
							v-if="!isSidebarCollapsed"
							key="content"
							class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
						>
							<template v-if="overviewSummariesWithZone.length > 0">
								<VehicleOverviewCard
									v-for="summary in overviewSummariesWithZone"
									:key="summary.id"
									:summary="summary"
									:groups="organizationGroups ?? []"
									:class="{
										'ring-2 ring-cyan-400': isCurrentSummary(summary),
										'cursor-pointer transition-all hover:ring-2 hover:ring-cyan-300/50': true,
									}"
									@click="handleOverviewClick(summary.id)"
								/>
							</template>
							<div v-else class="py-8 text-center text-white/60">
								<p class="text-base 2xl:text-lg">尚無地點資料</p>
								<p class="mt-2 text-sm 2xl:text-base">請在「地點管理」中新增地點</p>
							</div>
						</div>
					</Transition>
				</div>
			</aside>
		</div>
	</div>

	<ZoneManagementDialog
		v-model="showLocationManagementDialog"
		:zones="vehicleAccessZones"
		system-type="vehicle_access"
		:require-image-url="false"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>

	<VehicleGroupDetailDialog
		v-model="isGroupDialogOpen"
		:group-name="selectedOrganizationGroupName"
		:vehicle-list="organizationGroupVehicleList"
		@close="handleOrganizationDialogClose"
	/>

	<SimulationFrame v-model="showSimulationFrame" title="車輛進出 - 完整報表">
		<VehicleAccessSimulation
			:logs="simulationLogs"
			:zone-name="simulationZoneName"
			:location-name="simulationLocationName"
			:time-range="simulationTimeRange"
			@update:time-range="handleSimulationTimeRangeUpdate"
		/>
	</SimulationFrame>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, nextTick, computed, ref } from "vue"
import type {
	VehicleAccessZone,
	VehicleAccessLocation,
	VehicleAccessLocationSummary,
	VehicleDataLog,
} from "~/types/vehicleAccess"
import type { VehicleAccessTimeRange } from "~/composables/systems/vehicleAccess/useVehicleAccessState"
import VehicleStatsPanel from "~/components/vehicle-access/VehicleStatsPanel.vue"
import VehicleDataLogTable from "~/components/vehicle-access/VehicleDataLogTable.vue"
import VehicleOrganizationGroupPanel from "~/components/vehicle-access/VehicleOrganizationGroupPanel.vue"
import VehicleOverviewCard from "~/components/vehicle-access/VehicleOverviewCard.vue"
import VehicleGroupDetailDialog from "~/components/vehicle-access/VehicleGroupDetailDialog.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import SimulationFrame from "~/components/common/SimulationFrame.vue"
import VehicleAccessSimulation from "~/components/vehicle-access/VehicleAccessSimulation.vue"
import { useVehicleAccessState } from "~/composables/systems/vehicleAccess/useVehicleAccessState"
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi"
import { useVehicleAccessWebSocket } from "~/composables/systems/vehicleAccess/useVehicleAccessWebSocket"
import { useVehicleAccessLocationApi } from "~/composables/systems/location/useVehicleAccessLocationApi"
import { useZoneManagement } from "~/composables/systems/useZoneManagement"
import { useLocationApi } from "~/composables/systems/location/useLocationApi"
import { useZoneSystemAdapter } from "~/composables/systems/useZoneSystemAdapter"
import type { UnifiedZone } from "~/types/location"
import { getTodayDateRangeUTC } from "~/utils/dateUtils"

const {
	filters,
	vehicleAccessZones,
	locations,
	selectedLocation,
	selectedLaneIds,
	logs,
	overviewSummaries,
	entryCount,
	exitCount,
	onSiteCount,
	organizationGroups,
	selectedOrganizationKey,
	organizationGroupVehicleList,
	setSelectedOrganizationKey,
	isLoadingZones,
	isLoadingLogs,
	isLoadingVehicleGroups,
	loadZones,
	loadLogs,
	loadVehicleGroups,
	loadEntryExitOnSiteCounts,
	loadOverviewSummaries,
	getLocationZone,
} = useVehicleAccessState()

const vehicleAccessApi = useVehicleAccessApi()

const showSimulationFrame = ref(false)
const { start: todayStart, end: todayEnd } = getTodayDateRangeUTC()
const simulationTimeRange = ref({
	startDate: todayStart.toISOString(),
	endDate: todayEnd.toISOString(),
	preset: "today",
})
const simulationZoneName = computed(() =>
	selectedLocation.value ? (getLocationZone(selectedLocation.value) ?? "") : ""
)
const simulationLocationName = computed(() => selectedLocation.value?.name ?? "")
const simulationLogs = ref<VehicleDataLog[]>([])

const loadSimulationLogs = async () => {
	const laneIds = selectedLaneIds.value
	if (!laneIds?.length) {
		simulationLogs.value = []
		return
	}
	const { startDate, endDate } = simulationTimeRange.value
	try {
		const result = await vehicleAccessApi.getVehicleDataLogList({
			lane_id: laneIds,
			startTime: startDate,
			endTime: endDate,
			limit: 50000,
			orderBy: "trigger_time",
			orderDirection: "ASC",
		})
		simulationLogs.value = result.data ?? []
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
	const { start, end } = getTodayDateRangeUTC()
	simulationTimeRange.value = {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset: "today",
	}
	showSimulationFrame.value = true
	await loadSimulationLogs()
}

const isGroupDialogOpen = ref(false)
/** 彈窗標題：選中單位名稱（工程部、行銷部等） */
const selectedOrganizationGroupName = computed(() => {
	const key = selectedOrganizationKey.value
	if (!key) return ""
	const g = organizationGroups.value.find((gr) => gr.groupKey === key)
	return g?.personGroupName ?? ""
})

const handleOrganizationGroupSelect = (groupKey: string) => {
	setSelectedOrganizationKey(groupKey)
	isGroupDialogOpen.value = true
}

const handleOrganizationDialogClose = () => {
	setSelectedOrganizationKey(null)
}

/** 時間篩選選項：今日、昨日 */
const timeRangeOptions: { value: VehicleAccessTimeRange; label: string }[] = [
	{ value: "today", label: "今日" },
	{ value: "yesterday", label: "昨日" },
]
const handleTimeRangeChange = (value: VehicleAccessTimeRange) => {
	if (filters.value.timeRange === value) return
	filters.value = { ...filters.value, timeRange: value }
	loadLogsAndCounts()
}

const selectedLocationIdRef = ref<string>("")
watch(
	() => filters.value.locationId,
	(id) => {
		selectedLocationIdRef.value = id ?? ""
	},
	{ immediate: true }
)
watch(selectedLocationIdRef, (id) => {
	if (filters.value.locationId !== (id || null)) {
		filters.value = { ...filters.value, locationId: id || null }
	}
})

const overviewSummariesWithZone = computed(() =>
	overviewSummaries.value.map((s) => ({
		...s,
		zoneName: s.zoneName ?? vehicleAccessZones.value.find((z) => z.id === s.zoneId)?.name ?? null,
	}))
)

const leftSectionRef = ref<HTMLElement | null>(null)
const leftSectionHeight = ref<number | null>(null)
let leftSectionResizeObserver: ResizeObserver | null = null

const updateLeftSectionHeight = () => {
	if (leftSectionRef.value) {
		leftSectionHeight.value = leftSectionRef.value.offsetHeight
	}
}

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

const isSidebarCollapsed = ref(false)
const showLocationManagementDialog = ref(false)

const vehicleAccessLocationApi = useVehicleAccessLocationApi()
const locationApi = useLocationApi()
const adapter = useZoneSystemAdapter<VehicleAccessZone, VehicleAccessLocation>("vehicle_access")
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<VehicleAccessZone>()

const getLocationId = (location: VehicleAccessLocation & { zoneName?: string }): string => {
	const zoneName =
		location.zoneName ??
		vehicleAccessZones.value.find((z) =>
			z.locations?.some((l) => l.id === location.id || l.name === location.name)
		)?.name
	return (
		adapter.getLocationId?.(location, zoneName ?? undefined) ??
		`${zoneName ?? "unknown"}-${location.name}`
	)
}

// 與 environment 一致：僅以單一 id 判斷選定，確保總覽只有一卡高亮
const isCurrentSummary = (summary: VehicleAccessLocationSummary): boolean => {
	const selectedId = filters.value.locationId ?? ""
	if (!selectedId) return false
	return String(summary.id ?? "") === String(selectedId)
}

/** 與人流統計一致：地點／列表變更時更新右側高度 */
watch([selectedLocation, locations, vehicleAccessZones], () => {
	nextTick(() => updateLeftSectionHeight())
})

const handleOverviewClick = (locationId: string) => {
	filters.value = { ...filters.value, locationId: locationId || null }
}

const handleOpenLocationDialog = async () => {
	if (vehicleAccessZones.value.length === 0) {
		await loadZones()
	}
	showLocationManagementDialog.value = true
}

const handleSaveZone = async (zone: VehicleAccessZone) => {
	await baseHandleSaveZone(
		zone,
		vehicleAccessZones,
		async (z: VehicleAccessZone) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await vehicleAccessLocationApi.updateZone(z.id, { name: z.name, locations: z.locations })
				: await vehicleAccessLocationApi.createZone({ name: z.name, locations: z.locations })
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as VehicleAccessZone & {
				id: string
			}
			return {
				merged: result.merged,
				message: result.message,
				zone: zoneWithId,
			}
		},
		{
			onAfterSave: async () => {
				await loadZones()
				await loadOverviewSummaries()
			},
		}
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, vehicleAccessZones, vehicleAccessLocationApi.deleteZone, {
		selectedLocationRef: selectedLocationIdRef,
		getLocationId: (loc: VehicleAccessLocation) => getLocationId(loc),
		getFullZoneApiCall: (id: string) => locationApi.getZone(id),
		updateZoneApiCall: async (id: string, data: { locations: UnifiedZone["locations"] }) => {
			const response = await locationApi.updateZone(id, { locations: data.locations })
			return {
				merged: response.merged,
				message: response.message,
				zone: response.zone as unknown as VehicleAccessZone,
			}
		},
		systemType: "vehicle_access",
		onAfterDelete: async () => {
			await loadZones()
			await loadOverviewSummaries()
		},
	})
}

const { setupEventListeners } = useVehicleAccessWebSocket()
let cleanupWebSocket: (() => void) | null = null

/** 防抖：避免 locationId 變更時重複請求 */
const DEBOUNCE_MS = 200
let loadDataDebounceTimer: ReturnType<typeof setTimeout> | null = null
const loadLogsAndCounts = () => {
	if (loadDataDebounceTimer) clearTimeout(loadDataDebounceTimer)
	loadDataDebounceTimer = setTimeout(() => {
		loadDataDebounceTimer = null
		Promise.all([loadLogs(), loadEntryExitOnSiteCounts(), loadVehicleGroups()])
	}, DEBOUNCE_MS)
}

watch(
	() => filters.value.locationId,
	() => {
		loadLogsAndCounts()
	}
)

onMounted(async () => {
	initLeftSectionObserver()

	cleanupWebSocket = setupEventListeners(async () => {
		await Promise.allSettled([
			loadLogs(),
			loadEntryExitOnSiteCounts(),
			loadOverviewSummaries(),
			loadVehicleGroups(),
		])
		await nextTick()
		updateLeftSectionHeight()
	}, 500)

	try {
		await loadZones()
		await loadOverviewSummaries()
		await loadVehicleGroups()
		if (locations.value.length > 0 && !selectedLocation.value) {
			const first = locations.value[0]
			const firstId = first?.id ?? first?.locationId
			if (firstId != null) {
				filters.value = { ...filters.value, locationId: String(firstId) }
				// 由 watch(filters.value.locationId) 統一觸發 loadLogs + loadEntryExitOnSiteCounts，避免重複請求
			}
		}
	} catch {
		// 錯誤已在 composable 處理
	}
	nextTick(() => updateLeftSectionHeight())
})

onBeforeUnmount(() => {
	if (loadDataDebounceTimer) {
		clearTimeout(loadDataDebounceTimer)
		loadDataDebounceTimer = null
	}
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value)
		leftSectionResizeObserver.disconnect()
		leftSectionResizeObserver = null
	}
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
