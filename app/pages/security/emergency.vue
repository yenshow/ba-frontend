<template>
	<div class="relative">
		<div class="absolute right-4 top-4 z-20">
			<PollingHealthBadge
				:state="pollingState"
				:last-success-at="lastSuccessAt"
			/>
		</div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<EmergencyRescueZonePlanPanel
				:selected-zone-name="selectedZoneName"
				:is-initial-loading="isInitialLoading"
				:can-write="canUpdateLocation"
				:can-manage-zones="canManageLocation"
				:is-edit-mode="isEditMode"
				:selected-zone="selectedZone"
				:selected-zone-data="selectedZoneData"
				:selected-category="selectedCategory"
				:filtered-zone-locations="filteredZoneLocations"
				:zone-plan-image="zonePlanImage"
				:dot-status-for-location="uiStatusForLocation"
				:get-location-alert-flash="getLocationAlertFlash"
				:tooltip-title="tooltipTitle"
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
				<EmergencyRescueMonitorCenter
					:zones="erZones"
					:status-items="statusItems"
					:selected-zone="selectedZone"
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
		:zones="erZones"
		system-type="emergency_rescue"
		:require-image-url="true"
		:can-create-zone="canCreateLocation"
		:can-update-zone="canUpdateLocation"
		:can-delete-zone="canDeleteLocation"
		device-hint="請先在「設備管理」中建立控制器設備"
		:on-save-zone="handleSaveZone"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue"
import EmergencyRescueMonitorCenter from "~/components/emergency-rescue/EmergencyRescueMonitorCenter.vue"
import EmergencyRescueZonePlanPanel from "~/components/emergency-rescue/EmergencyRescueZonePlanPanel.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import PollingHealthBadge from "~/components/common/PollingHealthBadge.vue"
import type {
	EmergencyRescueZone,
	EmergencyRescueLocation,
	EmergencyRescueStatusItem,
} from "~/types/emergency-rescue"
import { deriveEmergencyRescueUiStatus } from "~/types/emergency-rescue"
import { useEmergencyRescueApi } from "~/composables/systems/emergency-rescue/useEmergencyRescueApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"
import {
	useZoneManagement,
	ZONE_DIALOG_BATCH_SAVE_OPTIONS,
} from "~/composables/location/management/useZoneManagement"
import { useAdminOnly } from "~/composables/core/useAuth"
import { useLocationModuleRbac } from "~/composables/core/useAccessGate"
import { getLocationUiKey, findLocationIndexInZone } from "~/utils/locationUiId"
import { isValidPercentPosition } from "~/utils/mapPosition"
import { useEmergencyRescueModbusIntegration } from "~/composables/monitoring/modbus/snapshotModbusIntegrations"
import type { ManualIssueChangedPayload } from "~/utils/alertUtils"
import { useManualIssueDiDoRules } from "~/composables/systems/alerts/useManualIssueDiDoRules"
import { useVisibilityAutoRefresh } from "~/composables/monitoring/useVisibilityAutoRefresh"

definePageMeta({
	layout: "default",
})

import { PERM } from "~/config/permissionCodes"
const canAdmin = useAdminOnly()
const { canManageLocation, canCreateLocation, canUpdateLocation, canDeleteLocation } =
	useLocationModuleRbac(PERM.emergencyRescue)
const erApi = useEmergencyRescueApi()
const { handleError } = useErrorHandler()
const toast = useToast()

const leftSectionHeight = ref<number | null>(null)

const erZones = ref<EmergencyRescueZone[]>([])

const { ruleBitOptionsByTargetId } = useManualIssueDiDoRules({
	alertRulesSource: "emergency_rescue",
	zones: erZones,
	canAdmin,
})

