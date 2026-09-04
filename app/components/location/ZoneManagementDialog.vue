<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] min-h-0 w-full max-w-7xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">區域管理</h3>
						<div class="flex items-center gap-3">
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
								:message="changeSummary"
							/>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="handleClose"
							>
								&times;
							</button>
						</div>
					</header>

					<div class="flex min-h-0 flex-1 flex-col overflow-hidden pr-7 2xl:pr-8">
						<p v-if="errorMessage" class="mb-3 form-error-text-lg" role="alert">
							{{ errorMessage }}
						</p>
						<div class="grid min-h-0 flex-1 grid-cols-12 gap-4 2xl:gap-5">
							<ZoneLocationTreePanel
								ref="treePanelRef"
								:zones="sortedZones as any[]"
								:system-type="systemType"
								:selected-key="selectedKey"
								:location-label="getLocationLabel()"
								:allow-create-zone="canAddZone"
								:allow-create-location="canAddZone"
								:allow-delete-location="canRemoveZone"
								:allow-delete-zone="canRemoveZone"
								:reorderable="true"
								@select="selectedKey = $event"
								@add-zone="addNewZone"
								@delete-zone="handleDeleteZone"
								@reorder-zone="handleTreeReorderZone"
								@add-location="handleTreeAddLocation"
								@remove-location="removeLocation"
								@reorder-location="handleTreeReorderLocation"
							/>
							<ZoneLocationDetailPanel
								:selected-key="selectedKey"
								:zones="sortedZones as any[]"
								:system-type="systemType"
								:location-label="getLocationLabel()"
								:require-image-url="requireImageUrl"
								:location-management-component="locationManagementComponent"
								:get-zone-id="getZoneId"
								:devices="devices"
								:is-loading-devices="isLoadingDevices"
								:device-hint="deviceHint"
								:person-groups="personGroups"
								:vehicle-custom-groups="vehicleCustomGroups"
								:doors="doors"
								:access-control-devices="accessControlDevices"
								:isapi-camera-devices="isapiCameraDevices"
								:surveillance-camera-devices="surveillanceCameraDevices"
								@update-zone="handleZoneUpdate"
								@update-location="handleLocationUpdate"
							/>
						</div>
					</div>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<PermissionActionButton
							:allowed="canSaveZones"
							:disabled="!hasUnsavedChanges || isSaving"
							aria-label="儲存變更"
							class="btn-primary"
							@click="saveAllChanges"
						>
							{{ isSaving ? "儲存中…" : "儲存變更" }}
						</PermissionActionButton>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="
			confirmAction === 'delete'
				? handleConfirmDelete()
				: confirmAction === 'deleteLocation'
					? handleConfirmDeleteLocation()
					: handleConfirmClose()
		"
	/>
</template>

<script setup lang="ts" generic="TZone extends SystemZoneType">
import { TOAST } from "~/config/toastCatalog"
import type { SystemType, UnifiedZone } from "~/types/location"
import type { Device } from "~/types/device"
import type {
	SystemZoneType,
	SystemLocationType,
} from "~/composables/location/adapters/useZoneSystemAdapter"
import { useZoneSystemAdapter } from "~/composables/location/adapters/useZoneSystemAdapter"
import { useLocationValidationPipeline } from "~/composables/location/validation/useLocationValidationPipeline"
import { useZoneDrafts } from "~/composables/location/ui/useZoneDrafts"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useExternalDataApi } from "~/composables/systems/externalData/useExternalDataApi"
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import ZoneLocationTreePanel from "./ZoneLocationTreePanel.vue"
import ZoneLocationDetailPanel from "./ZoneLocationDetailPanel.vue"
import EnvironmentLocationManagement from "./LocationManagement/EnvironmentLocationManagement.vue"
import PeopleCountingLocationManagement from "./LocationManagement/PeopleCountingLocationManagement.vue"
import VehicleAccessLocationManagement from "./LocationManagement/VehicleAccessLocationManagement.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { buildUnsavedCloseConfirm } from "~/utils/formDialog"
import { nextTick, type Component } from "vue"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { joinFormErrors, resolveFormApiError } from "~/utils/apiError"
import { removeLocationFromSystemOrDelete } from "~/composables/location/locationSystemActions"
import {
	buildDeleteLocationConfirmCopy,
	buildDeleteZoneConfirmCopy,
	getLocationDeleteSuccessToast,
} from "~/utils/confirmCopy"
import { getLocationUiKey, getZoneUiKey } from "~/utils/locationUiId"
import { zoneSortOrderValue } from "~/utils/sortOrder"
import { filterPeopleCountingCameraDevices } from "~/utils/cameraModelCategories"
import {
	buildLocationSelectionKey,
	buildZoneSelectionKey,
	parseZoneTreeSelectionKey,
} from "~/composables/location/ui/useLocationGroupTree"

