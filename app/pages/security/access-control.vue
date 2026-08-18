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
					class="relative flex min-h-[664px] flex-col monitoring-panel overflow-hidden rounded-2xl p-4 2xl:min-h-[848px] 2xl:p-6"
				>
					<div class="monitoring-location-title">
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedZone" class="ps-[12px] text-[24px] 2xl:text-[36px]">{{
								selectedZone.name
							}}</span>
						</div>
						<div class="monitoring-location-title__divider"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selectedZone" class="pe-[12px] text-[24px] 2xl:text-[36px]">{{
								focusedLocation?.displayName || "全部戶別"
							}}</span>
						</div>
					</div>

					<PermissionActionButton
						:allowed="canManageLocation"
						aria-label="地點管理"
						class="absolute left-8 top-2 btn-monitoring-overlay"
						@click="handleOpenZoneDialog"
					>
						地點管理
					</PermissionActionButton>

					<MonitoringDetailShell
						:empty="detailEmpty"
						:enlarged="isOverviewCollapsed"
						empty-title="尚無戶別資料"
						empty-description="請在「地點管理」中新增戶別並綁定室內機"
						content-class="flex min-h-0 flex-1 flex-col"
					>
						<div v-if="selectedZone" class="flex min-h-0 flex-1">
							<AccessSecurityDetailPanel
								:locations="zoneLocations"
								:grouped-floors="groupedFloors"
								:main-stations="zoneMainStations"
								:events="events"
								:focused-location-id="focusedLocationId"
								:ringing-location-id="ringingLocationId"
								:can-ring="canRing"
								@focus="handleSelectUnit"
								@ring="handleRing"
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
								<template v-if="sitesZones.length > 0">
									<AccessSecurityLocationOverviewCard
										v-for="zone in sitesZones"
										:key="zone.id"
										:zone="zone"
										:focused-location-id="selectedZoneId === zone.id ? focusedLocationId : null"
										:class="{
											'ring-2 ring-cyan-400': selectedZoneId === zone.id,
										}"
										@select="handleSelectZone"
										@select-unit="handleSelectUnitFromOverview(zone.id, $event)"
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

		<ZoneManagementDialog
			v-model="showZoneDialog"
			system-type="access_security"
			:zones="zones"
			:require-image-url="false"
			:can-create-zone="canCreateLocation"
			:can-update-zone="canUpdateLocation"
			:can-delete-zone="canDeleteLocation"
			device-hint="請先在「設備管理」建立視訊對講室內機與管理中心主機"
			:on-save-zone="handleSaveZone"
			@saved="handleZonesSaved"
			@delete="handleDeleteZone"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import MonitoringDetailShell from "~/components/common/MonitoringDetailShell.vue"
import AccessSecurityLocationOverviewCard from "~/components/access-security/AccessSecurityLocationOverviewCard.vue"
import AccessSecurityDetailPanel from "~/components/access-security/AccessSecurityDetailPanel.vue"
import { useAccessSecurityApi } from "~/composables/systems/access-security/useAccessSecurityApi"
import { useAccessSecurityLocationApi } from "~/composables/location/api/useAccessSecurityLocationApi"
import { useAccessSecurityZoneView } from "~/composables/systems/access-security/useAccessSecurityZoneView"
import { normalizeAccessSecuritySiteZones } from "~/utils/accessSecurityFloor"
import {
	ACCESS_SECURITY_MONITOR_EVENT_SOURCES,
	filterAccessSecurityMonitorEvents,
} from "~/utils/accessSecurityIntercomEvents"
import { useLocationModuleRbac } from "~/composables/core/useAccessGate"
import { useAuth } from "~/composables/core/useAuth"
import { PERM } from "~/config/permissionCodes"
import {
	useOperationalEvents,
	type OperationalEvent,
} from "~/composables/systems/useOperationalEvents"
import {
	useZoneManagement,
	ZONE_DIALOG_BATCH_SAVE_OPTIONS,
} from "~/composables/location/management/useZoneManagement"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import type {
	AccessSecurityLocation,
	AccessSecurityMainStation,
	AccessSecuritySiteZone,
	AccessSecurityZone,
} from "~/types/accessSecurity"

definePageMeta({
	layout: "default",
})

const toast = useToast()
const { handleError } = useErrorHandler()
const { getEvents } = useOperationalEvents()
const accessApi = useAccessSecurityApi()
const locationApi = useAccessSecurityLocationApi()
const {
	canManageLocation,
	canCreateLocation,
	canUpdateLocation,
	canDeleteLocation,
} = useLocationModuleRbac(PERM.accessSecurity)
const { useHasPermission } = useAuth()
const canRing = useHasPermission(PERM.accessSecurity.ring)
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<AccessSecurityLocation, AccessSecurityZone>()

