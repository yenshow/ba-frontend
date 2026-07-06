<template>
	<div class="relative">
		<div class="absolute right-4 top-4 z-20">
			<SnapshotSyncHealthBadge
				:state="syncHealthState"
				:last-success-at="lastSuccessAt"
			/>
		</div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<SmokeAlarmZonePlanPanel
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
				<SmokeAlarmMonitorCenter
					:zones="smokeZones"
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
		:zones="smokeZones"
		system-type="smoke_alarm"
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
import { onMounted, watch, type Ref } from "vue"
import SmokeAlarmMonitorCenter from "~/components/smoke-alarm/SmokeAlarmMonitorCenter.vue"
import SmokeAlarmZonePlanPanel from "~/components/smoke-alarm/SmokeAlarmZonePlanPanel.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import SnapshotSyncHealthBadge from "~/components/common/SnapshotSyncHealthBadge.vue"
import type { SmokeAlarmZone, SmokeAlarmLocation, SmokeAlarmStatusItem } from "~/types/smoke-alarm"
import { deriveSmokeAlarmUiStatus } from "~/types/smoke-alarm"
import { useSmokeAlarmApi } from "~/composables/systems/smoke-alarm/useSmokeAlarmApi"
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
import { useSmokeAlarmModbusIntegration } from "~/composables/monitoring/modbus/snapshotModbusIntegrations"
import type { ManualIssueChangedPayload } from "~/utils/alertUtils"
import { useManualIssueDiDoRules } from "~/composables/systems/alerts/useManualIssueDiDoRules"
import { useVisibilitySnapshotSync } from "~/composables/monitoring/useVisibilitySnapshotSync"

definePageMeta({
	layout: "default",
})

import { PERM } from "~/config/permissionCodes"
const canAdmin = useAdminOnly()
const { canManageLocation, canCreateLocation, canUpdateLocation, canDeleteLocation } =
	useLocationModuleRbac(PERM.smokeAlarm)
const smokeApi = useSmokeAlarmApi()
const { handleError } = useErrorHandler()
const toast = useToast()

const leftSectionHeight = ref<number | null>(null)

const smokeZones = ref<SmokeAlarmZone[]>([])

const { ruleBitOptionsByTargetId } = useManualIssueDiDoRules({
	alertRulesSource: "smoke_alarm",
	zones: smokeZones,
	canAdmin,
})