interface Props {
	modelValue: boolean
	zones: TZone[]
	systemType: SystemType
	requireImageUrl?: boolean
	deviceHint?: string
	canCreateZone?: boolean
	canUpdateZone?: boolean
	canDeleteZone?: boolean
	onSaveZone: (zone: TZone) => Promise<void>
}

interface Emits {
	(e: "update:modelValue", value: boolean): void
	(e: "delete", zoneId: string): void
	(e: "saved"): void
}

const props = withDefaults(defineProps<Props>(), {
	canCreateZone: true,
	canUpdateZone: true,
	canDeleteZone: true,
	requireImageUrl: false,
	deviceHint: "請先在「設備管理」中建立設備",
})

const emit = defineEmits<Emits>()

const canAddZone = computed(() => props.canCreateZone !== false)
const canSaveZones = computed(() => props.canUpdateZone !== false)
const canRemoveZone = computed(() => props.canDeleteZone !== false)

const adapter = useZoneSystemAdapter<TZone, SystemLocationType>(props.systemType)

const getZoneId = (zone: TZone): string => {
	return getZoneUiKey(zone as any)
}

const {
	pendingChanges,
	hasUnsavedChanges,
	clearAllDrafts,
	setDraft,
	deleteDraft,
	createMergedZones,
	createSortedZones,
	buildChangedFieldsList,
	buildChangeSummary,
	reconcileDraftWhenPropsLocationsMatch,
} = useZoneDrafts<TZone, SystemLocationType>()
const toast = useToast()
const errorMessage = ref("")
const isSaving = ref(false)
const selectedKey = ref<string | null>(null)
const treePanelRef = ref<{ clearAllDrafts: () => void; expandZone: (zoneId: string) => void } | null>(
	null
)

const pendingDeleteLocation = ref<{ zoneId: string; locationUiKey: string } | null>(null)

const { validateSystemZoneForSave } = useLocationValidationPipeline()

const updateZone = (zone: TZone) => {
	const zoneId = getZoneId(zone)
	if (!zoneId) return

	errorMessage.value = ""
	setDraft(zoneId, JSON.parse(JSON.stringify(zone)) as TZone)
}

const mergedZones = computed(() => {
	return createMergedZones({ originalZones: props.zones, getZoneId })
})

const sortedZones = computed(() => {
	return createSortedZones({
		mergedZones: mergedZones.value,
		getZoneId,
		getLocations: (z) => adapter.getLocationsProperty(z),
	})
})

const confirmDialog = useConfirmDialog()
const confirmAction = ref<"close" | "delete" | "deleteLocation">("close")

const { handleError } = useErrorHandler()

const showConfirmDialog = confirmDialog.showDialog
const confirmDialogConfig = confirmDialog.config

const changedFieldsList = computed(() => {
	return buildChangedFieldsList({
		originalZones: props.zones,
		pendingChanges: pendingChanges.value,
		getZoneId,
		getZoneName: (z) => (z as any)?.name ?? "",
		getZoneImageUrl: (z) => (z as any)?.imageUrl,
		getLocations: (z) => adapter.getLocationsProperty(z),
		locationLabel: getLocationLabel(),
	})
})

