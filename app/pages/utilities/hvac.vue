<template>
	<div class="relative">
		<div class="absolute right-4 top-4 z-20">
			<SnapshotSyncHealthBadge
				:state="syncHealthState"
				:last-success-at="lastSuccessAt"
			/>
		</div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<HvacZonePlanPanel
				:selected-zone-name="selectedZoneName"
				:is-initial-loading="isInitialLoading"
				:can-write="canUpdateLocation"
				:can-manage-zones="canManageLocation"
				:is-edit-mode="isEditMode"
				:selected-zone="selectedZone"
				:selected-zone-data="selectedZoneData"
				:selected-category="selectedCategory"
				:all-zone-locations="allZoneLocations"
				:current-zone-locations="currentZoneLocations"
				:zone-plan-image="zonePlanImage"
				:dot-status-for-location-id="dotStatusForLocationId"
				:tooltip-title-by-location-id="tooltipTitleByLocationId"
				:get-location-alert-flash="getLocationAlertFlash"
				@open-zone-management="handleOpenZoneDialog"
				@toggle-edit-mode="handleToggleEditMode"
				@select-category="handleSelectCategory"
				@save-location-position="handleSaveLocationPositionFromPanel"
				@select-location-by-location="selectLocationByLocation"
				@section-height="leftSectionHeight = $event"
			/>

			<aside
				class="show-scrollbar flex-[0.8] overflow-y-auto 2xl:flex-[0.7]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<HvacStatusCenter
					:zones="hvacZones"
					:area-statuses="locationStatuses"
					:area-disabled-map="locationDisabledMap"
					:area-toggling="locationToggling"
					:can-toggle="canControlDevice"
					:selected-zone="selectedZone"
					@toggle="handleLocationToggle"
					@zone-selected="handleZoneSelected"
				/>
			</aside>
		</div>
	</div>

	<ZoneManagementDialog
		v-model="showZoneManagementDialog"
		:zones="hvacZones"
		system-type="hvac"
		:require-image-url="true"
		:can-create-zone="canCreateLocation"
		:can-update-zone="canUpdateLocation"
		:can-delete-zone="canDeleteLocation"
		device-hint="請先在「設備管理」中建立控制器設備"
		:on-save-zone="handleSaveZone"
		@saved="handleZonesSaved"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import { onMounted, watch } from "vue"
import HvacZonePlanPanel from "~/components/hvac/HvacZonePlanPanel.vue"
import HvacStatusCenter from "~/components/hvac/HvacStatusCenter.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import SnapshotSyncHealthBadge from "~/components/common/SnapshotSyncHealthBadge.vue"
import type { HvacZone, HvacLocation } from "~/types/hvac"
import { useVisibilitySnapshotSync } from "~/composables/monitoring/useVisibilitySnapshotSync"
import { useHvacApi } from "~/composables/systems/hvac/useHvacApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"
import {
	useZoneManagement,
	ZONE_DIALOG_BATCH_SAVE_OPTIONS,
} from "~/composables/location/management/useZoneManagement"
import { useLocationModuleRbac } from "~/composables/core/useAccessGate"
import { findLocationIndexInZone, getLocationUiKey } from "~/utils/locationUiId"
import { isValidPercentPosition } from "~/utils/mapPosition"
import { useHvacModbusIntegration } from "~/composables/monitoring/modbus/toggleModbusIntegrations"

definePageMeta({ layout: "default" })

import { PERM } from "~/config/permissionCodes"
const {
	canControlDevice,
	canManageLocation,
	canCreateLocation,
	canUpdateLocation,
	canDeleteLocation,
} = useLocationModuleRbac(PERM.hvac)
const hvacApi = useHvacApi()
const { handleError } = useErrorHandler()
const toast = useToast()

const leftSectionHeight = ref<number | null>(null)

const hvacZones = ref<HvacZone[]>([])
const isLoadingZones = ref(false)
const isInitialLoading = ref(true)

const selectedZone = ref<string>("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const showZoneManagementDialog = ref(false)

const zonesById = computed(
	() => new Map(hvacZones.value.map((zone) => [zone.id || zone.name, zone]))
)
const selectedZoneName = computed(() => zonesById.value.get(selectedZone.value)?.name || "")
const selectedZoneData = computed(() => zonesById.value.get(selectedZone.value))
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const currentZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	return (zone?.locations || []).filter((loc) => isValidPercentPosition(loc.location))
})

const allZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	return selectedZoneData.value?.locations || []
})

const {
	syncHealthState,
	lastSuccessAt,
	locationStatuses,
	locationToggling,
	locationDisabledMap,
	initializeLocationStatuses,
	preloadDeviceInfos,
	loadAllLocationStatuses,
	handleLocationToggle,
	startSnapshotSync,
	stopSnapshotSync,
	handleVisibilityChange,
} = useHvacModbusIntegration(hvacZones, selectedZone)

const snapshotSync = useVisibilitySnapshotSync({
	start: startSnapshotSync,
	stop: stopSnapshotSync,
	onVisible: handleVisibilityChange,
})

const getLocationAlertFlash = (locationId: string): "none" | "slow" | "fast" => {
	const ui = locationStatuses.value[locationId]?.uiStatus
	if (ui === "normal") return "none"
	// HVAC 對外僅有 normal / warning（alarm 視為 warning）
	return "slow"
}

const dotStatusForLocationId = (locationId: string) => {
	const s = locationStatuses.value[locationId]
	if (!s) return "warning" as const
	return s.uiStatus
}

