<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
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

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="sortedZones.length > 0" :key="`zones-${sortedZones.length}`">
									<div class="space-y-3">
										<div
											v-for="zone in sortedZones"
											:key="getZoneId(zone)"
											class="overflow-hidden rounded-lg border transition-all"
											:class="[
												isNewZone(zone)
													? 'border-2 border-amber-400/90 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]'
													: 'border border-white/20 bg-white/10',
												{ 'bg-white/15': !isNewZone(zone) && expandedZones.has(getZoneId(zone)) },
												{
													'bg-amber-500/15': isNewZone(zone) && expandedZones.has(getZoneId(zone)),
												},
											]"
										>
											<div
												class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
												@click="toggleZone(getZoneId(zone))"
											>
												<div class="flex flex-1 items-center gap-4">
													<svg
														class="h-5 w-5 text-white/70 transition-transform"
														:class="{ 'rotate-90': expandedZones.has(getZoneId(zone)) }"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M9 5l7 7-7 7"
														/>
													</svg>
													<div
														class="flex h-16 min-w-[80px] items-center justify-center rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 shadow-lg"
													>
														<h4
															v-if="zone.name"
															class="text-xl font-bold tracking-wider text-white 2xl:text-2xl"
														>
															{{ zone.name }}
														</h4>
														<span v-else class="text-sm text-white/60 2xl:text-base">未命名</span>
													</div>

													<div class="flex-1">
														<div class="flex items-center gap-3">
															<span
																class="rounded-full bg-white/25 px-3 py-1 text-sm font-medium text-white 2xl:text-base"
															>
																{{ getLocationsCount(zone) }} 個{{ getLocationLabel() }}
															</span>
														</div>
													</div>
												</div>
												<div class="ml-4 flex gap-2 2xl:gap-3" @click.stop>
													<div class="btn-reorder-stack">
														<button
															type="button"
															class="btn-reorder-arrow"
															:disabled="isFirstZoneInList(zone)"
															title="上移"
															aria-label="此區域上移"
															@click.stop="moveZoneOrder(zone, -1)"
														>
															↑
														</button>
														<button
															type="button"
															class="btn-reorder-arrow"
															:disabled="isLastZoneInList(zone)"
															title="下移"
															aria-label="此區域下移"
															@click.stop="moveZoneOrder(zone, 1)"
														>
															↓
														</button>
													</div>
													<IconTrashButton
														:allowed="canRemoveZone"
														title="刪除區域"
														aria-label="刪除區域"
														@click.stop="handleDeleteZone(getZoneId(zone))"
													/>
												</div>
											</div>

											<Transition name="expand">
												<div
													v-if="expandedZones.has(getZoneId(zone))"
													class="space-y-3 border-t border-white/10 p-4"
												>
													<ZoneFormFields
														:zone="getZoneForFormFields(zone)"
														:require-image-url="requireImageUrl"
														@update="handleZoneUpdate(getZoneId(zone), $event)"
													/>

													<component
														:is="locationManagementComponent"
														v-bind="drainageLikeProps"
														:zone="zone"
														:devices="devices"
														:sensor-devices="sensorDevices"
														:is-loading-devices="isLoadingDevices"
														:device-hint="deviceHint"
														:person-groups="personGroups"
														:vehicle-custom-groups="vehicleCustomGroups"
														:doors="doors"
														:access-control-devices="accessControlDevices"
														:isapi-camera-devices="isapiCameraDevices"
														:reorderable-locations="true"
														:allow-create-location="canAddZone"
														:allow-delete-location="canRemoveZone"
														@add-location="
															(payload?: { viewCategory?: string }) => addLocation(zone, payload)
														"
														@remove-location="
															(index: number) => removeLocation(getZoneId(zone), index)
														"
														@rename-view-category="
															(p: { oldCategory: string; newCategory: string }) =>
																handleDrainageRenameViewCategory(getZoneId(zone), p)
														"
														@reorder-location="
															(payload: { index: number; direction: 'up' | 'down' }) =>
																handleReorderLocationRow(zone, payload)
														"
														@reorder-view-category-block="
															(p: { categoryKey: string; direction: 'up' | 'down' }) =>
																handleReorderDrainageViewCategoryBlock(getZoneId(zone), p)
														"
														@update-location="
															(index: number, location: SystemLocationType) =>
																handleLocationUpdate(getZoneId(zone), index, location)
														"
													/>
												</div>
											</Transition>
										</div>
									</div>
								</div>
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無區域資料</p>
									<p class="mt-2 text-sm 2xl:text-base">點擊「新增區域」開始建立</p>
								</div>
							</Transition>
						</div>
					</div>

					<p v-if="errorMessage" class="form-error-text-lg pr-7 2xl:pr-8">
						{{ errorMessage }}
					</p>
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
						<PermissionActionButton
							:allowed="canAddZone"
							aria-label="新增區域"
							class="btn-primary"
							@click="addNewZone"
						>
							新增區域
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
import ZoneFormFields from "./ZoneFormFields.vue"
import EnvironmentLocationManagement from "./LocationManagement/EnvironmentLocationManagement.vue"
import LightingLocationManagement from "./LocationManagement/LightingLocationManagement.vue"
import HvacLocationManagement from "./LocationManagement/HvacLocationManagement.vue"
import AirCirculationLocationManagement from "./LocationManagement/AirCirculationLocationManagement.vue"
import PeopleCountingLocationManagement from "./LocationManagement/PeopleCountingLocationManagement.vue"
import ElevatorLocationManagement from "./LocationManagement/ElevatorLocationManagement.vue"
import VehicleAccessLocationManagement from "./LocationManagement/VehicleAccessLocationManagement.vue"
import DrainageLocationManagement from "./LocationManagement/DrainageLocationManagement.vue"
import PowerLocationManagement from "./LocationManagement/PowerLocationManagement.vue"
import EmergencyRescueLocationManagement from "./LocationManagement/EmergencyRescueLocationManagement.vue"
import FireLocationManagement from "./LocationManagement/FireLocationManagement.vue"
import SmokeAlarmLocationManagement from "./LocationManagement/SmokeAlarmLocationManagement.vue"
import AccessSecurityLocationManagement from "./LocationManagement/AccessSecurityLocationManagement.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { nextTick, type Component } from "vue"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import {
	isApiRequestTimeout,
	joinFormErrors,
	resolveFormApiError,
} from "~/utils/apiError"
import { removeLocationFromSystemOrDelete } from "~/composables/location/locationSystemActions"
import {
	buildDeleteLocationConfirmCopy,
	buildDeleteZoneConfirmCopy,
	getLocationDeleteSuccessToast,
} from "~/utils/confirmCopy"
import { getLocationUiKey, getZoneUiKey } from "~/utils/locationUiId"
import { pickSortOrder, zoneSortOrderValue } from "~/utils/sortOrder"
import { filterPeopleCountingCameraDevices } from "~/utils/cameraModelCategories"

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

