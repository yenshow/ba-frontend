<template>
	<div>
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
					</button>
				</Transition>

				<div
					class="relative flex min-h-[664px] flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 2xl:min-h-[848px] 2xl:p-6"
				>
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

					<PermissionActionButton
						:allowed="canManageLocation"
						aria-label="地點管理"
						class="absolute left-8 top-2 btn-monitoring-overlay"
						@click="showLocationManagementDialog = true"
					>
						地點管理
					</PermissionActionButton>
					<PermissionActionButton
						v-show="selectedLocation"
						:allowed="canFloorManage"
						aria-label="樓層管理"
						class="absolute left-32 2xl:left-36 top-2 btn-monitoring-overlay"
						@click="showFloorManageDialog = true"
					>
						樓層管理
					</PermissionActionButton>
					<PermissionActionButton
						:allowed="canFullReport"
						aria-label="開啟完整報表"
						class="absolute right-8 top-2 btn-monitoring-overlay"
						@click="handleOpenSimulation"
					>
						完整報表
					</PermissionActionButton>

					<MonitoringDetailShell
						:empty="detailEmpty"
						:enlarged="isOverviewCollapsed"
						content-class="flex min-h-0 flex-1 flex-col"
					>
						<div v-if="selectedLocation" class="flex min-h-0 flex-1">
							<ElevatorDetailPanel
								:logs="logs"
								:display-columns="selectedLocation.logDisplayColumns"
								:ladder-device-id="ladderDeviceId"
								:call-device-id="callDeviceId"
								:has-floor-detection="hasFloorDetection"
								:location-id="selectedLocationNumericId"
								:can-control="canControlDevice"
								:floors="selectedLocation.floors"
								:panel="selectedLocation.panel"
								:live="selectedLiveState"
								:is-ladder-connected="isLadderDeviceConnected"
								:is-call-connected="isCallDeviceConnected"
								:is-floor-detection-connected="isFloorDetectionDeviceConnected"
								@runtime-updated="handleDetailRuntimeUpdated"
								@logs-refresh="handleLogsRefresh"
							/>
						</div>
					</MonitoringDetailShell>
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
							<div class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
								<template v-if="locationsForOverview.length > 0">
									<ElevatorLocationOverviewCard
										v-for="location in locationsForOverview"
										:key="location.locationId"
										:location="location"
										:is-connected="locationConnectionById[location.locationId] ?? false"
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
		v-model="showLocationManagementDialog"
		:zones="elevatorZones"
		system-type="elevator"
		:require-image-url="false"
		:can-create-zone="canCreateLocation"
		:can-update-zone="canUpdateLocation"
		:can-delete-zone="canDeleteLocation"
		device-hint="請先在設備管理建立 YS-K2210 等梯控設備"
		:on-save-zone="handleSaveZone"
		@saved="handleZonesSaved"
		@delete="handleDeleteZone"
	/>

	<ElevatorFloorManageDialog
		v-model="showFloorManageDialog"
		:location-id="selectedLocationNumericId"
		:location-name="selectedLocationDisplayName"
		:can-edit-floors="canFloorManage"
		:can-device-sync="canFloorManage"
		:floor-sync="floorSync"
		@synced="handleFloorManageSynced"
		@floors-updated="handleFloorManageSynced"
	/>

	<SimulationFrame v-model="showSimulationFrame" title="電梯管理 - 完整報表">
		<ElevatorEventSimulation
			:logs="simulationLogs"
			:location-options="simulationLocationOptions"
			:time-range="simulationTimeRange"
			@update:time-range="handleSimulationTimeRangeUpdate"
		/>
	</SimulationFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue"
import type {
	ElevatorZone,
	ElevatorLocation,
	ElevatorLog,
	ElevatorLiveState,
} from "~/types/elevator"
import type {
	MonitoringDeviceStatusBatchEvent,
	MonitoringDeviceStatusEvent,
} from "~/types/websocket"
import MonitoringDetailShell from "~/components/common/MonitoringDetailShell.vue"
import SimulationFrame from "~/components/common/SimulationFrame.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import ElevatorDetailPanel from "~/components/elevator/ElevatorDetailPanel.vue"
import ElevatorLocationOverviewCard from "~/components/elevator/ElevatorLocationOverviewCard.vue"
import ElevatorFloorManageDialog from "~/components/elevator/ElevatorFloorManageDialog.vue"
import ElevatorEventSimulation from "~/components/elevator/ElevatorEventSimulation.vue"
import { useElevatorState } from "~/composables/systems/elevator/useElevatorState"
import {
	useElevatorApi,
	ELEVATOR_FULL_REPORT_LIMIT,
} from "~/composables/systems/elevator/useElevatorApi"
import { useElevatorLocationApi } from "~/composables/location/api/useElevatorLocationApi"
import {
	useZoneManagement,
	ZONE_DIALOG_BATCH_SAVE_OPTIONS,
} from "~/composables/location/management/useZoneManagement"
import { useLocationModuleRbac } from "~/composables/core/useAccessGate"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useElevatorSyncEngine } from "~/composables/systems/elevator/useElevatorSyncEngine"
import { useDeviceConnectivity } from "~/composables/systems/devices/useDeviceConnectivity"
import { useDeviceWebSocket } from "~/composables/websocket/subscribers/useDeviceWebSocket"
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
import { PERM } from "~/config/permissionCodes"
import { useElevatorLiveSync } from "~/composables/systems/elevator/useElevatorLiveSync"
import { collectElevatorMonitoringDeviceIds } from "~/utils/elevatorFloorModel"
import { isElevatorPanelConnected } from "~/utils/elevatorDisplayUtils"