const isOverviewCollapsed = ref(false)
const showZoneDialog = ref(false)
const zones = ref<AccessSecurityZone[]>([])
const sitesZones = ref<AccessSecuritySiteZone[]>([])
const mainStations = ref<AccessSecurityMainStation[]>([])
const selectedZoneId = ref<number | null>(null)
const focusedLocationId = ref<number | null>(null)
const ringingLocationId = ref<number | null>(null)
const events = ref<OperationalEvent[]>([])

const { selectedZone, zoneLocations, groupedFloors, findLocation } = useAccessSecurityZoneView({
	zones: sitesZones,
	selectedZoneId,
})

const focusedLocation = computed(() => findLocation(focusedLocationId.value))
const detailEmpty = computed(() => !selectedZone.value)
const zoneMainStations = computed(() => {
	const boundId = selectedZone.value?.manageDeviceId
	if (boundId != null && boundId > 0) {
		return mainStations.value.filter((st) => st.deviceId === boundId)
	}
	if (mainStations.value.length === 1) return mainStations.value
	return []
})

const loadSites = async () => {
	const [sites, stations] = await Promise.all([
		accessApi.getSites(),
		accessApi.getMainStations(),
	])
	sitesZones.value = normalizeAccessSecuritySiteZones(sites.zones || [])
	mainStations.value = stations.stations || []
	const stillExists = sitesZones.value.some((z) => z.id === selectedZoneId.value)
	if (!stillExists) {
		selectedZoneId.value = sitesZones.value[0]?.id ?? null
		focusedLocationId.value = null
	} else if (
		focusedLocationId.value != null &&
		!zoneLocations.value.some((loc) => loc.id === focusedLocationId.value)
	) {
		focusedLocationId.value = null
	}
}

const loadZonesForDialog = async () => {
	const result = await locationApi.getZones()
	zones.value = result.zones || []
}

const loadEvents = async () => {
	if (selectedZoneId.value == null) {
		events.value = []
		return
	}
	const res = await getEvents({
		event_kind: "intercom",
		source: ACCESS_SECURITY_MONITOR_EVENT_SOURCES.join(","),
		limit: 80,
	})
	events.value = filterAccessSecurityMonitorEvents(
		res.events || [],
		zoneLocations.value
	)
}

const handleSelectZone = (zoneId: number) => {
	selectedZoneId.value = zoneId
	focusedLocationId.value = null
}

const handleSelectUnit = (locationId: number) => {
	focusedLocationId.value = locationId
}

const handleSelectUnitFromOverview = (zoneId: number, locationId: number) => {
	selectedZoneId.value = zoneId
	focusedLocationId.value = locationId
}

const handleOpenZoneDialog = async () => {
	if (!canManageLocation.value) return
	try {
		await loadZonesForDialog()
		showZoneDialog.value = true
	} catch (error) {
		handleError(error, "載入地點管理資料失敗")
	}
}

const handleRing = async (locationId: number) => {
	if (!canRing.value) return
	focusedLocationId.value = locationId
	ringingLocationId.value = locationId
	try {
		const res = await accessApi.ringLocation(locationId)
		if (res.invite?.played) {
			toast.success("已播放語音廣播")
		} else if (res.invite?.ok) {
			toast.success("已送出振鈴（室內機未接聽）")
		} else {
			toast.warning(`廣播結果：${res.invite?.result || "未知"}`)
		}
		await loadEvents()
	} catch (error) {
		handleError(error, "語音廣播失敗")
	} finally {
		ringingLocationId.value = null
	}
}

const handleSaveZone = async (zone: AccessSecurityZone) => {
	await baseHandleSaveZone(
		zone,
		zones as Ref<(AccessSecurityZone & { id: string })[]>,
		async (z: AccessSecurityZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await locationApi.updateZone(z.id, {
						name: z.name,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await locationApi.createZone({
						name: z.name,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as AccessSecurityZone & {
				id: string
			}
			return { merged: result.merged, message: result.message, zone: zoneWithId }
		},
		{ ...ZONE_DIALOG_BATCH_SAVE_OPTIONS }
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(
		zoneId,
		zones as Ref<(AccessSecurityZone & { id: string })[]>,
		locationApi.deleteZone,
		{
			systemType: "access_security",
			onAfterDelete: async () => {
				await handleZonesSaved()
			},
		}
	)
}

const handleZonesSaved = async () => {
	await Promise.all([loadZonesForDialog(), loadSites()])
}

watch(selectedZoneId, () => {
	void loadEvents()
})

let offWs: (() => void) | undefined

onMounted(async () => {
	try {
		await loadSites()
		await loadEvents()
	} catch (error) {
		handleError(error, "載入頁面資料失敗")
	}

	const { $socket } = useNuxtApp() as any
	const handler = (payload: { event_kind?: string }) => {
		if (payload?.event_kind === "intercom") void loadEvents()
	}
	$socket?.on?.("operational-event:new", handler)
	offWs = () => $socket?.off?.("operational-event:new", handler)
})

onUnmounted(() => {
	offWs?.()
})
</script>