const changeSummary = computed(() => {
	return buildChangeSummary({ pendingChanges: pendingChanges.value })
})

const deviceApi = useDeviceApi()
const devices = ref<any[]>([])
const isLoadingDevices = ref(false)

const externalDataApi = useExternalDataApi()
const {
	enableYscpPeopleCounting,
	enableYscpVehicleAccess,
	ensureLoaded: ensureModuleRegistryLoaded,
} = useModuleRegistry()
const personGroups = ref<Array<{ id: number; name: string; is_deleted?: number }>>([])
const doors = ref<
	Array<{
		id: number
		device_id: number
		dev_name: string
		door_index: number
		is_deleted?: number
	}>
>([])
const accessControlDevices = ref<Device[]>([])
const isapiCameraDevices = ref<Device[]>([])
const surveillanceCameraDevices = ref<Device[]>([])
const vehicleCustomGroups = ref<Array<{ id: number; list_name: string }>>([])
const vehicleAccessApi = useVehicleAccessApi()

const locationManagementComponentMap: Partial<Record<SystemType, Component>> = {
	environment: EnvironmentLocationManagement,
	people_counting: PeopleCountingLocationManagement,
	vehicle_access: VehicleAccessLocationManagement,
}

const locationManagementComponent = computed(() => {
	const c = locationManagementComponentMap[props.systemType]
	return c ?? EnvironmentLocationManagement
})

const loadDevices = async () => {
	isLoadingDevices.value = true
	try {
		const result = await deviceApi.getDevices({
			type_code: "sensor",
			limit: 100,
		})
		devices.value = result.devices
	} catch (error) {
		logger.error("載入設備列表失敗:", error)
		errorMessage.value = "載入設備列表失敗"
	} finally {
		isLoadingDevices.value = false
	}
}

const loadPersonGroups = async () => {
	if (props.systemType !== "people_counting") return

	try {
		const result = await externalDataApi.getPersonGroups({
			limit: 1000,
		})
		personGroups.value = result.data || []
	} catch (error) {
		logger.error("載入人員群組列表失敗:", error)
		errorMessage.value = "載入人員群組列表失敗"
	}
}

const loadDoors = async () => {
	if (props.systemType !== "people_counting") return

	try {
		const result = await externalDataApi.getList("deviceaccess", "door", {
			limit: 1000,
		})
		doors.value = result.data || []
	} catch (error) {
		logger.error("載入門禁設備列表失敗:", error)
		errorMessage.value = "載入門禁設備列表失敗"
	}
}

const loadAccessControlDevices = async () => {
	if (props.systemType !== "people_counting") return

	try {
		const result = await deviceApi.getDevices({
			type_code: "access_control",
			limit: 100,
		})
		accessControlDevices.value = result.devices || []
	} catch (error) {
		logger.error("載入門禁設備列表失敗:", error)
		accessControlDevices.value = []
	}
}

const loadVehicleAccessFormGroups = async () => {
	if (props.systemType !== "vehicle_access") return

	if (enableYscpVehicleAccess.value) {
		try {
			const result = await vehicleAccessApi.getVehicleGroups()
			vehicleCustomGroups.value = (result.groups ?? [])
				.filter((g) => (g.id ?? 0) > 0)
				.map((g) => ({
					id: g.id ?? 0,
					list_name: g.list_name?.trim() || `群組 ${g.id}`,
				}))
		} catch (error) {
			logger.error("載入車輛群組列表失敗:", error)
			vehicleCustomGroups.value = []
		}
	} else {
		vehicleCustomGroups.value = []
	}
}

const loadIsapiCameraDevices = async () => {
	if (props.systemType !== "people_counting") return
	try {
		const result = await deviceApi.getDevices({
			type_code: "camera",
			limit: 200,
		})
		const all = result.devices || []
		isapiCameraDevices.value = filterPeopleCountingCameraDevices(all)
		surveillanceCameraDevices.value = all
	} catch {
		isapiCameraDevices.value = []
		surveillanceCameraDevices.value = []
	}
}

