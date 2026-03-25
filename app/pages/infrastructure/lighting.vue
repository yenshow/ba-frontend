<template>
	<div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<LightingZonePlanPanel
				:selected-zone-name="selectedZoneName"
				:is-initial-loading="isInitialLoading"
				:is-operator="isOperator"
				:is-edit-mode="isEditMode"
				:selected-zone="selectedZone"
				:selected-zone-data="selectedZoneData"
				:selected-category="selectedCategory"
				:all-zone-locations="allZoneLocations"
				:current-zone-locations="currentZoneLocations"
				:zone-plan-image="zonePlanImage"
				:is-location-normal="isLocationNormal"
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
				<StatusCenter
					:zones="lightingZones"
					:area-statuses="locationStatuses"
					:area-disabled-map="locationDisabledMap"
					:area-toggling="locationToggling"
					:can-toggle="isOperator"
					:selected-zone="selectedZone"
					@toggle="handleLocationToggle"
					@zone-selected="handleZoneSelected"
				/>
			</aside>
		</div>
	</div>
	<ZoneManagementDialog
		v-model="showZoneManagementDialog"
		:zones="lightingZones"
		system-type="lighting"
		:require-image-url="true"
		device-hint="請先在「設備管理」中建立控制器設備"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from "vue"
import StatusCenter from "~/components/lighting/StatusCenter.vue"
import LightingZonePlanPanel from "~/components/lighting/LightingZonePlanPanel.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import type { LightingZone, LightingLocation } from "~/types/lighting"
import { useLightingApi } from "~/composables/systems/useLightingApi"
import { useLocationApi } from "~/composables/systems/location/useLocationApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useZoneManagement } from "~/composables/systems/useZoneManagement"
import { useAuth } from "~/composables/core/useAuth"
import { useLightingModbusIntegration } from "~/composables/systems/lighting/useLightingModbusIntegration"
import { useLightingZonePersistence } from "~/composables/systems/lighting/useLightingZonePersistence"
import type { UnifiedZone } from "~/types/location"
import { unifiedToLightingZone } from "~/utils/locationAdapter"
import { healthStatusToAlertFlash } from "~/utils/alertUtils"
import {
	findLightingLocationIndexInZone,
	getLightingLocationId,
	isValidLightingMapPosition,
} from "~/utils/lightingLocation"

definePageMeta({
	layout: "default",
})

const { isOperator } = useAuth()
const lightingApi = useLightingApi()
const locationApi = useLocationApi()
const { handleError } = useErrorHandler()

const leftSectionHeight = ref<number | null>(null)

const lightingZones = ref<LightingZone[]>([])
const isLoadingZones = ref(false)
const isInitialLoading = ref(true)

const selectedZone = ref<string>("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const showZoneManagementDialog = ref(false)

const zonesById = computed(() => {
	return new Map(lightingZones.value.map((zone) => [zone.id || zone.name, zone]))
})

const selectedZoneName = computed(() => {
	const zone = zonesById.value.get(selectedZone.value)
	return zone?.name || ""
})

const selectedZoneData = computed(() => {
	return zonesById.value.get(selectedZone.value)
})

const zonePlanImage = computed(() => {
	return selectedZoneData.value?.imageUrl
})

const currentZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	return (zone?.locations || []).filter((location) => isValidLightingMapPosition(location.location))
})

const allZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	return zone?.locations || []
})

const {
	locationStatuses,
	locationToggling,
	locationDisabledMap,
	initializeLocationStatuses,
	preloadDeviceInfos,
	loadAllLocationStatuses,
	handleLocationToggle,
	isLocationNormal,
	startAutoRefresh,
	stopAutoRefresh,
	handleVisibilityChange,
} = useLightingModbusIntegration(lightingZones, selectedZone)

const getLocationAlertFlash = (id: string): "none" | "slow" | "fast" => {
	return healthStatusToAlertFlash(locationStatuses.value[id]?.status, { whenAbsent: "none" })
}