const {
	pendingChanges,
	expandedZones,
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

const pendingDeleteLocation = ref<{ zoneId: string; locationUiKey: string } | null>(null)

const { validateSystemZoneForSave } = useLocationValidationPipeline()

const updateZone = (zone: TZone) => {
	const zoneId = getZoneId(zone)
	if (!zoneId) return

	errorMessage.value = ""
	// 使用 JSON 深拷貝，避免 structuredClone 對部分對象失敗
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

const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})

const confirmDialogConfig = computed(() => confirmDialog.config.value)

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
const sensorDevices = ref<Device[]>([])
const vehicleCustomGroups = ref<Array<{ id: number; list_name: string }>>([])
const vehicleAccessApi = useVehicleAccessApi()

const locationManagementComponentMap: Partial<Record<SystemType, Component>> = {
	lighting: LightingLocationManagement,
	hvac: HvacLocationManagement,
	air_circulation: AirCirculationLocationManagement,
	environment: EnvironmentLocationManagement,
	people_counting: PeopleCountingLocationManagement,
	elevator: ElevatorLocationManagement,
	vehicle_access: VehicleAccessLocationManagement,
	drainage: DrainageLocationManagement,
	power: PowerLocationManagement,
	fire: FireLocationManagement,
	emergency_rescue: EmergencyRescueLocationManagement,
	smoke_alarm: SmokeAlarmLocationManagement,
	access_security: AccessSecurityLocationManagement,
}