watch(
	() => props.modelValue,
	async (newValue) => {
		if (newValue) {
			loadDevices()
			if (props.systemType === "people_counting") {
				await ensureModuleRegistryLoaded()
				if (enableYscpPeopleCounting.value) {
					loadPersonGroups()
					loadDoors()
				} else {
					personGroups.value = []
					doors.value = []
				}
				loadAccessControlDevices()
				loadIsapiCameraDevices()
			}
			if (props.systemType === "vehicle_access") {
				await ensureModuleRegistryLoaded()
				await loadVehicleAccessFormGroups()
			}
			clearAllDrafts()
			treePanelRef.value?.clearAllDrafts()
			errorMessage.value = ""
			await nextTick()
			selectFirstZoneIfNeeded()
		} else {
			selectedKey.value = null
		}
	}
)

watch(
	() =>
		sortedZones.value.map(
			(z) => `${getZoneId(z)}:${adapter.getLocationsProperty(z).length}`
		),
	() => {
		if (!props.modelValue) return
		reconcileSelectedKey()
	}
)

const getLocationLabel = (): string => "地點"

const selectFirstZoneIfNeeded = () => {
	if (sortedZones.value.length === 0) {
		selectedKey.value = null
		return
	}
	const firstZone = sortedZones.value[0]!
	const firstId = getZoneId(firstZone)
	if (!firstId) return
	treePanelRef.value?.expandZone(firstId)
	const locs = adapter.getLocationsProperty(firstZone)
	selectedKey.value =
		locs.length > 0
			? buildLocationSelectionKey(firstId, 0)
			: buildZoneSelectionKey(firstId)
}

const reconcileSelectedKey = () => {
	const sel = parseZoneTreeSelectionKey(selectedKey.value)
	if (!sel) {
		selectFirstZoneIfNeeded()
		return
	}
	const zone = sortedZones.value.find((z) => getZoneId(z) === sel.zoneId)
	if (!zone) {
		selectFirstZoneIfNeeded()
		return
	}
	if (sel.type === "location") {
		const locs = adapter.getLocationsProperty(zone)
		if (sel.index < 0 || sel.index >= locs.length) {
			selectedKey.value =
				locs.length > 0
					? buildLocationSelectionKey(sel.zoneId, 0)
					: buildZoneSelectionKey(sel.zoneId)
		}
	}
}

const handleTreeReorderZone = (payload: { fromZoneId: string; toZoneId: string }) => {
	moveZoneOrderByIds(payload.fromZoneId, payload.toZoneId)
}

const handleTreeAddLocation = (
	zoneId: string,
	_payload?: { viewCategory?: string; floor?: string }
) => {
	const zone = sortedZones.value.find((z) => getZoneId(z) === zoneId)
	if (!zone) return
	addLocation(zone)
}

const handleTreeReorderLocation = (payload: {
	zoneId: string
	fromIndex: number
	toIndex: number
}) => {
	const zone = sortedZones.value.find((z) => getZoneId(z) === payload.zoneId)
	if (!zone) return
	handleReorderLocationByIndex(zone, payload.fromIndex, payload.toIndex)
}

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		const hasNewZones = Array.from(pendingChanges.value.keys()).some((id) => id.startsWith("temp-"))

		confirmAction.value = "close"
		confirmDialog.show(
			buildUnsavedCloseConfirm(
				hasNewZones
					? {
							contextHint: "含新增區域",
							extraDetails: "新增區域須儲存後才會寫入資料庫。",
						}
					: {}
			)
		)
		return
	}

	closeDialog()
}

const closeDialog = () => {
	clearAllDrafts()
	treePanelRef.value?.clearAllDrafts()
	selectedKey.value = null
	errorMessage.value = ""
	emit("update:modelValue", false)
}

const handleConfirmClose = () => {
	closeDialog()
}

