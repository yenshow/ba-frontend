<template>
	<div class="relative">
		<div class="absolute right-4 top-4 z-20">
			<PollingHealthBadge
				:state="pollingState"
				:last-success-at="lastSuccessAt"
			/>
		</div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<AirCirculationZonePlanPanel
				:selected-zone-name="selectedZoneName"
				:is-initial-loading="isInitialLoading"
				:can-write="canWrite"
				:can-manage-zones="canAdmin"
				:is-edit-mode="isEditMode"
				:selected-zone="selectedZone"
				:selected-zone-data="selectedZoneData"
				:selected-category="selectedCategory"
				:all-zone-locations="allZoneLocations"
				:current-zone-locations="filteredZoneLocations"
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
				<AirCirculationMonitorCenter
					v-model:view-filter="selectedViewCategory"
					:zones="airCirculationZones"
					:status-items="statusItems"
					:selected-zone="selectedZone"
					:view-filter-options="viewFilterOptions"
					:manual-issue-targets="manualIssueTargets"
					:manual-issue-default-target-id="manualIssueDefaultTargetId"
					:rule-bit-options-by-target-id="ruleBitOptionsByTargetId"
					@zone-selected="handleZoneSelected"
					@manual-issue-changed="handleManualIssueChanged"
				/>
			</aside>
		</div>
	</div>

	<ZoneManagementDialog
		v-model="showZoneManagementDialog"
		:zones="airCirculationZones"
		system-type="air_circulation"
		:require-image-url="true"
		device-hint="請先在「設備管理」中建立控制器設備"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import { onMounted, watch, type Ref } from "vue"
import AirCirculationZonePlanPanel from "~/components/air-circulation/AirCirculationZonePlanPanel.vue"
import AirCirculationMonitorCenter from "~/components/air-circulation/AirCirculationMonitorCenter.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import PollingHealthBadge from "~/components/common/PollingHealthBadge.vue"
import {
	type AirCirculationZone,
	type AirCirculationLocation,
	type AirCirculationStatusItem,
	buildAirCirculationMonitorViewFilterOptions,
	airCirculationLocationInViewCategory,
	DEFAULT_AIR_CIRCULATION_MONITOR_VIEW_CATEGORY,
} from "~/types/air-circulation"
import { normalizeSystemUiStatus, type SystemUiStatus } from "~/utils/monitoringStatus"
import { useAirCirculationApi } from "~/composables/systems/air-circulation/useAirCirculationApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import { useSnapshotSystemPageRbac } from "~/composables/core/useAccessGate"
import { findLocationIndexInZone, getLocationUiKey } from "~/utils/locationUiId"
import { isValidPercentPosition } from "~/utils/mapPosition"
import { useAirCirculationModbusIntegration } from "~/composables/monitoring/modbus/snapshotModbusIntegrations"
import type { ManualIssueChangedPayload } from "~/utils/alertUtils"
import { useManualIssueDiDoRules } from "~/composables/systems/alerts/useManualIssueDiDoRules"
import { useVisibilityAutoRefresh } from "~/composables/monitoring/useVisibilityAutoRefresh"

definePageMeta({ layout: "default" })

import { PERM } from "~/config/permissionCodes"
const { canAdmin, canWrite } = useSnapshotSystemPageRbac(PERM.airCirculation.module)
const airApi = useAirCirculationApi()
const { handleError } = useErrorHandler()

const leftSectionHeight = ref<number | null>(null)

const airCirculationZones = ref<AirCirculationZone[]>([])

const { ruleBitOptionsByTargetId } = useManualIssueDiDoRules({
	alertRulesSource: "air_circulation",
	zones: airCirculationZones,
	canAdmin,
})

const isLoadingZones = ref(false)
const isInitialLoading = ref(true)

const selectedZone = ref<string>("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const showZoneManagementDialog = ref(false)

const statusItems = ref<AirCirculationStatusItem[]>([])

const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone, sortZones } =
	useZoneManagement<AirCirculationLocation, AirCirculationZone>()

const selectedViewCategory = ref<string>(DEFAULT_AIR_CIRCULATION_MONITOR_VIEW_CATEGORY)

const viewFilterOptions = computed(() =>
	buildAirCirculationMonitorViewFilterOptions(airCirculationZones.value)
)