const { saveLocationPosition } = useLightingZonePersistence(
	lightingZones,
	selectedCategory,
	locationStatuses,
	isEditMode
)

const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone, sortZones } =
	useZoneManagement<LightingZone>()

const handleZoneSelected = async (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const handleSelectCategory = (locationId: string) => {
	selectedCategory.value = locationId
}

const selectLocationByLocation = (location: LightingLocation) => {
	const zone = selectedZoneData.value
	if (zone && location) {
		const originalIndex = findLightingLocationIndexInZone(zone, location)
		if (originalIndex !== -1) {
			selectedCategory.value = getLightingLocationId(zone, location, originalIndex)
		}
	}
}

const handleSaveLocationPositionFromPanel = (payload: {
	locationId: string
	x: number
	y: number
}) => {
	void saveLocationPosition(payload.locationId, payload.x, payload.y)
}

const getLocationIdForDisplay = (location: LightingLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const originalIndex = findLightingLocationIndexInZone(zone, location)
	return originalIndex !== -1 ? getLightingLocationId(zone, location, originalIndex) : ""
}

watch(
	() => currentZoneLocations.value,
	(newLocations) => {
		if (!selectedZoneData.value) return

		const currentLocationExists = newLocations.some(
			(location) => getLocationIdForDisplay(location) === selectedCategory.value
		)

		if (!currentLocationExists) {
			if (newLocations.length > 0) {
				selectedCategory.value = getLocationIdForDisplay(newLocations[0])
			} else {
				selectedCategory.value = ""
			}
		}
	},
	{ immediate: true }
)

const handleOpenZoneDialog = async () => {
	if (lightingZones.value.length === 0) {
		await loadZonesFromAPI()
	}
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && lightingZones.value.length === 0) {
		loadZonesFromAPI()
	}
	isEditMode.value = !isEditMode.value
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await lightingApi.getZones()
		lightingZones.value = result.zones || []

		if (!selectedZone.value && lightingZones.value.length > 0) {
			const first = sortZones(lightingZones.value)[0]!
			selectedZone.value = first.id || first.name
		}

		await preloadDeviceInfos()
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

const handleSaveZone = async (zone: LightingZone) => {
	await baseHandleSaveZone(
		zone as LightingZone & { id: string },
		lightingZones as Ref<(LightingZone & { id: string })[]>,
		async (z: LightingZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await lightingApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						locations: z.locations,
					})
				: await lightingApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as LightingZone & {
				id: string
			}
			return {
				merged: result.merged,
				message: result.message,
				zone: zoneWithId,
			}
		},
		{
			selectedZoneRef: selectedZone,
			onAfterSave: () => {
				initializeLocationStatuses()
			},
		}
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(
		zoneId,
		lightingZones as Ref<(LightingZone & { id: string })[]>,
		lightingApi.deleteZone,
		{
			selectedZoneRef: selectedZone,
			systemType: "lighting",
			getFullZoneApiCall: (id: string) => locationApi.getZone(id),
			updateZoneApiCall: async (id: string, data: { locations: UnifiedZone["locations"] }) => {
				const response = await locationApi.updateZone(id, { locations: data.locations })
				const lightingZone = unifiedToLightingZone(response.zone)
				return {
					merged: response.merged,
					message: response.message,
					zone: { ...lightingZone, id: lightingZone.id || id } as LightingZone & { id: string },
				}
			},
			onAfterDelete: async () => {
				await loadZonesFromAPI()
			},
		}
	)
}

onMounted(async () => {
	try {
		await loadZonesFromAPI()
		initializeLocationStatuses()
		await loadAllLocationStatuses({ loadAllZones: true })
	} finally {
		isInitialLoading.value = false
	}

	startAutoRefresh()
	document.addEventListener("visibilitychange", handleVisibilityChange)
})

onBeforeUnmount(() => {
	stopAutoRefresh()
	document.removeEventListener("visibilitychange", handleVisibilityChange)
})
</script>