const handleZoneUpdate = (zoneId: string, updates: Partial<UnifiedZone>) => {
	const zone = sortedZones.value.find((z) => getZoneId(z) === zoneId)
	if (!zone) return

	const updatedZone = { ...zone, ...updates } as TZone
	updateZone(updatedZone)
}

const handleLocationUpdate = (
	zoneId: string,
	locationIndex: number,
	updatedLocation: SystemLocationType
) => {
	const zone = sortedZones.value.find((z) => getZoneId(z) === zoneId)
	if (!zone) return

	const locations = [...adapter.getLocationsProperty(zone)]
	locations[locationIndex] = updatedLocation

	const updatedZone = adapter.setLocationsProperty(zone, locations)
	updateZone(updatedZone)
}

const addLocation = (zone: TZone) => {
	if (!canAddZone.value) return
	const newLocation = adapter.createNewLocation() as SystemLocationType

	if (props.systemType === "people_counting") {
		const loc = newLocation as { dataSource?: string }
		if (!loc.dataSource) {
			loc.dataSource = enableYscpPeopleCounting.value ? "yscp" : "access_control"
		}
	}
	if (props.systemType === "vehicle_access") {
		const loc = newLocation as { dataSource?: string }
		if (!loc.dataSource) {
			loc.dataSource = enableYscpVehicleAccess.value ? "yscp" : "isapi_camera"
		}
	}

	const locations = [...adapter.getLocationsProperty(zone), newLocation]
	const updatedZone = adapter.setLocationsProperty(zone, locations)
	updateZone(updatedZone)
	const zoneId = getZoneId(updatedZone)
	const newIndex = adapter.getLocationsProperty(updatedZone).length - 1
	if (zoneId && newIndex >= 0) {
		selectedKey.value = buildLocationSelectionKey(zoneId, newIndex)
		treePanelRef.value?.expandZone(zoneId)
	}
}

const removeLocation = (zoneId: string, locationIndex: number) => {
	if (!canRemoveZone.value) return
	const zone = sortedZones.value.find((z) => getZoneId(z) === zoneId)
	if (!zone) return
	const locations = adapter.getLocationsProperty(zone)
	const target = locations?.[locationIndex] as any
	const locationUiKey = getLocationUiKey({ zone: zone as any, location: target, locationIndex })
	pendingDeleteLocation.value = { zoneId, locationUiKey }
	confirmAction.value = "deleteLocation"
	const hasId = Boolean(target?.id)
	const systemCount = target?.systems?.length || 0
	const copy = buildDeleteLocationConfirmCopy({
		hasId,
		systemType: props.systemType,
		systemCount,
	})
	confirmDialog.show(copy)
}

const commitLocalLocationRemoval = (
	zone: TZone,
	locations: SystemLocationType[],
	index: number
) => {
	const zoneId = getZoneId(zone)
	const sel = parseZoneTreeSelectionKey(selectedKey.value)
	locations.splice(index, 1)
	updateZone(adapter.setLocationsProperty(zone, locations))

	if (!sel || sel.zoneId !== zoneId) return
	if (sel.type !== "location") return
	if (locations.length === 0) {
		selectedKey.value = buildZoneSelectionKey(zoneId)
		return
	}
	if (sel.index === index) {
		selectedKey.value = buildLocationSelectionKey(
			zoneId,
			Math.min(index, locations.length - 1)
		)
		return
	}
	if (sel.index > index) {
		selectedKey.value = buildLocationSelectionKey(zoneId, sel.index - 1)
	}
}