const tooltipTitleByLocationId = (locationId: string) => {
	const s = locationStatuses.value[locationId]
	// HVAC 對外僅有 normal / warning（alarm 視為 warning）
	const label = s?.uiStatus === "normal" ? "正常" : "異常"
	const temp =
		s?.temperatureC != null && Number.isFinite(s.temperatureC)
			? ` ${Math.round(s.temperatureC)}°C`
			: ""
	const found = findLocationInCurrentZoneByUiKey(locationId)
	const name = found?.location?.name || ""
	return `${name}（${label}）${temp}`
}

const findLocationInCurrentZoneByUiKey = (locationId: string) => {
	const zone = selectedZoneData.value
	if (!zone) return null
	const idx = zone.locations.findIndex(
		(loc, i) =>
			getLocationUiKey({ zone: zone as any, location: loc as any, locationIndex: i }) === locationId
	)
	if (idx === -1) return null
	return { zone, location: zone.locations[idx]!, locationIndex: idx }
}

const {
	handleSaveZone: baseHandleSaveZone,
	handleDeleteZone: baseHandleDeleteZone,
	sortZones,
} = useZoneManagement<HvacLocation, HvacZone>()

const handleZoneSelected = async (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const handleSelectCategory = (locationId: string) => {
	selectedCategory.value = locationId
}

const selectLocationByLocation = (location: HvacLocation) => {
	const zone = selectedZoneData.value
	if (!zone) return
	const originalIndex = findLocationIndexInZone(zone as any, location as any)
	if (originalIndex === -1) return
	selectedCategory.value = getLocationUiKey({
		zone: zone as any,
		location: location as any,
		locationIndex: originalIndex,
	})
}

const handleSaveLocationPositionFromPanel = (payload: {
	locationId: string
	x: number
	y: number
}) => {
	// HVAC 地點座標持久化走 ZoneManagementDialog 的 updateZone 流程，不在此直接觸發 zone 更新
	void saveLocationPosition(payload.locationId, payload.x, payload.y)
}

const saveLocationPosition = async (locationId: string, x: number, y: number) => {
	if (!isEditMode.value) return
	const zone = selectedZoneData.value
	if (!zone?.id) return
	const idx = zone.locations.findIndex(
		(loc, i) =>
			getLocationUiKey({ zone: zone as any, location: loc as any, locationIndex: i }) === locationId
	)
	if (idx === -1) return
	const updatedLocations = zone.locations.map((loc, i) =>
		i === idx ? { ...loc, location: { x, y } } : loc
	)
	try {
		const result = await hvacApi.updateZone(zone.id, {
			name: zone.name,
			imageUrl: zone.imageUrl,
			sortOrder: zone.sortOrder,
			locations: updatedLocations,
		} as any)
		const zi = hvacZones.value.findIndex((z) => z.id === zone.id)
		if (zi > -1) hvacZones.value[zi] = result.zone
		toast.success(TOAST.POINT_UPDATED)
	} catch (error) {
		handleError(error, "更新位置失敗")
	}
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await hvacApi.getZones()
		hvacZones.value = result.zones || []

		if (!selectedZone.value && hvacZones.value.length > 0) {
			const first = sortZones(hvacZones.value as any)[0]!
			selectedZone.value = first.id || first.name
		}

		await preloadDeviceInfos()
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

const handleSaveZone = async (zone: HvacZone) => {
	await baseHandleSaveZone(
		zone as HvacZone & { id: string },
		hvacZones as Ref<(HvacZone & { id: string })[]>,
		async (z: HvacZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await hvacApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					} as any)
				: await hvacApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					} as any)
			const zoneWithId = { ...result.zone, id: (result.zone as any).id || z.id } as HvacZone & {
				id: string
			}
			return { merged: result.merged, message: result.message, zone: zoneWithId }
		},
		{
			selectedZoneRef: selectedZone,
			...ZONE_DIALOG_BATCH_SAVE_OPTIONS,
		}
	)
}

const handleZonesSaved = async () => {
	await loadZonesFromAPI()
	await preloadDeviceInfos()
	await loadAllLocationStatuses()
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, hvacZones as any, hvacApi.deleteZone, {
		selectedZoneRef: selectedZone,
		systemType: "hvac" as any,
		onAfterDelete: async () => {
			await loadZonesFromAPI()
		},
	})
}

const handleOpenZoneDialog = async () => {
	if (!canManageLocation.value) return
	if (hvacZones.value.length === 0) await loadZonesFromAPI()
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && hvacZones.value.length === 0) void loadZonesFromAPI()
	isEditMode.value = !isEditMode.value
}

watch(
	() => currentZoneLocations.value,
	(newLocations) => {
		const zone = selectedZoneData.value
		if (!zone) return
		const currentLocationExists = newLocations.some(
			(loc, i) =>
				getLocationUiKey({ zone: zone as any, location: loc as any, locationIndex: i }) ===
				selectedCategory.value
		)
		if (currentLocationExists) return
		if (newLocations.length > 0) {
			const first = newLocations[0]!
			const idx = findLocationIndexInZone(zone as any, first as any)
			selectedCategory.value =
				idx !== -1
					? getLocationUiKey({ zone: zone as any, location: first as any, locationIndex: idx })
					: ""
		} else {
			selectedCategory.value = ""
		}
	},
	{ immediate: true }
)

onMounted(async () => {
	try {
		await loadZonesFromAPI()
		initializeLocationStatuses()
		await loadAllLocationStatuses()
	} finally {
		isInitialLoading.value = false
	}

	snapshotSync.start()
})

</script>