const isLoadingZones = ref(false)
const isInitialLoading = ref(true)
const selectedZone = ref("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const showZoneManagementDialog = ref(false)
const statusItems = ref<SmokeAlarmStatusItem[]>([])

const {
	handleSaveZone: baseHandleSaveZone,
	handleDeleteZone: baseHandleDeleteZone,
	sortZones,
} = useZoneManagement<SmokeAlarmLocation, SmokeAlarmZone>()

const zonesById = computed(() => new Map(smokeZones.value.map((z) => [z.id || z.name, z])))

const selectedZoneName = computed(() => zonesById.value.get(selectedZone.value)?.name || "")
const selectedZoneData = computed(() => zonesById.value.get(selectedZone.value))
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const manualIssueTargets = computed(() => {
	if (!canAdmin.value) return []
	const out: Array<{ id: string; label: string }> = []
	for (const zone of smokeZones.value) {
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
	const m = new Map<string, SmokeAlarmStatusItem>()
	for (const it of statusItems.value) m.set(String(it.systemId), it)
	return m
})

const uiStatusForLocation = (loc: SmokeAlarmLocation): SmokeAlarmStatusItem["uiStatus"] => {
	if (!loc.systemId) return "warning"
	return deriveSmokeAlarmUiStatus(statusBySystemId.value.get(String(loc.systemId)) ?? null)
}

const getLocationAlertFlash = (loc: SmokeAlarmLocation): "none" | "slow" | "fast" => {
	const s = uiStatusForLocation(loc)
	if (s === "normal") return "none"
	if (s === "alarm") return "fast"
	return "slow"
}

const tooltipTitle = (loc: SmokeAlarmLocation) => {
	const s = uiStatusForLocation(loc)
	const label =
		s === "normal" ? "正常" : s === "warning" ? "異常" : "警報"
	return `${loc.name}（${label}）`
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const findLocationOriginalIndex = (zone: SmokeAlarmZone, target: SmokeAlarmLocation) => {
	return findLocationIndexInZone(zone, target)
}

const getLocationIdForDisplay = (location: SmokeAlarmLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const idx = findLocationOriginalIndex(zone, location)
	return idx !== -1 ? getLocationUiKey({ zone, location, locationIndex: idx }) : ""
}

const selectLocationByLocation = (location: SmokeAlarmLocation) => {
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

const findLocationById = (locationId: string): { zone: SmokeAlarmZone; locationIndex: number } | null => {
	for (const zone of smokeZones.value) {
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
	const { zone: targetZone, locationIndex } = found
	const updatedLocations = targetZone.locations.map((location, index) =>
		index === locationIndex ? { ...location, location: { x: payload.x, y: payload.y } } : location
	)
	try {
		const result = await smokeApi.updateZone(targetZone.id!, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			locations: updatedLocations,
		})
		const zi = smokeZones.value.findIndex((z) => z.id === targetZone.id)
		if (zi > -1) smokeZones.value[zi] = result.zone
		toast.success(TOAST.POINT_UPDATED)
	} catch (error) {
		handleError(error, "更新位置失敗")
	}
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await smokeApi.getZones()
		smokeZones.value = result.zones || []
		if (!selectedZone.value && smokeZones.value.length > 0) {
			const first = sortZones(smokeZones.value)[0]!
			selectedZone.value = first.id || first.name
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

const {
	syncHealthState,
	lastSuccessAt,
	statusItems: computedStatusItems,
	preloadDeviceInfos,
	loadStatusSnapshot,
	patchOptimistic,
	startSnapshotSync,
	stopSnapshotSync,
	handleVisibilityChange,
} = useSmokeAlarmModbusIntegration(smokeZones, selectedZone)

const snapshotSync = useVisibilitySnapshotSync({
	start: startSnapshotSync,
	stop: stopSnapshotSync,
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

const handleSaveZone = async (zone: SmokeAlarmZone) => {
	await baseHandleSaveZone(
		zone as SmokeAlarmZone & { id: string },
		smokeZones as Ref<(SmokeAlarmZone & { id: string })[]>,
		async (z: SmokeAlarmZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await smokeApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await smokeApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as SmokeAlarmZone & { id: string }
			return { merged: result.merged, message: result.message, zone: zoneWithId }
		},
		{ selectedZoneRef: selectedZone, ...ZONE_DIALOG_BATCH_SAVE_OPTIONS }
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, smokeZones as Ref<(SmokeAlarmZone & { id: string })[]>, smokeApi.deleteZone, {
		selectedZoneRef: selectedZone,
		systemType: "smoke_alarm",
		onAfterDelete: async () => {
			await loadZonesFromAPI()
		},
	})
}

const handleZonesSaved = async () => {
	await loadZonesFromAPI()
	await preloadDeviceInfos()
	await loadStatusSnapshot({ force: true })
}

const handleOpenZoneDialog = async () => {
	if (!canManageLocation.value) return
	if (smokeZones.value.length === 0) await loadZonesFromAPI()
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && smokeZones.value.length === 0) void loadZonesFromAPI()
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

watch([smokeZones, selectedZone], () => syncSelectedCategoryToVisibleOnMap(), { deep: true, immediate: true })

onMounted(async () => {
	try {
		await loadZonesFromAPI()
		await preloadDeviceInfos()
		await loadStatusSnapshot()
	} finally {
		isInitialLoading.value = false
	}
	snapshotSync.start()
})

</script>

