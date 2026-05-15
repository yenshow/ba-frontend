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
							<!-- 變更提示 -->
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
											<!-- 區域標題列（可點擊展開） -->
											<div
												class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
												@click="toggleZone(getZoneId(zone))"
											>
												<div class="flex flex-1 items-center gap-4">
													<!-- 展開/收起圖標 -->
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
													<!-- 區域名稱 -->
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
															title="區域上移"
															aria-label="此區域上移"
															@click.stop="moveZoneOrder(zone, -1)"
														>
															↑
														</button>
														<button
															type="button"
															class="btn-reorder-arrow"
															:disabled="isLastZoneInList(zone)"
															title="區域下移"
															aria-label="此區域下移"
															@click.stop="moveZoneOrder(zone, 1)"
														>
															↓
														</button>
													</div>
													<button
														type="button"
														class="p-2 text-rose-400 transition-colors hover:text-rose-300"
														@click.stop="handleDeleteZone(getZoneId(zone))"
														title="刪除區域"
													>
														<svg
															class="h-5 w-5"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
													</button>
												</div>
											</div>

											<!-- 展開內容 -->
											<Transition name="expand">
												<div
													v-if="expandedZones.has(getZoneId(zone))"
													class="space-y-3 border-t border-white/10 p-4"
												>
													<!-- 區域基本資訊 -->
													<ZoneFormFields
														:zone="getZoneForFormFields(zone)"
														:require-image-url="requireImageUrl"
														@update="handleZoneUpdate(getZoneId(zone), $event)"
													/>

													<!-- 系統特定的地點管理組件 -->
													<component
														:is="locationManagementComponent"
														v-bind="drainageLikeProps"
														:zone="zone"
														:devices="devices"
														:is-loading-devices="isLoadingDevices"
														:device-hint="deviceHint"
														:person-groups="personGroups"
														:doors="doors"
														:access-control-devices="accessControlDevices"
														:isapi-camera-devices="isapiCameraDevices"
														:reorderable-locations="true"
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
								<!-- 空狀態 -->
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無區域資料</p>
									<p class="mt-2 text-sm 2xl:text-base">點擊「新增區域」開始建立</p>
								</div>
							</Transition>
						</div>
					</div>

					<p v-if="errorMessage" class="pr-7 text-base text-rose-300 2xl:pr-8 2xl:text-lg">
						{{ errorMessage }}
					</p>
					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:class="{ 'cursor-not-allowed opacity-50': !hasUnsavedChanges }"
							:disabled="!hasUnsavedChanges"
							@click="saveAllChanges"
						>
							儲存變更
						</button>
						<button type="button" class="btn-primary" @click="addNewZone">新增區域</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<!-- 確認對話框 -->
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
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import ZoneFormFields from "./ZoneFormFields.vue"
import EnvironmentLocationManagement from "./LocationManagement/EnvironmentLocationManagement.vue"
import LightingLocationManagement from "./LocationManagement/LightingLocationManagement.vue"
import HvacLocationManagement from "./LocationManagement/HvacLocationManagement.vue"
import AirCirculationLocationManagement from "./LocationManagement/AirCirculationLocationManagement.vue"
import PeopleCountingLocationManagement from "./LocationManagement/PeopleCountingLocationManagement.vue"
import VehicleAccessLocationManagement from "./LocationManagement/VehicleAccessLocationManagement.vue"
import DrainageLocationManagement from "./LocationManagement/DrainageLocationManagement.vue"
import PowerLocationManagement from "./LocationManagement/PowerLocationManagement.vue"
import EmergencyRescueLocationManagement from "./LocationManagement/EmergencyRescueLocationManagement.vue"
import FireLocationManagement from "./LocationManagement/FireLocationManagement.vue"
import SmokeAlarmLocationManagement from "./LocationManagement/SmokeAlarmLocationManagement.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { nextTick, type Component } from "vue"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { removeLocationFromSystemOrDelete } from "~/composables/location/locationSystemActions"
import { buildDeleteLocationConfirmCopy } from "~/utils/confirmCopy"
import { getLocationUiKey } from "~/utils/locationUiId"
import { pickSortOrder, zoneSortOrderValue } from "~/utils/sortOrder"
import { getZoneUiKey } from "~/utils/locationUiId"

