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
						v-if="canWrite && isIsapiCamera && selectedLocation"
						type="button"
						class="absolute left-8 top-2 rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:text-base"
						aria-label="車牌管理"
						@click="showIsapiManageDialog = true"
					>
						車牌管理
					</button>
					<button
						v-if="isAdmin"
						type="button"
						class="absolute left-36 top-2 rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:text-base"
						aria-label="地點管理"
						@click="handleOpenLocationDialog"
					>
						地點管理
					</button>
					<button
						v-if="canWrite && isParkingMode"
						type="button"
						class="absolute right-36 top-2 rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:text-base"
						aria-label="重製停車場統計"
						@click="handleResetParkingStats"
					>
						重製統計
					</button>
					<button
						type="button"
						class="absolute right-8 top-2 rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all hover:from-cyan-400/40 hover:to-blue-500/40 2xl:text-base"
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
									:on-site-capacity="onSiteCapacity"
								/>
							</div>
							<!-- 當日過車記錄表 + 車輛群組（ISAPI 道閘在右側總覽卡） -->
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-3">
									<div v-if="isLoadingLogs" class="flex justify-center py-8">
										<div
											class="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
										></div>
									</div>
									<div v-else>
										<VehicleDataLogTable
											:logs="logs"
											:display-columns="selectedLocation?.logDisplayColumns"
										/>
									</div>
								</div>
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
									:location="findLocationForSummary(summary)"
									:can-write="canWrite"
									:is-active="isCurrentSummary(summary)"
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
		v-if="isAdmin"
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
		:list-variant="isIsapiCamera ? 'personnel' : 'vehicle'"
		@close="handleOrganizationDialogClose"
	/>

	<VehicleAccessIsapiManageDialog
		v-model="showIsapiManageDialog"
		:location="selectedLocation"
		:can-write="canWrite"
	/>

	<SimulationFrame v-model="showSimulationFrame" title="車輛進出 - 完整報表">
		<VehicleAccessSimulation
			:logs="simulationLogs"
			:location-options="simulationLocationOptions"
			:location-display-columns="simulationLocationDisplayColumns"
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
import VehicleStatsPanel from "~/components/vehicle-access/VehicleStatsPanel.vue"
import VehicleDataLogTable from "~/components/vehicle-access/VehicleDataLogTable.vue"
import VehicleOrganizationGroupPanel from "~/components/vehicle-access/VehicleOrganizationGroupPanel.vue"
import VehicleOverviewCard from "~/components/vehicle-access/VehicleOverviewCard.vue"
import VehicleGroupDetailDialog from "~/components/vehicle-access/VehicleGroupDetailDialog.vue"
import VehicleAccessIsapiManageDialog from "~/components/vehicle-access/VehicleAccessIsapiManageDialog.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import SimulationFrame from "~/components/common/SimulationFrame.vue"
import VehicleAccessSimulation, {
	type VehicleAccessSimulationLocationOption,
} from "~/components/vehicle-access/VehicleAccessSimulation.vue"
import { useVehicleAccessState } from "~/composables/systems/vehicleAccess/useVehicleAccessState"
import { useVehicleAccessLocationApi } from "~/composables/location/api/useVehicleAccessLocationApi"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import { useZoneSystemAdapter } from "~/composables/location/adapters/useZoneSystemAdapter"
import { useAuth } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useApiBase } from "~/composables/core/useApiBase"
import { toSimulationTimeRange, type OperationalDayRangeResponse } from "~/utils/entryExitTimeRange"

const { canWrite, isAdmin } = useAuth()

const {
	filters,
	vehicleAccessZones,
	locations,
	selectedLocation,
	isIsapiCamera,
	isParkingMode,
	logs,
	overviewSummaries,
	entryCount,
	exitCount,
	onSiteCount,
	onSiteCapacity,
	organizationGroups,
	selectedOrganizationKey,
	organizationGroupVehicleList,
	setSelectedOrganizationKey,
	isLoadingZones,
	isLoadingLogs,
	loadZones,
	loadLogs,
	loadOrganizationData,
	loadFullReportLogs,
	loadEntryExitOnSiteCounts,
	loadOverviewSummaries,
	getLocationZone,
	setupEventListeners,
	resetParkingStatsForSelectedSite,
} = useVehicleAccessState()

const { showToast } = useToast()

const showSimulationFrame = ref(false)
const { request } = useApiBase()
const fetchTodaySimulationRange = async () => {
	const range = await request<OperationalDayRangeResponse>(`/entry-exit/time-range?preset=today`)
	return toSimulationTimeRange(range, "today")
}
const simulationTimeRange = ref({
	startDate: "",
	endDate: "",
	preset: "today",
})
const simulationLogs = ref<VehicleDataLog[]>([])