const isLoadingZones = ref(false)
const isInitialLoading = ref(true)
const selectedZone = ref("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const showZoneManagementDialog = ref(false)
const statusItems = ref<EmergencyRescueStatusItem[]>([])

const {
	handleSaveZone: baseHandleSaveZone,
	handleDeleteZone: baseHandleDeleteZone,
	sortZones,
} = useZoneManagement<EmergencyRescueLocation, EmergencyRescueZone>()

const zonesById = computed(() => {
	return new Map(erZones.value.map((z) => [z.id || z.name, z]))
})

const selectedZoneName = computed(() => zonesById.value.get(selectedZone.value)?.name || "")
const selectedZoneData = computed(() => zonesById.value.get(selectedZone.value))
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const manualIssueTargets = computed(() => {
	if (!canAdmin.value) return []
	const out: Array<{ id: string; label: string }> = []
	for (const zone of erZones.value) {
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

const filteredZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	return (zone?.locations || []).filter((loc) => isValidPercentPosition(loc.location))
})

const statusBySystemId = computed(() => {
	const m = new Map<string, EmergencyRescueStatusItem>()
	for (const it of statusItems.value) {
		m.set(String(it.systemId), it)
	}
	return m
})

const uiStatusForLocation = (loc: EmergencyRescueLocation): EmergencyRescueStatusItem["uiStatus"] => {
	if (!loc.systemId) return "warning"
	return deriveEmergencyRescueUiStatus(statusBySystemId.value.get(String(loc.systemId)) ?? null)
}

const getLocationAlertFlash = (loc: EmergencyRescueLocation): "none" | "slow" | "fast" => {
	const s = uiStatusForLocation(loc)
	if (s === "normal") return "none"
	if (s === "alarm") return "fast"
	return "slow"
}

const tooltipTitle = (loc: EmergencyRescueLocation) => {
	const s = uiStatusForLocation(loc)
	const label =
		s === "normal"
			? "正常"
			: s === "warning"
				? "異常"
				: s === "alarm"
					? "警報"
					: "異常"
	return `${loc.name}（${label}）`
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const findLocationOriginalIndex = (zone: EmergencyRescueZone, target: EmergencyRescueLocation) => {
	return findLocationIndexInZone(zone, target)
}

const getLocationIdForDisplay = (location: EmergencyRescueLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const idx = findLocationOriginalIndex(zone, location)
	return idx !== -1 ? getLocationUiKey({ zone, location, locationIndex: idx }) : ""
}

const selectLocationByLocation = (location: EmergencyRescueLocation) => {
	const zone = selectedZoneData.value
	if (!zone) return
	const idx = findLocationOriginalIndex(zone, location)
	if (idx !== -1) {
		selectedCategory.value = getLocationUiKey({ zone, location, locationIndex: idx })
	}
}

const handleSelectCategory = (locationId: string) => {
	selectedCategory.value = locationId
}

const findLocationById = (
	locationId: string
): { zone: EmergencyRescueZone; locationIndex: number } | null => {
	for (const zone of erZones.value) {
		const idx = zone.locations.findIndex(
			(loc, i) => getLocationUiKey({ zone, location: loc, locationIndex: i }) === locationId
		)
		if (idx !== -1) return { zone, locationIndex: idx }
	}
	return null
}

const handleSaveLocationPositionFromPanel = async (payload: {
	locationId: string
	x: number
	y: number
}) => {
	if (!isEditMode.value) return
	const locationId = payload.locationId
	const found = findLocationById(locationId)
	if (!found) return
	const { zone: targetZone, locationIndex: targetLocationIndex } = found
	const updatedLocations = targetZone.locations.map((location, index) =>
		index === targetLocationIndex
			? { ...location, location: { x: payload.x, y: payload.y } }
			: location
	)
	try {
		const result = await erApi.updateZone(targetZone.id!, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			locations: updatedLocations,
		})
		const zi = erZones.value.findIndex((z) => z.id === targetZone.id)
		if (zi > -1) erZones.value[zi] = result.zone
		toast.success("已更新點位")
	} catch (error) {
		handleError(error, "更新位置失敗")
	}
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await erApi.getZones()
		erZones.value = result.zones || []
		if (!selectedZone.value && erZones.value.length > 0) {
			const first = sortZones(erZones.value)[0]!
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
} = useEmergencyRescueModbusIntegration(erZones, selectedZone)

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

const handleSaveZone = async (zone: EmergencyRescueZone) => {
	await baseHandleSaveZone(
		zone as EmergencyRescueZone & { id: string },
		erZones as Ref<(EmergencyRescueZone & { id: string })[]>,
		async (z: EmergencyRescueZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await erApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await erApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as EmergencyRescueZone & {
				id: string
			}
			return { merged: result.merged, message: result.message, zone: zoneWithId }
		},
		{ selectedZoneRef: selectedZone, ...ZONE_DIALOG_BATCH_SAVE_OPTIONS }
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(
		zoneId,
		erZones as Ref<(EmergencyRescueZone & { id: string })[]>,
		erApi.deleteZone,
		{
			selectedZoneRef: selectedZone,
			systemType: "emergency_rescue",
			onAfterDelete: async () => {
				await loadZonesFromAPI()
			},
		}
	)
}

const handleOpenZoneDialog = async () => {
	if (!canManageLocation.value) return
	if (erZones.value.length === 0) await loadZonesFromAPI()
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && erZones.value.length === 0) {
		void loadZonesFromAPI()
	}
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

watch([erZones, selectedZone], () => syncSelectedCategoryToVisibleOnMap(), {
	deep: true,
	immediate: true,
})

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
