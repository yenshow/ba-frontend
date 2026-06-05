<template>
	<div class="relative">
		<div class="absolute right-4 top-4 z-20">
			<PollingHealthBadge
				:state="pollingState"
				:last-success-at="lastSuccessAt"
			/>
		</div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<PowerZonePlanPanel
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
				<PowerMonitorCenter
					v-model:view-filter="selectedViewCategory"
					:zones="powerZones"
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
		:zones="powerZones"
		system-type="power"
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
import PowerMonitorCenter from "~/components/power/PowerMonitorCenter.vue"
import PowerZonePlanPanel from "~/components/power/PowerZonePlanPanel.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import PollingHealthBadge from "~/components/common/PollingHealthBadge.vue"
import {
	type PowerZone,
	type PowerLocation,
	type PowerStatusItem,
	buildPowerMonitorViewFilterOptions,
	powerLocationInViewCategory,
	DEFAULT_POWER_MONITOR_VIEW_CATEGORY,
	derivePowerOverallUiStatus,
} from "~/types/power"
import { usePowerApi } from "~/composables/systems/power/usePowerApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import { useAdminOnly } from "~/composables/core/useAuth"
import { useLocationModuleRbac } from "~/composables/core/useAccessGate"
import { getLocationUiKey, findLocationIndexInZone } from "~/utils/locationUiId"
import { isValidPercentPosition } from "~/utils/mapPosition"
import { usePowerModbusIntegration } from "~/composables/monitoring/modbus/snapshotModbusIntegrations"
import type { ManualIssueChangedPayload } from "~/utils/alertUtils"
import { useManualIssueDiDoRules } from "~/composables/systems/alerts/useManualIssueDiDoRules"
import { useVisibilityAutoRefresh } from "~/composables/monitoring/useVisibilityAutoRefresh"

definePageMeta({
	layout: "default",
})

import { PERM } from "~/config/permissionCodes"
const canAdmin = useAdminOnly()
const { canManageLocation, canCreateLocation, canUpdateLocation, canDeleteLocation } =
	useLocationModuleRbac(PERM.power)
const powerApi = usePowerApi()
const { handleError } = useErrorHandler()

const leftSectionHeight = ref<number | null>(null)

const powerZones = ref<PowerZone[]>([])

const { ruleBitOptionsByTargetId } = useManualIssueDiDoRules({
	alertRulesSource: "power",
	zones: powerZones,
	canAdmin,
})
const isLoadingZones = ref(false)
const isInitialLoading = ref(true)
const selectedZone = ref("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const showZoneManagementDialog = ref(false)
const statusItems = ref<PowerStatusItem[]>([])

const selectedViewCategory = ref<string>(DEFAULT_POWER_MONITOR_VIEW_CATEGORY)

const {
	handleSaveZone: baseHandleSaveZone,
	handleDeleteZone: baseHandleDeleteZone,
	sortZones,
} = useZoneManagement<PowerLocation, PowerZone>()

const viewFilterOptions = computed(() => buildPowerMonitorViewFilterOptions(powerZones.value))

watch(
	viewFilterOptions,
	(opts) => {
		const ids = new Set(opts.map((o) => o.value))
		if (ids.has(selectedViewCategory.value)) return
		if (ids.has(DEFAULT_POWER_MONITOR_VIEW_CATEGORY)) {
			selectedViewCategory.value = DEFAULT_POWER_MONITOR_VIEW_CATEGORY
		} else if (opts.length > 0) {
			selectedViewCategory.value = opts[0].value
		}
	},
	{ immediate: true }
)

const zonesById = computed(() => {
	return new Map(powerZones.value.map((z) => [z.id || z.name, z]))
})

const selectedZoneName = computed(() => zonesById.value.get(selectedZone.value)?.name || "")
const selectedZoneData = computed(() => zonesById.value.get(selectedZone.value))
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const manualIssueTargets = computed(() => {
	if (!canAdmin.value) return []
	const out: Array<{ id: string; label: string }> = []
	for (const zone of powerZones.value) {
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
			powerLocationInViewCategory(loc, selectedViewCategory.value)
	)
})

const statusBySystemId = computed(() => {
	const m = new Map<string, PowerStatusItem>()
	for (const it of statusItems.value) {
		m.set(String(it.systemId), it)
	}
	return m
})

const uiStatusForLocation = (loc: PowerLocation): PowerStatusItem["uiStatus"] => {
	if (!loc.systemId) return "warning"
	return derivePowerOverallUiStatus(statusBySystemId.value.get(String(loc.systemId)) ?? null)
}

const getLocationAlertFlash = (loc: PowerLocation): "none" | "slow" | "fast" => {
	const s = uiStatusForLocation(loc)
	if (s === "normal") return "none"
	if (s === "alarm") return "fast"
	return "slow"
}

const tooltipTitle = (loc: PowerLocation) => {
	const s = uiStatusForLocation(loc)
	const label = s === "normal" ? "正常" : s === "warning" ? "異常" : "警報"
	return `${loc.name}（${label}）`
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const findLocationOriginalIndex = (zone: PowerZone, target: PowerLocation) => {
	return findLocationIndexInZone(zone, target)
}

const getLocationIdForDisplay = (location: PowerLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const idx = findLocationOriginalIndex(zone, location)
	return idx !== -1 ? getLocationUiKey({ zone, location, locationIndex: idx }) : ""
}

const selectLocationByLocation = (location: PowerLocation) => {
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
): { zone: PowerZone; locationIndex: number } | null => {
	for (const zone of powerZones.value) {
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
		const result = await powerApi.updateZone(targetZone.id!, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			locations: updatedLocations,
		})
		const zi = powerZones.value.findIndex((z) => z.id === targetZone.id)
		if (zi > -1) powerZones.value[zi] = result.zone
	} catch (error) {
		handleError(error, "更新位置失敗")
	}
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await powerApi.getZones()
		powerZones.value = result.zones || []
		if (!selectedZone.value && powerZones.value.length > 0) {
			const first = sortZones(powerZones.value)[0]!
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
} = usePowerModbusIntegration(powerZones, selectedZone)

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

const handleSaveZone = async (zone: PowerZone) => {
	await baseHandleSaveZone(
		zone as PowerZone & { id: string },
		powerZones as Ref<(PowerZone & { id: string })[]>,
		async (z: PowerZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await powerApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await powerApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as PowerZone & {
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
		powerZones as Ref<(PowerZone & { id: string })[]>,
		powerApi.deleteZone,
		{
			selectedZoneRef: selectedZone,
			systemType: "power",
			onAfterDelete: async () => {
				await loadZonesFromAPI()
			},
		}
	)
}

const handleOpenZoneDialog = async () => {
	if (!canManageLocation.value) return
	if (powerZones.value.length === 0) await loadZonesFromAPI()
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && powerZones.value.length === 0) {
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
	[powerZones, selectedZone, selectedViewCategory],
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
