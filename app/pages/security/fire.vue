<template>
	<div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<FireZonePlanPanel
				:selected-zone-name="selectedZoneName"
				:is-initial-loading="isInitialLoading"
				:can-write="canWrite"
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
				<FireMonitorCenter
					v-model:view-filter="selectedViewCategory"
					:zones="fireZones"
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
		:zones="fireZones"
		system-type="fire"
		:require-image-url="true"
		device-hint="請先在「設備管理」中建立控制器設備"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from "vue"
import FireMonitorCenter from "~/components/fire/FireMonitorCenter.vue"
import FireZonePlanPanel from "~/components/fire/FireZonePlanPanel.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import {
	type FireZone,
	type FireLocation,
	type FireStatusItem,
	buildFireMonitorViewFilterOptions,
	fireLocationInViewCategory,
	DEFAULT_FIRE_MONITOR_VIEW_CATEGORY,
	deriveFirePumpUiStatus,
	deriveFireTankOverallUiStatus,
} from "~/types/fire"
import { useFireApi } from "~/composables/systems/fire/useFireApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import { useAuth } from "~/composables/core/useAuth"
import { getLocationUiKey, findLocationIndexInZone } from "~/utils/locationUiId"
import { isValidPercentPosition } from "~/utils/mapPosition"
import { useFireModbusIntegration } from "~/composables/systems/fire/useFireModbusIntegration"
import type { ManualIssueChangedPayload } from "~/utils/alertUtils"
import { useManualIssueDiDoRules } from "~/composables/systems/alerts/useManualIssueDiDoRules"

definePageMeta({
	layout: "default",
})

const { canWrite, isAdmin } = useAuth()
const fireApi = useFireApi()
const { handleError } = useErrorHandler()

const leftSectionHeight = ref<number | null>(null)

const fireZones = ref<FireZone[]>([])

const { ruleBitOptionsByTargetId } = useManualIssueDiDoRules({
	alertRulesSource: "fire",
	zones: fireZones,
	isAdmin,
})

const isLoadingZones = ref(false)
const isInitialLoading = ref(true)
const selectedZone = ref("")
const selectedCategory = ref("")
const isEditMode = ref(false)
const showZoneManagementDialog = ref(false)
const statusItems = ref<FireStatusItem[]>([])

const selectedViewCategory = ref<string>(DEFAULT_FIRE_MONITOR_VIEW_CATEGORY)

const {
	handleSaveZone: baseHandleSaveZone,
	handleDeleteZone: baseHandleDeleteZone,
	sortZones,
} = useZoneManagement<FireLocation, FireZone>()

const viewFilterOptions = computed(() => buildFireMonitorViewFilterOptions(fireZones.value))

watch(
	viewFilterOptions,
	(opts) => {
		const ids = new Set(opts.map((o) => o.value))
		if (ids.has(selectedViewCategory.value)) return
		if (ids.has(DEFAULT_FIRE_MONITOR_VIEW_CATEGORY)) {
			selectedViewCategory.value = DEFAULT_FIRE_MONITOR_VIEW_CATEGORY
		} else if (opts.length > 0) {
			selectedViewCategory.value = opts[0].value
		}
	},
	{ immediate: true }
)

const zonesById = computed(() => {
	return new Map(fireZones.value.map((z) => [z.id || z.name, z]))
})

const selectedZoneName = computed(() => zonesById.value.get(selectedZone.value)?.name || "")
const selectedZoneData = computed(() => zonesById.value.get(selectedZone.value))
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