interface Props {
	modelValue: boolean
	zones: TZone[]
	systemType: SystemType
	requireImageUrl?: boolean
	deviceHint?: string
}

interface Emits {
	(e: "update:modelValue", value: boolean): void
	(e: "save", zone: TZone): void
	(e: "delete", zoneId: string): void
}

const props = withDefaults(defineProps<Props>(), {
	requireImageUrl: false,
	deviceHint: "請先在「設備管理」中建立設備",
})

const emit = defineEmits<Emits>()

// 系統適配器
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
} = useZoneDrafts<TZone, SystemLocationType>()
const errorMessage = ref("")

// 待刪除地點（使用 UI key，避免 reorder 後刪錯）
const pendingDeleteLocation = ref<{ zoneId: string; locationUiKey: string } | null>(null)

// 驗證
const { validateSystemZoneForSave } = useLocationValidationPipeline()

// 更新區域（加入待保存列表）
const updateZone = (zone: TZone) => {
	const zoneId = getZoneId(zone)
	if (!zoneId) return

	errorMessage.value = ""
	// 使用 JSON 深拷貝，避免 structuredClone 無法處理某些對象的問題
	setDraft(zoneId, JSON.parse(JSON.stringify(zone)) as TZone)
}

// 合併原始 zones 和待保存的變更
const mergedZones = computed(() => {
	return createMergedZones({ originalZones: props.zones, getZoneId })
})

// 排序區域（過濾掉沒有地點的區域，但保留新區域）
const sortedZones = computed(() => {
	return createSortedZones({
		mergedZones: mergedZones.value,
		getZoneId,
		getLocations: (z) => adapter.getLocationsProperty(z),
	})
})

// 確認對話框
const confirmDialog = useConfirmDialog()
const confirmAction = ref<"close" | "delete" | "deleteLocation">("close")

const { handleError } = useErrorHandler()

// 解包 ref 以便在模板中使用
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})

const confirmDialogConfig = computed(() => confirmDialog.config.value)

// 計算變更的欄位列表
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

// 變更摘要訊息
const changeSummary = computed(() => {
	return buildChangeSummary({ pendingChanges: pendingChanges.value })
})

// 設備管理
const deviceApi = useDeviceApi()
const devices = ref<any[]>([])
const isLoadingDevices = ref(false)

// 人員群組和門禁設備（僅用於人流統計系統）
const externalDataApi = useExternalDataApi()
const { enableYscpPeopleCounting, ensureLoaded: ensureModuleRegistryLoaded } =
	useModuleRegistry()
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

// 地點管理組件映射
const locationManagementComponentMap: Partial<Record<SystemType, Component>> = {
	lighting: LightingLocationManagement,
	hvac: HvacLocationManagement,
	air_circulation: AirCirculationLocationManagement,
	environment: EnvironmentLocationManagement,
	people_counting: PeopleCountingLocationManagement,
	vehicle_access: VehicleAccessLocationManagement,
	drainage: DrainageLocationManagement,
	power: PowerLocationManagement,
	fire: FireLocationManagement,
	emergency_rescue: EmergencyRescueLocationManagement,
	smoke_alarm: SmokeAlarmLocationManagement,
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

// 載入設備列表
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
			props.systemType === "smoke_alarm"
				? "controller"
				: "sensor"
		const result = await deviceApi.getDevices({
			type_code: deviceType,
			status: "active",
			limit: 100,
		})
		devices.value = result.devices
	} catch (error) {
		console.error("載入設備列表失敗:", error)
		errorMessage.value = "載入設備列表失敗"
	} finally {
		isLoadingDevices.value = false
	}
}

// 載入人員群組列表（僅用於人流統計系統）
const loadPersonGroups = async () => {
	if (props.systemType !== "people_counting") return

	try {
		const result = await externalDataApi.getPersonGroups({
			limit: 1000,
		})
		personGroups.value = result.data || []
	} catch (error) {
		console.error("載入人員群組列表失敗:", error)
		errorMessage.value = "載入人員群組列表失敗"
	}
}

// 載入門禁設備列表（僅用於人流統計系統）
const loadDoors = async () => {
	if (props.systemType !== "people_counting") return

	try {
		const result = await externalDataApi.getList("deviceaccess", "door", {
			limit: 1000,
		})
		doors.value = result.data || []
	} catch (error) {
		console.error("載入門禁設備列表失敗:", error)
		errorMessage.value = "載入門禁設備列表失敗"
	}
}