const {
	canManageLocation,
	canCreateLocation,
	canUpdateLocation,
	canDeleteLocation,
	canFullReport,
	canControlDevice,
	canFloorManage,
} = useLocationModuleRbac(PERM.elevator)

const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()
const elevatorApi = useElevatorApi()
const floorSync = useElevatorSyncEngine({
	elevatorApi,
	toast,
	handleApiError,
	canDeviceSync: canFloorManage,
})

const {
	locations,
	selectedLocation,
	logs,
	elevatorZones,
	loadLocations,
	loadLocationDetail,
	loadZones,
	getLocationZone,
	setupEventListeners,
	isLoadingLocations,
	isLoadingZones,
} = useElevatorState()

const { request } = useApiBase()

const detailEmpty = computed(
	() => locations.value.length === 0 && !isLoadingLocations.value && !isLoadingZones.value
)

const isOverviewCollapsed = ref(false)
const showLocationManagementDialog = ref(false)
const showFloorManageDialog = ref(false)
const showSimulationFrame = ref(false)

const locationsForOverview = computed(() => {
	const withId = locations.value.filter(
		(l): l is ElevatorLocation & { locationId: number } => l.locationId != null
	)
	return sortFlatSitesBySortedZoneLocations(elevatorZones.value, withId).map((location) => ({
		...location,
		overviewZoneName: getLocationZone(location),
	}))
})

const selectedLocationNumericId = computed(() => {
	const id = selectedLocation.value?.locationId ?? selectedLocation.value?.id
	const n = Number(id)
	return Number.isFinite(n) ? n : null
})

const elevatorSelectedLocationKey = ref("")
watch(
	selectedLocationNumericId,
	(id) => {
		elevatorSelectedLocationKey.value = id != null ? String(id) : ""
	},
	{ immediate: true }
)

const selectedLocationDisplayName = computed(() => {
	if (!selectedLocation.value) return null
	const zone = getLocationZone(selectedLocation.value)
	const name = selectedLocation.value.name
	return zone ? `${zone} / ${name}` : name
})

const ladderDeviceId = computed(() => selectedLocation.value?.ladderDevice?.deviceId ?? null)

const callDeviceId = computed(() => selectedLocation.value?.callDevice?.deviceId ?? null)

const floorDetectionDeviceId = computed(
	() => selectedLocation.value?.floorDetection?.deviceId ?? null
)

const hasFloorDetection = computed(() => floorDetectionDeviceId.value != null)

const selectedLiveState = computed(() => selectedLocation.value?.live ?? null)

const { applyElevatorLive } = useElevatorLiveSync({
	locations,
	selectedLocation,
	selectedLocationId: selectedLocationNumericId,
})

const handleDetailRuntimeUpdated = (live: ElevatorLiveState) => {
	const id = selectedLocationNumericId.value
	if (id != null) applyElevatorLive(id, live)
}

const handleLogsRefresh = () => {
	const id = selectedLocationNumericId.value
	if (id != null) void loadLocationDetail(id)
}

const deviceConnectivity = useDeviceConnectivity({ debounceMs: 150 })
const { setupDeviceListeners, removeDeviceListeners } = useDeviceWebSocket()

const elevatorDeviceIds = computed(() => collectElevatorMonitoringDeviceIds(locations.value))

deviceConnectivity.bindDeviceIds(elevatorDeviceIds)

const isDeviceOnline = (deviceId: number | null | undefined) => {
	if (deviceId == null) return false
	return deviceConnectivity.getStatus(deviceId) === "online"
}

const isLadderDeviceConnected = computed(() => isDeviceOnline(ladderDeviceId.value))

const isCallDeviceConnected = computed(() => isDeviceOnline(callDeviceId.value))

const isFloorDetectionDeviceConnected = computed(() => isDeviceOnline(floorDetectionDeviceId.value))

const locationConnectionById = computed(() => {
	const map: Record<number, boolean> = {}
	for (const location of locationsForOverview.value) {
		const locationId = location.locationId
		if (locationId == null) continue
		map[locationId] = isElevatorPanelConnected({
			isLadderConnected: isDeviceOnline(location.ladderDevice?.deviceId ?? null),
			hasFloorDetection: location.floorDetection?.deviceId != null,
			isFloorDetectionConnected: isDeviceOnline(location.floorDetection?.deviceId ?? null),
			live: location.live,
		})
	}
	return map
})