watch(
	viewFilterOptions,
	(opts) => {
		const ids = new Set(opts.map((o) => o.value))
		if (ids.has(selectedViewCategory.value)) return
		if (ids.has(DEFAULT_AIR_CIRCULATION_MONITOR_VIEW_CATEGORY)) {
			selectedViewCategory.value = DEFAULT_AIR_CIRCULATION_MONITOR_VIEW_CATEGORY
		} else if (opts.length > 0) {
			selectedViewCategory.value = opts[0].value
		}
	},
	{ immediate: true }
)

const zonesById = computed(() => new Map(airCirculationZones.value.map((z) => [z.id || z.name, z])))
const selectedZoneName = computed(() => zonesById.value.get(selectedZone.value)?.name || "")
const selectedZoneData = computed(() => zonesById.value.get(selectedZone.value))
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const manualIssueTargets = computed(() => {
	if (!canAdmin.value) return []
	const out: Array<{ id: string; label: string }> = []
	for (const zone of airCirculationZones.value) {
		for (const loc of zone.locations || []) {
			if (!loc.systemId) continue
			out.push({
				id: String(loc.systemId),
				label: `${zone.name} / ${loc.name}（#${String(loc.systemId)}）`,
			})
		}
	}
	return out
})

const manualIssueDefaultTargetId = computed(() => {
	const first = manualIssueTargets.value[0]
	return first?.id || ""
})

const allZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	return selectedZoneData.value?.locations || []
})

const filteredZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	return (zone?.locations || []).filter(
		(loc) =>
			isValidPercentPosition(loc.location) &&
			airCirculationLocationInViewCategory(loc, selectedViewCategory.value)
	)
})

const statusBySystemId = computed(() => {
	const m = new Map<string, AirCirculationStatusItem>()
	for (const it of statusItems.value) {
		m.set(String(it.systemId), it)
	}
	return m
})

const uiStatusForLocation = (loc: AirCirculationLocation): SystemUiStatus => {
	if (!loc.systemId) return "warning"
	const raw = statusBySystemId.value.get(String(loc.systemId))?.uiStatus
	return normalizeSystemUiStatus(raw ?? "warning")
}

const getLocationAlertFlash = (locationId: string): "none" | "slow" | "fast" => {
	const found = findLocationInCurrentZoneByUiKey(locationId)
	const s = found?.location ? uiStatusForLocation(found.location) : "warning"
	if (s === "normal") return "none"
	if (s === "alarm") return "fast"
	return "slow"
}

const dotStatusForLocationId = (locationId: string) => {
	const found = findLocationInCurrentZoneByUiKey(locationId)
	if (!found?.location) return "warning"
	return uiStatusForLocation(found.location)
}

const tooltipTitleByLocationId = (locationId: string) => {
	const found = findLocationInCurrentZoneByUiKey(locationId)
	const name = found?.location?.name || ""
	const s = found?.location ? uiStatusForLocation(found.location) : "warning"
	const label = s === "normal" ? "正常" : s === "alarm" ? "警報" : "異常"
	return `${name}（${label}）`
}

const findLocationOriginalIndex = (zone: AirCirculationZone, target: AirCirculationLocation) => {
	return findLocationIndexInZone(zone, target)
}

