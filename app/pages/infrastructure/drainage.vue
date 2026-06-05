<template>
	<div class="relative">
		<div class="absolute right-4 top-4 z-20">
			<PollingHealthBadge
				:state="pollingState"
				:last-success-at="lastSuccessAt"
			/>
		</div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<DrainageZonePlanPanel
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
				<DrainageMonitorCenter
					v-model:view-filter="selectedViewCategory"
					:zones="drainageZones"
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
		:zones="drainageZones"
		system-type="drainage"
		:require-image-url="true"
		:can-create-zone="canCreateLocation"
		:can-update-zone="canUpdateLocation"
		:can-delete-zone="canDeleteLocation"
		device-hint="請先在「設備管理」中建立控制器設備"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue"
import DrainageMonitorCenter from "~/components/drainage/DrainageMonitorCenter.vue"
import DrainageZonePlanPanel from "~/components/drainage/DrainageZonePlanPanel.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import PollingHealthBadge from "~/components/common/PollingHealthBadge.vue"
import {
	type DrainageZone,
	type DrainageLocation,
	type DrainageStatusItem,
	buildDrainageMonitorViewFilterOptions,
	drainageLocationInViewCategory,
	DEFAULT_DRAINAGE_MONITOR_VIEW_CATEGORY,
	deriveDrainagePumpUiStatus,
	deriveDrainageTankOverallUiStatus,
} from "~/types/drainage"
import { useDrainageApi } from "~/composables/systems/drainage/useDrainageApi"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import { useAdminOnly } from "~/composables/core/useAuth"
import { useLocationModuleRbac } from "~/composables/core/useAccessGate"
import { getLocationUiKey, findLocationIndexInZone } from "~/utils/locationUiId"
import { isValidPercentPosition } from "~/utils/mapPosition"
import { useDrainageModbusIntegration } from "~/composables/monitoring/modbus/snapshotModbusIntegrations"
import type { ManualIssueChangedPayload } from "~/utils/alertUtils"
import { useManualIssueDiDoRules } from "~/composables/systems/alerts/useManualIssueDiDoRules"
import { useVisibilityAutoRefresh } from "~/composables/monitoring/useVisibilityAutoRefresh"

definePageMeta({
	layout: "default",
})

import { PERM } from "~/config/permissionCodes"
const canAdmin = useAdminOnly()
const { canManageLocation, canCreateLocation, canUpdateLocation, canDeleteLocation } =
	useLocationModuleRbac(PERM.drainage)
const drainageApi = useDrainageApi()
const locationApi = useLocationApi()
const { handleError } = useErrorHandler()

const leftSectionHeight = ref<number | null>(null)

const drainageZones = ref<DrainageZone[]>([])

const { ruleBitOptionsByTargetId } = useManualIssueDiDoRules({
	alertRulesSource: "drainage",
	zones: drainageZones,
	canAdmin,
})