const handleConfirmDeleteLocation = async () => {
	if (!pendingDeleteLocation.value) return
	const { zoneId, locationUiKey } = pendingDeleteLocation.value
	const zone = sortedZones.value.find((z) => getZoneId(z) === zoneId)
	if (!zone) {
		pendingDeleteLocation.value = null
		return
	}

	const locations = [...adapter.getLocationsProperty(zone)]
	const resolvedIndex = locations.findIndex((loc: any, idx: number) => {
		return (
			getLocationUiKey({ zone: zone as any, location: loc, locationIndex: idx }) === locationUiKey
		)
	})
	if (resolvedIndex < 0) {
		pendingDeleteLocation.value = null
		return
	}

	const target = locations[resolvedIndex] as { id?: string | number }
	const targetId = target?.id != null ? String(target.id) : null

	if (targetId) {
		try {
			const result = await removeLocationFromSystemOrDelete({
				locationId: targetId,
				systemType: props.systemType,
			})
			if (result.action === "no-op") {
				handleError(new Error("此地點不包含本系統"), "刪除地點失敗")
				pendingDeleteLocation.value = null
				return
			}
			toast.success(getLocationDeleteSuccessToast(result.action, props.systemType))
		} catch (error) {
			handleError(error, "刪除地點失敗")
			pendingDeleteLocation.value = null
			return
		}

		commitLocalLocationRemoval(zone, locations, resolvedIndex)
		pendingDeleteLocation.value = null
		emit("saved")
		reconcileDraftWhenPropsLocationsMatch(zoneId, {
			originalZones: () => props.zones,
			getZoneId,
			getLocations: (z) => adapter.getLocationsProperty(z),
		})
		return
	}

	commitLocalLocationRemoval(zone, locations, resolvedIndex)
	pendingDeleteLocation.value = null
	toast.success(TOAST.LOCATION_REMOVED_FROM_LIST)
}

const maxZoneSortOrder = (): number => {
	let m = -1
	for (const z of mergedZones.value) {
		m = Math.max(m, zoneSortOrderValue(z as { sortOrder?: number | null }))
	}
	return m
}

const snapshotZoneById = (zoneId: string): TZone | undefined => {
	const pending = pendingChanges.value.get(zoneId)
	if (pending) return JSON.parse(JSON.stringify(pending)) as TZone
	const fromProps = props.zones.find((z) => getZoneId(z) === zoneId)
	return fromProps ? (JSON.parse(JSON.stringify(fromProps)) as TZone) : undefined
}

const moveZoneOrderByIds = (fromZoneId: string, toZoneId: string) => {
	if (!fromZoneId || !toZoneId || fromZoneId === toZoneId) return
	const list = sortedZones.value
	const orderedIds = list.map((z) => getZoneId(z)).filter(Boolean)
	if (orderedIds.length !== list.length) return
	const fromIndex = orderedIds.indexOf(fromZoneId)
	const toIndex = orderedIds.indexOf(toZoneId)
	if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return

	const nextIds = [...orderedIds]
	const [moved] = nextIds.splice(fromIndex, 1)
	if (!moved) return
	nextIds.splice(toIndex, 0, moved)

	for (let idx = 0; idx < nextIds.length; idx += 1) {
		const zoneId = nextIds[idx]!
		const snap = snapshotZoneById(zoneId)
		if (!snap) continue
		pendingChanges.value.set(zoneId, { ...snap, sortOrder: idx } as TZone)
	}

	errorMessage.value = ""
}

const handleReorderLocationByIndex = (zone: TZone, fromIndex: number, toIndex: number) => {
	const locs = [...adapter.getLocationsProperty(zone)] as SystemLocationType[]
	if (
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= locs.length ||
		toIndex >= locs.length ||
		fromIndex === toIndex
	)
		return
	const [moved] = locs.splice(fromIndex, 1)
	if (!moved) return
	locs.splice(toIndex, 0, moved)
	locs.forEach((loc, idx) => {
		;(loc as unknown as { sortOrder?: number }).sortOrder = idx
	})
	const updatedZone = adapter.setLocationsProperty(zone, locs)
	updateZone(updatedZone)

	const zoneId = getZoneId(zone)
	const sel = parseZoneTreeSelectionKey(selectedKey.value)
	if (!sel || sel.type !== "location" || sel.zoneId !== zoneId) return
	if (sel.index === fromIndex) {
		selectedKey.value = buildLocationSelectionKey(zoneId, toIndex)
		return
	}
	if (fromIndex < sel.index && toIndex >= sel.index) {
		selectedKey.value = buildLocationSelectionKey(zoneId, sel.index - 1)
		return
	}
	if (fromIndex > sel.index && toIndex <= sel.index) {
		selectedKey.value = buildLocationSelectionKey(zoneId, sel.index + 1)
	}
}