const locationManagementComponent = computed(() => {
	const c = locationManagementComponentMap[props.systemType]
	return c ?? LightingLocationManagement
})

const drainageLikeVariant = computed(() => {
	if (props.systemType === "drainage") return "drainage"
	return null
})

const drainageLikeProps = computed(() =>
	drainageLikeVariant.value ? { variant: drainageLikeVariant.value } : {}
)

const loadDevices = async () => {
	isLoadingDevices.value = true
	try {
		const deviceType =
			props.systemType === "lighting" ||
			props.systemType === "hvac" ||
			props.systemType === "air_circulation" ||
			props.systemType === "drainage" ||
			props.systemType === "power" ||
			props.systemType === "fire" ||
			props.systemType === "emergency_rescue" ||
			props.systemType === "smoke_alarm" ||
			props.systemType === "elevator"
				? "controller"
				: props.systemType === "access_security"
					? "video_intercom"
					: "sensor"
		const result = await deviceApi.getDevices({
			type_code: deviceType,
			limit: 100,
		})
		devices.value =
			props.systemType === "access_security"
				? (result.devices || []).filter((d) => {
						const cfg = d.config as { unitType?: string } | undefined
						return String(cfg?.unitType || "") === "indoor"
					})
				: result.devices
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
	if (props.systemType !== "people_counting" && props.systemType !== "elevator") return

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
		isapiCameraDevices.value = filterPeopleCountingCameraDevices(result.devices || [])
	} catch {
		isapiCameraDevices.value = []
	}
}

const loadHvacSensorDevices = async () => {
	if (props.systemType !== "hvac") {
		sensorDevices.value = []
		return
	}
	try {
		const result = await deviceApi.getDevices({
			type_code: "sensor",
			limit: 100,
		})
		sensorDevices.value = result.devices || []
	} catch (error) {
		logger.error("載入感測器列表失敗:", error)
		sensorDevices.value = []
	}
}

watch(
	() => props.modelValue,
	async (newValue) => {
		if (newValue) {
			loadDevices()
			if (props.systemType === "hvac") {
				loadHvacSensorDevices()
			} else {
				sensorDevices.value = []
			}
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
			if (props.systemType === "elevator") {
				loadAccessControlDevices()
			}
			clearAllDrafts()
			errorMessage.value = ""
		}
	}
)

const getZoneId = (zone: TZone): string => {
	return getZoneUiKey(zone as any)
}

const getLocationsCount = (zone: TZone): number => {
	return adapter.getLocationsProperty(zone).length
}

const getLocationLabel = (): string => {
	const labelMap: Record<SystemType, string> = {
		lighting: "點位",
		hvac: "點位",
		air_circulation: "點位",
		drainage: "點位",
		power: "點位",
		fire: "點位",
		emergency_rescue: "點位",
		smoke_alarm: "點位",
		environment: "地點",
		people_counting: "地點",
		elevator: "地點",
		vehicle_access: "地點",
		access_security: "戶別",
	}
	return labelMap[props.systemType] || "地點"
}

const getZoneForFormFields = (zone: TZone): UnifiedZone => {
	const zoneAny = zone as any
	return {
		id: getZoneId(zone),
		name: zone.name,
		imageUrl: zoneAny.imageUrl,
		description: zoneAny.description,
		...pickSortOrder(zoneAny.sortOrder),
		locations: [],
	} as UnifiedZone
}

const toggleZone = (zoneId: string) => {
	if (expandedZones.value.has(zoneId)) {
		expandedZones.value.delete(zoneId)
	} else {
		expandedZones.value.add(zoneId)
	}
}

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		const hasNewZones = Array.from(pendingChanges.value.keys()).some((id) => id.startsWith("temp-"))

		confirmAction.value = "close"
		confirmDialog.show({
			title: "確定要離開？",
			message: hasNewZones
				? "您有尚未儲存的變更（含新增區域）。確定要離開嗎？"
				: "您有尚未儲存的變更，確定要離開嗎？",
			details: hasNewZones
				? "未儲存的變更將會遺失，新增區域須儲存後才會寫入資料庫。"
				: "未儲存的變更將會遺失。",
			type: "warning",
		})
		return
	}

	closeDialog()
}