const simulationLocationOptions = computed((): VehicleAccessSimulationLocationOption[] => {
	const opts: VehicleAccessSimulationLocationOption[] = []
	for (const loc of locations.value) {
		const locationId = loc.id != null ? Number(loc.id) : Number(loc.locationId)
		if (!Number.isFinite(locationId)) continue
		const zoneName = loc.zoneName || ""
		const locationName = loc.name || ""
		opts.push({
			locationId,
			label: [zoneName, locationName].filter(Boolean).join("-") || String(locationId),
			zoneName,
			locationName,
		})
	}
	return opts
})

const simulationLocationDisplayColumns = computed(() => {
	const map: Record<number, string[] | null | undefined> = {}
	for (const loc of locations.value) {
		const id = loc.id != null ? Number(loc.id) : Number(loc.locationId)
		if (!Number.isFinite(id)) continue
		map[id] = loc.logDisplayColumns ?? null
	}
	return map
})

/** 完整報表：跨地點載入時間區間內紀錄 */
const loadSimulationLogs = async () => {
	const { startDate, endDate, preset } = simulationTimeRange.value
	try {
		simulationLogs.value = await loadFullReportLogs({
			startTime: startDate,
			endTime: endDate,
			preset,
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

const isGroupDialogOpen = ref(false)
const showIsapiManageDialog = ref(false)

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
const adapter = useZoneSystemAdapter<VehicleAccessZone, VehicleAccessLocation>("vehicle_access")
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<VehicleAccessLocation, VehicleAccessZone>()

const getLocationId = (location: VehicleAccessLocation & { zoneName?: string }): string => {
	const zone =
		vehicleAccessZones.value.find((z) =>
			(z.locations || []).some(
				(l) => l === location || (l.id && location.id && l.id === location.id)
			)
		) ?? null
	const zoneName = location.zoneName ?? zone?.name ?? null
	if (!zone || !adapter.getLocationId) {
		return `${zoneName ?? "unknown"}-${location.name}`
	}
	const idx = (zone.locations || []).findIndex(
		(l) => l === location || (l.id && location.id && l.id === location.id)
	)
	if (idx < 0) return `${zoneName ?? "unknown"}-${location.name}`
	return adapter.getLocationId({ zone, location, locationIndex: idx })
}

const findLocationForSummary = (
	summary: VehicleAccessLocationSummary
): VehicleAccessLocation | null => {
	const id = String(summary.id ?? summary.locationId ?? "")
	for (const zone of vehicleAccessZones.value) {
		for (const loc of zone.locations || []) {
			const locId = getLocationId(loc as VehicleAccessLocation & { zoneName?: string })
			if (locId === id || String(loc.id ?? "") === id) {
				return loc
			}
		}
	}
	return null
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

const handleResetParkingStats = async () => {
	if (!isParkingMode.value) return
	const confirmed = window.confirm(
		"確定要重製此停車場的進場、出場與在場統計？過車紀錄不會刪除，完整報表仍可查詢歷史。"
	)
	if (!confirmed) return
	try {
		await resetParkingStatsForSelectedSite()
		showToast("success", "已重製停車場統計")
	} catch (error) {
		showToast("error", error instanceof Error ? error.message : "重製失敗")
	}
}

const handleOpenLocationDialog = async () => {
	if (!isAdmin.value) return
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
				? await vehicleAccessLocationApi.updateZone(z.id, {
						name: z.name,
						sortOrder: (z as unknown as { sortOrder?: number }).sortOrder,
						locations: z.locations,
					})
				: await vehicleAccessLocationApi.createZone({
						name: z.name,
						sortOrder: (z as unknown as { sortOrder?: number }).sortOrder,
						locations: z.locations,
					})
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
		systemType: "vehicle_access",
		onAfterDelete: async () => {
			await loadZones()
			await loadOverviewSummaries()
		},
	})
}

let cleanupWebSocket: (() => void) | null = null

/** 防抖：避免 locationId 變更時重複請求 */
const DEBOUNCE_MS = 200
let loadDataDebounceTimer: ReturnType<typeof setTimeout> | null = null
const loadLogsAndCounts = () => {
	if (loadDataDebounceTimer) clearTimeout(loadDataDebounceTimer)
	loadDataDebounceTimer = setTimeout(async () => {
		loadDataDebounceTimer = null
		await Promise.all([loadEntryExitOnSiteCounts(), loadOverviewSummaries()])
		await loadOrganizationData()
		await loadLogs()
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
		const locationId = filters.value.locationId
		await Promise.allSettled([loadOverviewSummaries(), loadEntryExitOnSiteCounts()])
		if (locationId) {
			await loadOrganizationData()
			await loadLogs()
		}
		await nextTick()
		updateLeftSectionHeight()
	}, 500)

	try {
		await loadZones()
		await loadOverviewSummaries()
		if (!filters.value.locationId && locations.value.length > 0) {
			const first = locations.value[0]
			const firstId = first?.id ?? first?.locationId
			if (firstId != null) {
				filters.value = { ...filters.value, locationId: String(firstId) }
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