// 載入本系統門禁設備列表（僅用於人流統計系統「門禁設備」資料來源）
const loadAccessControlDevices = async () => {
	if (props.systemType !== "people_counting") return

	try {
		const result = await deviceApi.getDevices({
			type_code: "access_control",
			status: "active",
			limit: 100,
		})
		accessControlDevices.value = result.devices || []
	} catch (error) {
		console.error("載入門禁設備列表失敗:", error)
		accessControlDevices.value = []
	}
}

// 載入可用的 ISAPI 攝影機設備列表（人流攝影機）
// 規則：只取 active 的 camera，避免混入門禁/控制器等其他設備
const loadIsapiCameraDevices = async () => {
	if (props.systemType !== "people_counting") return
	try {
		const result = await deviceApi.getDevices({
			type_code: "camera",
			status: "active",
			limit: 200,
		})
		isapiCameraDevices.value = result.devices || []
	} catch {
		isapiCameraDevices.value = []
	}
}

// 當對話框打開時載入設備列表和相關資料
watch(
	() => props.modelValue,
	async newValue => {
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
			clearAllDrafts()
			errorMessage.value = ""
		}
	}
)

// 取得區域 ID
const getZoneId = (zone: TZone): string => {
	return getZoneUiKey(zone as any)
}

// 取得地點數量（用於顯示）
const getLocationsCount = (zone: TZone): number => {
	return adapter.getLocationsProperty(zone).length
}

// 取得地點標籤（用於顯示）
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
		vehicle_access: "地點",
	}
	return labelMap[props.systemType] || "地點"
}

// 取得區域用於表單欄位（轉換為 UnifiedZone）
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

// 切換區域展開/收起
const toggleZone = (zoneId: string) => {
	if (expandedZones.value.has(zoneId)) {
		expandedZones.value.delete(zoneId)
	} else {
		expandedZones.value.add(zoneId)
	}
}

// 處理關閉
const handleClose = () => {
	if (hasUnsavedChanges.value) {
		// ✅ 檢查是否有新增的區域（臨時 ID）
		const hasNewZones = Array.from(pendingChanges.value.keys()).some((id) => id.startsWith("temp-"))

		confirmAction.value = "close"
		confirmDialog.show({
			title: "確認關閉",
			message: hasNewZones
				? "您有未保存的變更，包含新增的區域。確定要關閉嗎？"
				: "您有未保存的變更，確定要關閉嗎？",
			details: hasNewZones
				? "未保存的變更將會遺失，新增的區域不會寫入資料庫。"
				: "未保存的變更將會遺失。",
			type: "warning",
		})
		return
	}

	closeDialog()
}

// 關閉對話框（清除狀態）
const closeDialog = () => {
	clearAllDrafts()
	errorMessage.value = ""
	emit("update:modelValue", false)
}

// 確認關閉
const handleConfirmClose = () => {
	closeDialog()
}

// 處理區域更新
const handleZoneUpdate = (zoneId: string, updates: Partial<UnifiedZone>) => {
	const zone = sortedZones.value.find((z) => getZoneId(z) === zoneId)
	if (!zone) return

	const updatedZone = { ...zone, ...updates } as TZone
	updateZone(updatedZone)
}

// 處理地點更新（從 LocationManagement 組件接收）
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