const manualIssueTargets = computed(() => {
	if (!isAdmin.value) return []
	const out: Array<{ id: string; label: string }> = []
	for (const zone of fireZones.value) {
		for (const loc of zone.locations || []) {
			if (!loc.systemId) continue
			out.push({
				id: String(loc.systemId),
				label: `${zone.name} / ${loc.name}（${String(loc.systemId)}）`,
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
			fireLocationInViewCategory(loc, selectedViewCategory.value)
	)
})

const statusBySystemId = computed(() => {
	const m = new Map<string, FireStatusItem>()
	for (const it of statusItems.value) {
		m.set(String(it.systemId), it)
	}
	return m
})

const pumpUiStatusForLocation = (loc: FireLocation): FireStatusItem["uiStatus"] => {
	if (!loc.systemId) return "warning"
	return deriveFirePumpUiStatus(statusBySystemId.value.get(String(loc.systemId)) ?? null)
}

const tankUiStatusForLocation = (loc: FireLocation): FireStatusItem["uiStatus"] => {
	if (!loc.systemId) return "warning"
	return deriveFireTankOverallUiStatus(statusBySystemId.value.get(String(loc.systemId)) ?? null)
}

const uiStatusForLocation = (loc: FireLocation): FireStatusItem["uiStatus"] => {
	const kind = loc.equipmentKind || "pump"
	if (kind === "pump") return pumpUiStatusForLocation(loc)
	return tankUiStatusForLocation(loc)
}

const getLocationAlertFlash = (loc: FireLocation): "none" | "slow" | "fast" => {
	const s = uiStatusForLocation(loc)
	if (s === "normal") return "none"
	if (s === "alarm") return "fast"
	return "slow"
}

const tooltipTitle = (loc: FireLocation) => {
	const s = uiStatusForLocation(loc)
	const label = s === "normal" ? "正常" : s === "warning" ? "異常" : s === "alarm" ? "警報" : "異常"
	return `${loc.name}：${label}`
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

const findLocationOriginalIndex = (zone: FireZone, target: FireLocation) => {
	return findLocationIndexInZone(zone, target)
}

const getLocationIdForDisplay = (location: FireLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const idx = findLocationOriginalIndex(zone, location)
	return idx !== -1 ? getLocationUiKey({ zone, location, locationIndex: idx }) : ""
}

const selectLocationByLocation = (location: FireLocation) => {
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

const findLocationById = (locationId: string): { zone: FireZone; locationIndex: number } | null => {
	for (const zone of fireZones.value) {
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
		const result = await fireApi.updateZone(targetZone.id!, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			locations: updatedLocations,
		})
		const zi = fireZones.value.findIndex((z) => z.id === targetZone.id)
		if (zi > -1) fireZones.value[zi] = result.zone
	} catch (error) {
		handleError(error, "更新位置失敗")
	}
}

const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await fireApi.getZones()
		fireZones.value = result.zones || []
		if (!selectedZone.value && fireZones.value.length > 0) {
			const first = sortZones(fireZones.value)[0]!
			selectedZone.value = first.id || first.name
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

const {
	statusItems: computedStatusItems,
	preloadDeviceInfos,
	loadStatusSnapshot,
	patchOptimisticManualAlarm,
	startAutoRefresh,
	stopAutoRefresh,
	handleVisibilityChange,
} = useFireModbusIntegration(fireZones)

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

const handleSaveZone = async (zone: FireZone) => {
	await baseHandleSaveZone(
		zone as FireZone & { id: string },
		fireZones as Ref<(FireZone & { id: string })[]>,
		async (z: FireZone & { id: string }) => {
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await fireApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
				: await fireApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						sortOrder: z.sortOrder,
						locations: z.locations,
					})
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as FireZone & {
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
		fireZones as Ref<(FireZone & { id: string })[]>,
		fireApi.deleteZone,
		{
			selectedZoneRef: selectedZone,
			systemType: "fire",
			onAfterDelete: async () => {
				await loadZonesFromAPI()
			},
		}
	)
}

const handleOpenZoneDialog = async () => {
	if (fireZones.value.length === 0) await loadZonesFromAPI()
	showZoneManagementDialog.value = true
}

const handleToggleEditMode = () => {
	if (!isEditMode.value && fireZones.value.length === 0) {
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

watch([fireZones, selectedZone, selectedViewCategory], () => syncSelectedCategoryToVisibleOnMap(), {
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
	startAutoRefresh()
	document.addEventListener("visibilitychange", handleVisibilityChange)
})

onBeforeUnmount(() => {
	stopAutoRefresh()
	document.removeEventListener("visibilitychange", handleVisibilityChange)
})
</script>