const findLocationInCurrentZoneByUiKey = (locationId: string) => {
	const zone = selectedZoneData.value
	if (!zone) return null
	const idx = zone.locations.findIndex(
		(loc, i) => getLocationUiKey({ zone, location: loc, locationIndex: i }) === locationId
	)
	if (idx === -1) return null
	return { zone, location: zone.locations[idx]!, locationIndex: idx }
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const handleSelectCategory = (locationId: string) => {
	selectedCategory.value = locationId
}

const getLocationIdForDisplay = (location: AirCirculationLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const idx = findLocationOriginalIndex(zone, location)
	return idx !== -1 ? getLocationUiKey({ zone, location, locationIndex: idx }) : ""
}

const selectLocationByLocation = (location: AirCirculationLocation) => {
	const zone = selectedZoneData.value
	if (!zone) return
	const idx = findLocationOriginalIndex(zone, location)
	if (idx !== -1) {
		selectedCategory.value = getLocationUiKey({ zone, location, locationIndex: idx })
	}
}

const findLocationById = (
	locationId: string
): { zone: AirCirculationZone; locationIndex: number } | null => {
	for (const zone of airCirculationZones.value) {
		const idx = zone.locations.findIndex(
			(loc, i) => getLocationUiKey({ zone, location: loc, locationIndex: i }) === locationId
		)
		if (idx !== -1) return { zone, locationIndex: idx }
	}
	return null
}

const handleSaveLocationPositionFromPanel = async (payload: { locationId: string; x: number; y: number }) => {
	if (!isEditMode.value) return
	const found = findLocationById(payload.locationId)
	if (!found) return
	const { zone: targetZone, locationIndex: targetLocationIndex } = found
	if (!targetZone.id) return
	const updatedLocations = targetZone.locations.map((location, index) =>
		index === targetLocationIndex ? { ...location, location: { x: payload.x, y: payload.y } } : location
	)
	try {
		const result = await airApi.updateZone(targetZone.id, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			sortOrder: targetZone.sortOrder,
			locations: updatedLocations,
		})
		const zi = airCirculationZones.value.findIndex((z) => z.id === targetZone.id)
		if (zi > -1) airCirculationZones.value[zi] = result.zone
	} catch (error) {
		handleError(error, "更新位置失敗")
	}
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await airApi.getZones()
		airCirculationZones.value = result.zones || []
		if (!selectedZone.value && airCirculationZones.value.length > 0) {
			const first = sortZones(airCirculationZones.value)[0]!
			selectedZone.value = first.id || first.name
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

const {
	pollingState,
	lastSuccessAt,
	lastFailureAt,
	statusItems: computedStatusItems,
	preloadDeviceInfos,
	loadStatusSnapshot,
	patchOptimistic,
	startAutoRefresh,
	stopAutoRefresh,
	handleVisibilityChange,
} = useAirCirculationModbusIntegration(airCirculationZones, selectedZone)

const autoRefresh = useVisibilityAutoRefresh({
	start: startAutoRefresh,
	stop: stopAutoRefresh,
	onVisible: handleVisibilityChange,
})

const handleManualIssueChanged = (payload?: ManualIssueChangedPayload) => {
	if (payload?.action === "clear") {
		void loadStatusSnapshot({ force: true })
		return
	}
	if (payload?.systemId) {
		patchOptimistic(payload.systemId, "alarm")
	}
	void loadStatusSnapshot({ force: true })
}

watch(
	computedStatusItems,
	(next) => {
		statusItems.value = next
	},
	{ immediate: true }
)

const handleSaveZone = async (zone: AirCirculationZone) => {
	await baseHandleSaveZone(
		zone as AirCirculationZone & { id: string },
		airCirculationZones as Ref<(AirCirculationZone & { id: string })[]>,
		async (z: AirCirculationZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await airApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await airApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as AirCirculationZone & { id: string }
			return { merged: result.merged, message: result.message, zone: zoneWithId }
		},
		{ selectedZoneRef: selectedZone }
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(
		zoneId,
		airCirculationZones as Ref<(AirCirculationZone & { id: string })[]>,
		airApi.deleteZone,
		{
			selectedZoneRef: selectedZone,
			systemType: "air_circulation",
			onAfterDelete: async () => {
				await loadZonesFromAPI()
			},
		}
	)
}

const handleOpenZoneDialog = async () => {
	if (!canAdmin.value) return
	if (airCirculationZones.value.length === 0) await loadZonesFromAPI()
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && airCirculationZones.value.length === 0) void loadZonesFromAPI()
	isEditMode.value = !isEditMode.value
}

const syncSelectedCategoryToVisibleOnMap = () => {
	const visible = filteredZoneLocations.value
	if (visible.length === 0) {
		selectedCategory.value = ""
		return
	}
	const exists = visible.some((loc) => getLocationIdForDisplay(loc) === selectedCategory.value)
	if (!exists) selectedCategory.value = getLocationIdForDisplay(visible[0]!)
}

watch(
	[airCirculationZones, selectedZone, selectedViewCategory],
	() => syncSelectedCategoryToVisibleOnMap(),
	{ deep: true, immediate: true }
)

onMounted(async () => {
	try {
		await loadZonesFromAPI()
		await preloadDeviceInfos()
		await loadStatusSnapshot()
	} finally {
		isInitialLoading.value = false
	}
	autoRefresh.start()
})

</script>