const addNewZone = () => {
	const tempId = `temp-${Date.now()}-${Math.random()}`

	const newZone = {
		...adapter.createNewZone(""),
		id: tempId,
		sortOrder: maxZoneSortOrder() + 1,
	} as TZone

	pendingChanges.value.set(tempId, JSON.parse(JSON.stringify(newZone)) as TZone)

	selectedKey.value = buildZoneSelectionKey(tempId)
	nextTick(() => {
		treePanelRef.value?.expandZone(tempId)
	})
}

const flushFocusedFormControlInDialog = async () => {
	if (typeof document === "undefined") return
	const raw = document.activeElement
	if (!raw || !(raw instanceof HTMLElement)) return
	if (!raw.closest(".dialog-panel-bg")) return
	const tag = raw.tagName
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
		raw.blur()
		await nextTick()
	}
}

const saveAllChanges = async () => {
	if (pendingChanges.value.size === 0 || isSaving.value) return

	await flushFocusedFormControlInDialog()

	errorMessage.value = ""
	const zoneAny = (zone: TZone) => zone as any

	for (const zone of pendingChanges.value.values()) {
		const locations = adapter.getLocationsProperty(zone)
		const result = validateSystemZoneForSave({
			systemType: props.systemType,
			requireImageUrl: props.requireImageUrl,
			zone,
			locations,
		})
		if (!result.isValid) {
			errorMessage.value = joinFormErrors(result.errors)
			return
		}
	}

	const zonesToSave = Array.from(pendingChanges.value.entries())
	const saveCount = zonesToSave.length

	isSaving.value = true
	try {
		const results = await Promise.allSettled(
			zonesToSave.map(async ([, zone]) => {
				const cleanedZone = adapter.filterEmptyLocations(zone as TZone)
				const isNewZone = zoneAny(zone).id?.startsWith("temp-")
				if (isNewZone) {
					const { id, ...zoneWithoutId } = zoneAny(cleanedZone)
					await props.onSaveZone(zoneWithoutId as TZone)
				} else {
					await props.onSaveZone(cleanedZone)
				}
			})
		)

		const succeededIds: string[] = []
		const failures: PromiseRejectedResult[] = []
		results.forEach((result, index) => {
			if (result.status === "fulfilled") {
				succeededIds.push(zonesToSave[index]![0])
			} else {
				failures.push(result)
			}
		})

		for (const zoneId of succeededIds) {
			deleteDraft(zoneId)
		}

		if (failures.length === 0) {
			toast.success(saveCount === 1 ? TOAST.ZONE_SAVED : TOAST.ZONES_SAVED(saveCount))
			emit("saved")
		} else if (succeededIds.length > 0) {
			toast.warning(TOAST.ZONE_PARTIAL_SAVE_FAILED(failures.length, saveCount))
			errorMessage.value = resolveFormApiError(failures[0]!.reason, "部分區域儲存失敗")
			emit("saved")
		} else {
			errorMessage.value = resolveFormApiError(failures[0]!.reason, "儲存區域失敗")
		}
	} finally {
		isSaving.value = false
	}
}

const pendingDeleteZoneId = ref<string | null>(null)

const handleDeleteZone = (zoneId: string) => {
	pendingDeleteZoneId.value = zoneId
	confirmAction.value = "delete"
	confirmDialog.show(buildDeleteZoneConfirmCopy({ systemType: props.systemType }))
}

const handleConfirmDelete = () => {
	const zoneId = pendingDeleteZoneId.value
	if (!zoneId) return

	if (!zoneId.startsWith("temp-")) {
		emit("delete", zoneId)
	}
	deleteDraft(zoneId)
	pendingDeleteZoneId.value = null
}
</script>