const handleMonitoringDeviceStatus = (event: MonitoringDeviceStatusEvent) => {
	if (event.system !== "device") return
	const deviceId = event.deviceId || event.sourceId
	deviceConnectivity.applyWsStatus(deviceId, event.status)
}

const handleMonitoringDeviceStatusBatch = (event: MonitoringDeviceStatusBatchEvent) => {
	if (event.system !== "device") return
	event.updates.forEach(({ sourceId, deviceId }) => {
		deviceConnectivity.applyWsStatus(deviceId || sourceId, event.status)
	})
}

const isCurrentLocation = (location: ElevatorLocation) =>
	selectedLocation.value?.locationId === location.locationId

const handleLocationSelect = async (locationId: number) => {
	await loadLocationDetail(locationId)
}

const handleFloorManageSynced = async () => {
	const id = selectedLocationNumericId.value
	if (id == null) return
	await loadLocationDetail(id)
}

const simulationTimeRange = ref({ startDate: "", endDate: "", preset: "today" })
const simulationLogs = ref<ElevatorLog[]>([])

const simulationLocationOptions = computed(() => {
	const opts: Array<{ id: number; label: string }> = []
	for (const zone of elevatorZones.value) {
		for (const loc of zone.locations ?? []) {
			const id = loc.id != null ? Number(loc.id) : NaN
			if (!Number.isFinite(id)) continue
			opts.push({
				id,
				label: [zone.name, loc.name].filter(Boolean).join("-") || String(id),
			})
		}
	}
	return opts
})

const loadSimulationLogs = async () => {
	const { startDate, endDate, preset } = simulationTimeRange.value
	const timeQuery = buildLogsTimeQuery(preset, startDate, endDate)
	try {
		const res = await elevatorApi.getLogs({
			limit: ELEVATOR_FULL_REPORT_LIMIT,
			...timeQuery,
		})
		simulationLogs.value = (res as { logs?: ElevatorLog[] }).logs || []
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
	if (!canFullReport.value) return
	const range = await request<OperationalDayRangeResponse>(`/entry-exit/time-range?preset=today`)
	simulationTimeRange.value = toSimulationTimeRange(range, "today")
	showSimulationFrame.value = true
	await loadSimulationLogs()
}

const elevatorLocationApi = useElevatorLocationApi()
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<ElevatorLocation, ElevatorZone>()

const handleSaveZone = async (zone: ElevatorZone) => {
	await baseHandleSaveZone(
		zone,
		elevatorZones,
		async (z: ElevatorZone) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await elevatorLocationApi.updateZone(z.id, {
						name: z.name,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await elevatorLocationApi.createZone({
						name: z.name,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as ElevatorZone & {
				id: string
			}
			return { merged: result.merged, message: result.message, zone: zoneWithId }
		},
		{
			...ZONE_DIALOG_BATCH_SAVE_OPTIONS,
		}
	)
}

const handleZonesSaved = async () => {
	await loadZones()
	await loadLocations()
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, elevatorZones, elevatorLocationApi.deleteZone, {
		systemType: "elevator",
		selectedLocationRef: elevatorSelectedLocationKey,
		getLocationId: (loc) =>
			String(
				(loc as { id?: string; locationId?: number }).id ??
					(loc as { locationId?: number }).locationId ??
					""
			),
		onAfterDelete: async () => {
			await loadZones()
			await loadLocations()
			const nextId = Number(elevatorSelectedLocationKey.value)
			if (Number.isFinite(nextId) && nextId > 0) {
				await loadLocationDetail(nextId)
			} else {
				selectedLocation.value = null
				logs.value = []
			}
		},
	})
}

let cleanupWs: (() => void) | null = null

onMounted(async () => {
	await loadZones()
	await loadLocations({ zones: elevatorZones.value })
	const first = firstFlatSiteMatchingSortedZoneLocations(
		elevatorZones.value,
		locations.value.filter(
			(l): l is (typeof locations.value)[number] & { locationId: number } => l.locationId != null
		)
	)
	if (first?.locationId) {
		await loadLocationDetail(first.locationId)
	}
	cleanupWs = setupEventListeners(async () => {
		await loadLocations({ zones: elevatorZones.value })
		if (selectedLocationNumericId.value != null) {
			await loadLocationDetail(selectedLocationNumericId.value)
		}
	})

	setupDeviceListeners({
		onMonitoringStatus: handleMonitoringDeviceStatus,
		onMonitoringStatusBatch: handleMonitoringDeviceStatusBatch,
	})
})

onBeforeUnmount(() => {
	cleanupWs?.()
	removeDeviceListeners()
})
</script>