const isLoadingZones = ref(false)
const isInitialLoading = ref(true)
const selectedZone = ref("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const showZoneManagementDialog = ref(false)
const statusItems = ref<DrainageStatusItem[]>([])

const selectedViewCategory = ref<string>(DEFAULT_DRAINAGE_MONITOR_VIEW_CATEGORY)

const {
	handleSaveZone: baseHandleSaveZone,
	handleDeleteZone: baseHandleDeleteZone,
	sortZones,
} = useZoneManagement<DrainageLocation, DrainageZone>()

const viewFilterOptions = computed(() => buildDrainageMonitorViewFilterOptions(drainageZones.value))

watch(
	viewFilterOptions,
	(opts) => {
		const ids = new Set(opts.map((o) => o.value))
		if (ids.has(selectedViewCategory.value)) return
		if (ids.has(DEFAULT_DRAINAGE_MONITOR_VIEW_CATEGORY)) {
			selectedViewCategory.value = DEFAULT_DRAINAGE_MONITOR_VIEW_CATEGORY
		} else if (opts.length > 0) {
			selectedViewCategory.value = opts[0].value
		}
	},
	{ immediate: true }
)

const zonesById = computed(() => {
	return new Map(drainageZones.value.map((z) => [z.id || z.name, z]))
})

const selectedZoneName = computed(() => zonesById.value.get(selectedZone.value)?.name || "")
const selectedZoneData = computed(() => zonesById.value.get(selectedZone.value))
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const manualIssueTargets = computed(() => {
	if (!canAdmin.value) return []
	const out: Array<{ id: string; label: string }> = []
	for (const zone of drainageZones.value) {
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
	return (zone?.locations || []).filter(
		(loc) =>
			isValidPercentPosition(loc.location) &&
			drainageLocationInViewCategory(loc, selectedViewCategory.value)
	)
})

const statusBySystemId = computed(() => {
	const m = new Map<string, DrainageStatusItem>()
	for (const it of statusItems.value) {
		m.set(String(it.systemId), it)
	}
	return m
})

const pumpUiStatusForLocation = (loc: DrainageLocation): DrainageStatusItem["uiStatus"] => {
	if (!loc.systemId) return "warning"
	return deriveDrainagePumpUiStatus(statusBySystemId.value.get(String(loc.systemId)) ?? null)
}

const tankUiStatusForLocation = (loc: DrainageLocation): DrainageStatusItem["uiStatus"] => {
	if (!loc.systemId) return "warning"
	return deriveDrainageTankOverallUiStatus(statusBySystemId.value.get(String(loc.systemId)) ?? null)
}

const uiStatusForLocation = (loc: DrainageLocation): DrainageStatusItem["uiStatus"] => {
	const kind = loc.equipmentKind || "pump"
	if (kind === "pump") return pumpUiStatusForLocation(loc)
	return tankUiStatusForLocation(loc)
}

const getLocationAlertFlash = (loc: DrainageLocation): "none" | "slow" | "fast" => {
	const s = uiStatusForLocation(loc)
	if (s === "normal") return "none"
	if (s === "alarm") return "fast"
	return "slow"
}

const tooltipTitle = (loc: DrainageLocation) => {
	const s = uiStatusForLocation(loc)
	const label = s === "normal" ? "正常" : s === "warning" ? "異常" : s === "alarm" ? "警報" : "異常"
	return `${loc.name}（${label}）`
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const findLocationOriginalIndex = (zone: DrainageZone, target: DrainageLocation) => {
	return findLocationIndexInZone(zone, target)
}

const getLocationIdForDisplay = (location: DrainageLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const idx = findLocationOriginalIndex(zone, location)
	return idx !== -1 ? getLocationUiKey({ zone, location, locationIndex: idx }) : ""
}

const selectLocationByLocation = (location: DrainageLocation) => {
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
): { zone: DrainageZone; locationIndex: number } | null => {
	for (const zone of drainageZones.value) {
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
		const result = await drainageApi.updateZone(targetZone.id!, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			locations: updatedLocations,
		})
		const zi = drainageZones.value.findIndex((z) => z.id === targetZone.id)
		if (zi > -1) drainageZones.value[zi] = result.zone
	} catch (error) {
		handleError(error, "更新位置失敗")
	}
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await drainageApi.getZones()
		drainageZones.value = result.zones || []
		if (!selectedZone.value && drainageZones.value.length > 0) {
			const first = sortZones(drainageZones.value)[0]!
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
	patchOptimisticManualAlarm,
	startAutoRefresh,
	stopAutoRefresh,
	handleVisibilityChange,
} = useDrainageModbusIntegration(drainageZones, selectedZone)

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
		patchOptimisticManualAlarm(payload.systemId, payload.rule)
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

const handleSaveZone = async (zone: DrainageZone) => {
	await baseHandleSaveZone(
		zone as DrainageZone & { id: string },
		drainageZones as Ref<(DrainageZone & { id: string })[]>,
		async (z: DrainageZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await drainageApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await drainageApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as DrainageZone & {
				id: string
			}
			return { merged: result.merged, message: result.message, zone: zoneWithId }
		},
		{ selectedZoneRef: selectedZone }
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(
		zoneId,
		drainageZones as Ref<(DrainageZone & { id: string })[]>,
		drainageApi.deleteZone,
		{
			selectedZoneRef: selectedZone,
			systemType: "drainage",
			onAfterDelete: async () => {
				await loadZonesFromAPI()
			},
		}
	)
}

const handleOpenZoneDialog = async () => {
	if (!canManageLocation.value) return
	if (drainageZones.value.length === 0) await loadZonesFromAPI()
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && drainageZones.value.length === 0) {
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
	if (!exists) selectedCategory.value = getLocationIdForDisplay(visible[0])
}

watch(
	[drainageZones, selectedZone, selectedViewCategory],
	() => syncSelectedCategoryToVisibleOnMap(),
	{
		deep: true,
		immediate: true,
	}
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