const closeDialog = () => {
	clearAllDrafts()
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

const addLocation = (zone: TZone, payload?: { viewCategory?: string }) => {
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

	if (
		(props.systemType === "drainage" ||
			props.systemType === "air_circulation" ||
			props.systemType === "power" ||
			props.systemType === "fire") &&
		payload &&
		payload.viewCategory !== undefined
	) {
		;(newLocation as { viewCategory?: string }).viewCategory = payload.viewCategory
	}
	const locations = [...adapter.getLocationsProperty(zone), newLocation]
	const updatedZone = adapter.setLocationsProperty(zone, locations)
	updateZone(updatedZone)
}

const handleDrainageRenameViewCategory = (
	zoneId: string,
	payload: { oldCategory: string; newCategory: string }
) => {
	if (
		props.systemType !== "drainage" &&
		props.systemType !== "air_circulation" &&
		props.systemType !== "power" &&
		props.systemType !== "fire"
	)
		return
	const zone = sortedZones.value.find((z) => getZoneId(z) === zoneId)
	if (!zone) return
	const oldTrim = payload.oldCategory.trim()
	const newCat = payload.newCategory.trim()
	const locations = [...adapter.getLocationsProperty(zone)] as SystemLocationType[]
	const next = locations.map((loc) => {
		const locAny = loc as { viewCategory?: string }
		const vc = (locAny.viewCategory ?? "").trim()
		if (vc === oldTrim) {
			return { ...loc, viewCategory: newCat } as SystemLocationType
		}
		return loc
	})
	const updatedZone = adapter.setLocationsProperty(zone, next)
	updateZone(updatedZone)
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
	locations.splice(index, 1)
	updateZone(adapter.setLocationsProperty(zone, locations))
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

const isNewZone = (zone: TZone): boolean => {
	const zoneId = getZoneId(zone)
	return Boolean(zoneId?.startsWith("temp-"))
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

const isFirstZoneInList = (zone: TZone) => {
	const id = getZoneId(zone)
	if (!id) return true
	const i = sortedZones.value.findIndex((z) => getZoneId(z) === id)
	return i <= 0
}

const isLastZoneInList = (zone: TZone) => {
	const id = getZoneId(zone)
	if (!id) return true
	const i = sortedZones.value.findIndex((z) => getZoneId(z) === id)
	return i < 0 || i >= sortedZones.value.length - 1
}

const moveZoneOrder = (zone: TZone, delta: number) => {
	const id = getZoneId(zone)
	if (!id) return
	const list = sortedZones.value
	const i = list.findIndex((z) => getZoneId(z) === id)
	const j = i + delta
	if (i < 0 || j < 0 || j >= list.length) return

	const orderedIds = list.map((z) => getZoneId(z)).filter(Boolean)
	if (orderedIds.length !== list.length) return
	;[orderedIds[i], orderedIds[j]] = [orderedIds[j]!, orderedIds[i]!]

	for (let idx = 0; idx < orderedIds.length; idx += 1) {
		const zoneId = orderedIds[idx]!
		const snap = snapshotZoneById(zoneId)
		if (!snap) continue
		pendingChanges.value.set(zoneId, { ...snap, sortOrder: idx } as TZone)
	}

	errorMessage.value = ""
}

const DRAINAGE_CATEGORY_BLOCK_EMPTY_KEY = "__empty__"

const reorderDrainageLocationsByCategoryBlock = (
	locs: SystemLocationType[],
	categoryKey: string,
	direction: "up" | "down"
): SystemLocationType[] | null => {
	const toKey = (loc: SystemLocationType) => {
		const raw = String((loc as { viewCategory?: string }).viewCategory ?? "").trim()
		return raw === "" ? DRAINAGE_CATEGORY_BLOCK_EMPTY_KEY : raw
	}
	const keyOrder: string[] = []
	const keySeen = new Set<string>()
	for (const loc of locs) {
		const k = toKey(loc)
		if (!keySeen.has(k)) {
			keySeen.add(k)
			keyOrder.push(k)
		}
	}
	const orderedKeys = keyOrder.filter((k) => k !== DRAINAGE_CATEGORY_BLOCK_EMPTY_KEY)
	if (keyOrder.includes(DRAINAGE_CATEGORY_BLOCK_EMPTY_KEY)) {
		orderedKeys.push(DRAINAGE_CATEGORY_BLOCK_EMPTY_KEY)
	}
	const idx = orderedKeys.indexOf(categoryKey)
	if (idx < 0) return null
	const j = direction === "up" ? idx - 1 : idx + 1
	if (j < 0 || j >= orderedKeys.length) return null
	const swapped = [...orderedKeys]
	;[swapped[idx], swapped[j]] = [swapped[j]!, swapped[idx]!]

	const buckets = new Map<string, SystemLocationType[]>()
	for (const k of swapped) {
		buckets.set(k, [])
	}
	for (const loc of locs) {
		const k = toKey(loc)
		if (!buckets.has(k)) buckets.set(k, [])
		buckets.get(k)!.push(loc)
	}
	const next: SystemLocationType[] = []
	for (const k of swapped) {
		next.push(...(buckets.get(k) ?? []))
	}
	return next
}

const handleReorderDrainageViewCategoryBlock = (
	zoneId: string,
	payload: { categoryKey: string; direction: "up" | "down" }
) => {
	if (
		props.systemType !== "drainage" &&
		props.systemType !== "air_circulation" &&
		props.systemType !== "power" &&
		props.systemType !== "fire"
	)
		return
	const zone = sortedZones.value.find((z) => getZoneId(z) === zoneId)
	if (!zone) return
	const locs = [...adapter.getLocationsProperty(zone)] as SystemLocationType[]
	const next = reorderDrainageLocationsByCategoryBlock(locs, payload.categoryKey, payload.direction)
	if (!next) return
	next.forEach((loc, idx) => {
		;(loc as unknown as { sortOrder?: number }).sortOrder = idx
	})
	const updatedZone = adapter.setLocationsProperty(zone, next)
	updateZone(updatedZone)
}

const handleReorderLocationRow = (
	zone: TZone,
	payload: { index: number; direction: "up" | "down" }
) => {
	const locs = [...adapter.getLocationsProperty(zone)] as SystemLocationType[]
	const { index, direction } = payload
	const j = direction === "up" ? index - 1 : index + 1
	if (j < 0 || j >= locs.length) return
	;[locs[index], locs[j]] = [locs[j]!, locs[index]!]
	locs.forEach((loc, idx) => {
		;(loc as unknown as { sortOrder?: number }).sortOrder = idx
	})
	const updatedZone = adapter.setLocationsProperty(zone, locs)
	updateZone(updatedZone)
}

const addNewZone = () => {
	const tempId = `temp-${Date.now()}-${Math.random()}`

	const newZone = {
		...adapter.createNewZone(""),
		id: tempId,
		sortOrder: maxZoneSortOrder() + 1,
	} as TZone

	// 僅加入待儲存表，不立即寫入資料庫
	pendingChanges.value.set(tempId, JSON.parse(JSON.stringify(newZone)) as TZone)

	// 自動展開新區域
	expandedZones.value.add(tempId)
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
			errorMessage.value = resolveFormApiError(
				failures[0]!.reason,
				"部分區域儲存失敗"
			)
			emit("saved")
		} else {
			if (props.systemType === "elevator" && isApiRequestTimeout(failures[0]!.reason)) {
				errorMessage.value =
					"請求逾時：平台資料可能已儲存，但梯控設備樓層參數可能尚未同步完成。請關閉後重新開啟確認，或稍後再次儲存。"
			} else {
				errorMessage.value = resolveFormApiError(failures[0]!.reason, "儲存區域失敗")
			}
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