// 新增地點（從 LocationManagement 組件接收；排水可帶 viewCategory）
const addLocation = (zone: TZone, payload?: { viewCategory?: string }) => {
	const newLocation = adapter.createNewLocation() as SystemLocationType
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

// 刪除地點（僅從當前系統移除）
const removeLocation = (zoneId: string, locationIndex: number) => {
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

// 確認刪除地點
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
	if (resolvedIndex < 0 || resolvedIndex >= locations.length) {
		pendingDeleteLocation.value = null
		return
	}

	const target = locations[resolvedIndex] as any
	const targetId = target?.id ? String(target.id) : null

	if (targetId) {
		try {
			await removeLocationFromSystemOrDelete({ locationId: targetId, systemType: props.systemType })
		} catch (error) {
			handleError(error, "刪除地點失敗")
			pendingDeleteLocation.value = null
			return
		}
	}

	locations.splice(resolvedIndex, 1)
	const updatedZone = adapter.setLocationsProperty(zone, locations)
	updateZone(updatedZone)

	pendingDeleteLocation.value = null
}

// 是否為新增的區域（尚未儲存，以 temp- 開頭的 ID）
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

	/**
	 * 修正：舊資料常見多個 zone 的 sortOrder 都是 0（或相同值），僅互換兩列 sortOrder 會「看起來沒動」。
	 * 因此以「目前對話框可見順序」先正規化成 0..n-1，再交換相鄰兩列，並回寫所有列的 sortOrder，確保排序一定生效。
	 */
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

/** 與 DrainageLocationManagement 的 EMPTY_KEY 一致：未分類置於排序鍵尾 */
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

// 新增區域
const addNewZone = () => {
	const tempId = `temp-${Date.now()}-${Math.random()}`

	// 建立新區域：區域名稱預設為空白
	const newZone = {
		...adapter.createNewZone(""),
		id: tempId,
		sortOrder: maxZoneSortOrder() + 1,
	} as TZone

	// ✅ 只加入待保存列表，不立即寫入資料庫
	// 使用 JSON 深拷貝，避免 structuredClone 無法處理某些對象的問題
	pendingChanges.value.set(tempId, JSON.parse(JSON.stringify(newZone)) as TZone)

	// ✅ 自動展開新區域
	expandedZones.value.add(tempId)
}

/** 儲存前讓對話框內仍聚焦的表單控制項 blur，觸發子元件 emit，避免 pending 仍是舊值 */
const flushFocusedFormControlInDialog = async () => {
	if (typeof document === "undefined") return
	const raw = document.activeElement
	if (!raw || !(raw instanceof HTMLElement)) return
	if (!raw.closest(".dialog-panel-bg")) return
	const tag = raw.tagName
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
		raw.blur()
		await nextTick()
		await nextTick()
	}
}

// 儲存所有變更
const saveAllChanges = async () => {
	if (pendingChanges.value.size === 0) return

	await flushFocusedFormControlInDialog()

	errorMessage.value = ""
	const zoneAny = (zone: TZone) => zone as any

	// 驗證所有待保存的區域
	for (const zone of pendingChanges.value.values()) {
		const locations = adapter.getLocationsProperty(zone)
		const result = validateSystemZoneForSave({
			systemType: props.systemType,
			requireImageUrl: props.requireImageUrl,
			zone,
			locations,
		})
		if (!result.isValid) {
			errorMessage.value = result.errors.join("\n")
			return
		}
	}

	// 複製待保存的區域列表（保留 zoneId；不要先清空，避免中途失敗丟失）
	const zonesToSave = Array.from(pendingChanges.value.entries())

	// 逐一儲存
	for (const [zoneId, zone] of zonesToSave) {
		const cleanedZone = adapter.filterEmptyLocations(zone as TZone)
		const isNewZone = zoneAny(zone).id?.startsWith("temp-")

		if (isNewZone) {
			// 新增區域：移除臨時 ID
			const { id, ...zoneWithoutId } = zoneAny(cleanedZone)
			emit("save", zoneWithoutId as TZone)
		} else {
			// 更新區域：保留 ID
			emit("save", cleanedZone)
		}
	}

	// 全部成功才清空 pendingChanges
	clearAllDrafts()
}

// 刪除確認處理（使用 ref 追蹤待刪除的 zoneId）
const pendingDeleteZoneId = ref<string | null>(null)

// 刪除區域
const handleDeleteZone = (zoneId: string) => {
	pendingDeleteZoneId.value = zoneId
	confirmAction.value = "delete"
	confirmDialog.show({
		title: "確認刪除",
		message: "確定要刪除此區域嗎？",
		details: "此操作將刪除該區域的所有地點資料，且無法復原。",
		type: "danger",
	})
}

// 確認刪除
const handleConfirmDelete = () => {
	if (pendingDeleteZoneId.value) {
		emit("delete", pendingDeleteZoneId.value)
		deleteDraft(pendingDeleteZoneId.value)
		pendingDeleteZoneId.value = null
	}
}
</script>

<style scoped>
/* 展開動畫 */
.expand-enter-active,
.expand-leave-active {
	transition: all 0.3s ease;
	overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
	opacity: 0;
	max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
	opacity: 1;
	max-height: 1000px;
}

/* 淡入淡出動畫 */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
