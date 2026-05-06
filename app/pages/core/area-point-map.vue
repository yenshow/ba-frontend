<template>
	<div>
		<!-- 主要內容區域：左右排版 -->
		<div class="flex justify-center gap-6 2xl:gap-8">
			<!-- 左側面板：區域選擇與編輯功能 -->
			<section class="flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="flex overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8"
				>
					<!-- 區域選擇 -->
					<div class="relative z-10 flex flex-col justify-between py-4 text-center text-white">
						<div class="space-y-4">
							<!-- 區域顯示 -->
							<div class="py-4">
								<span
									class="inline-flex text-nowrap border-b-2 border-white/70 pb-1 text-4xl tracking-widest 2xl:text-5xl"
								>
									{{ selectedZoneName }}
								</span>
							</div>
							<!-- 區域管理按鈕（依權限 system.area_point_map 或 admin） -->
							<Transition name="fade-in">
								<button
									v-if="
										!isInitialLoading && (isAdmin || hasPermission(LOCATION_MANAGEMENT_PERMISSION_CODE))
									"
									type="button"
									@click="handleOpenZoneDialog"
									:class="[
										'whitespace-nowrap rounded-2xl p-3 text-base text-white transition-all 2xl:text-lg',
										'border-2 border-white/30 bg-transparent hover:bg-white/10',
									]"
									title="區域管理"
								>
									區域管理
								</button>
							</Transition>
							<!-- 系統列表（篩選該樓層的系統顯示） -->
							<Transition name="fade-in">
								<div
									v-if="selectedZoneData && !isInitialLoading"
									class="absolute bottom-1/4 left-0 mt-6 space-y-2"
								>
									<template v-if="zoneSystemTypes.length > 0">
										<button
											v-for="systemType in zoneSystemTypes"
											:key="systemType"
											type="button"
											@click="handleSystemTypeToggle(systemType)"
											:class="[
												'w-full rounded-xl border-2 p-3 text-center text-base text-white transition-all 2xl:text-lg',
												selectedSystemType === systemType
													? 'border-white bg-white/20'
													: 'border-white/20 bg-white/5 hover:bg-white/10',
											]"
										>
											<div>
												{{ getLocationTypeLabel(systemType) }}
											</div>
										</button>
									</template>
									<div
										v-else
										class="rounded-xl border-2 border-white/30 bg-white/5 p-2 text-center text-xs text-white/60 2xl:text-base"
									>
										無系統
									</div>
								</div>
							</Transition>
						</div>
					</div>

					<!-- 中央區域平面圖 -->
					<div class="map-location-dots relative h-[600px] w-full p-4 2xl:h-[780px]">
						<NuxtImg
							v-if="zonePlanImage"
							:src="zonePlanImage"
							alt="區域平面圖"
							class="image-blur-load pointer-events-none h-full w-full object-contain"
							:class="{ 'image-loaded': isZonePlanLoaded }"
							width="auto"
							height="full"
							@load="isZonePlanLoaded = true"
						/>
						<div v-else class="flex h-full w-full items-center justify-center text-white/50">
							<span>尚未設定區域平面圖</span>
						</div>
						<!-- 地點點位（只顯示已定位的） -->
						<template v-for="location in currentZoneLocations" :key="location.id">
							<div class="location-dot-wrapper" :style="getLocationDotStyle(location)">
								<div
									class="location-dot"
									:class="{ 'is-active': selectedLocation === location.id }"
									role="button"
									tabindex="0"
									:data-status="dotStatusForLocation(location)"
									:data-flash="flashModeForLocation(location)"
									:title="tooltipLabelForLocation(location)"
									:aria-label="tooltipLabelForLocation(location)"
									@click.stop="selectLocation(location)"
								></div>
								<CategoryTooltip
									:show="true"
									:category-name="location.name"
									:is-normal="dotStatusForLocation(location) === 'normal'"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側總覽面板 -->
			<aside class="show-scrollbar flex-[0.8] overflow-y-auto 2xl:flex-[0.7]">
				<div
					class="rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8"
					:style="leftSectionHeight ? { minHeight: leftSectionHeight + 'px' } : undefined"
				>
					<!-- 總覽標題 -->
					<h2
						class="mb-4 text-center text-2xl font-semibold tracking-[12px] text-white 2xl:text-3xl"
					>
						總覽
					</h2>

					<!-- 載入狀態 -->
					<div v-if="isLoading" class="flex min-h-[200px] items-center justify-center">
						<div class="text-center text-white/60">
							<p class="text-base 2xl:text-lg">載入中...</p>
						</div>
					</div>

					<!-- 樓層列表 -->
					<div v-else-if="zones.length > 0" class="space-y-2">
						<button
							v-for="zone in sortedZones"
							:key="zone.id"
							type="button"
							class="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-left transition-all"
							:class="{
								'border-white/40 bg-white/20': selectedZone === zone.id,
							}"
							@click="handleZoneSelected(zone.id)"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-12 min-w-[60px] items-center justify-center rounded-lg border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30"
								>
									<span class="text-base font-bold text-white 2xl:text-lg">
										{{ zone.name }}
									</span>
								</div>
								<div class="flex-1">
									<div class="text-base text-white/80 2xl:text-lg">
										<template v-if="getZoneSystemTypes(zone).length > 0">
											{{
												getZoneSystemTypes(zone)
													.map((type) => getLocationTypeLabel(type))
													.join("、")
											}}
										</template>
										<span v-else class="text-white/50">無系統</span>
									</div>
								</div>
							</div>
						</button>
					</div>

					<!-- 空狀態 -->
					<div v-else class="flex min-h-[200px] items-center justify-center">
						<div class="text-center text-white/60">
							<p class="text-base 2xl:text-lg">尚無區域資料</p>
						</div>
					</div>
				</div>
			</aside>
		</div>
	</div>

	<!-- 地點管理對話框（有篩選系統時傳入 systemType，刪除地點僅從該系統移除） -->
	<LocationManagementDialog
		v-model="showLocationManagementDialog"
		:zone="selectedZoneData"
		:system-type="selectedSystemType ?? undefined"
		mode="delete-only"
		:read-only="true"
		:allow-delete="isAdmin"
		@delete="handleDeleteUnifiedZone"
	/>
</template>

<script setup lang="ts">
import type { UnifiedZone, UnifiedLocation, SystemType } from "~/types/location"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { useAuth } from "~/composables/core/useAuth"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import {
	getLocationStyleBySystem,
	hasAnySystemCoordinates,
	hasCoordinatesForSystem,
} from "~/utils/locationAdapter"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import LocationManagementDialog from "~/components/location/LocationManagementDialog.vue"
import CategoryTooltip from "~/components/common/CategoryTooltip.vue"
import type { LightingZone } from "~/types/lighting"
import type { DrainageZone } from "~/types/drainage"
import type { PowerZone, PowerStatusItem } from "~/types/power"
import type { HvacZone } from "~/types/hvac"
import type { FireZone } from "~/types/fire"
import { useLightingApi } from "~/composables/systems/lighting/useLightingApi"
import { useDrainageApi } from "~/composables/systems/drainage/useDrainageApi"
import { usePowerApi } from "~/composables/systems/power/usePowerApi"
import { useHvacApi } from "~/composables/systems/hvac/useHvacApi"
import { useFireApi } from "~/composables/systems/fire/useFireApi"
import { useLightingModbusIntegration } from "~/composables/systems/lighting/useLightingModbusIntegration"
import { useDrainageModbusIntegration } from "~/composables/systems/drainage/useDrainageModbusIntegration"
import { usePowerModbusIntegration } from "~/composables/systems/power/usePowerModbusIntegration"
import { useHvacModbusIntegration } from "~/composables/systems/hvac/useHvacModbusIntegration"
import { useFireModbusIntegration } from "~/composables/systems/fire/useFireModbusIntegration"
import { getSystemTypeLabel } from "~/types/location"
import { getLocationUiKey } from "~/utils/locationUiId"
import { normalizeSystemUiStatus, type MapDotStatus, type SystemUiStatus } from "~/utils/monitoringStatus"

definePageMeta({
	layout: "default",
})

const { isAdmin, hasPermission } = useAuth()
const locationApi = useLocationApi()
const { handleError } = useErrorHandler()
const { handleDeleteZone: baseHandleDeleteZone, sortZones } =
	useZoneManagement<UnifiedLocation, UnifiedZone>()

const LOCATION_MANAGEMENT_PERMISSION_CODE = "system.area_point_map"

// 左側區域參考與高度（用於使右側面板同高）
const leftSectionRef = ref<HTMLElement | null>(null)
const leftSectionHeight = ref<number | null>(null)

// ResizeObserver 監聽左側高度
let leftSectionResizeObserver: ResizeObserver | null = null

const updateLeftSectionHeight = () => {
	if (!leftSectionRef.value) return
	leftSectionHeight.value = leftSectionRef.value.offsetHeight
}

const initLeftSectionObserver = () => {
	if (typeof ResizeObserver === "undefined" || !leftSectionRef.value) return
	leftSectionResizeObserver = new ResizeObserver((entries) => {
		if (entries.length) {
			leftSectionHeight.value = entries[0].contentRect.height
		}
	})
	leftSectionResizeObserver.observe(leftSectionRef.value)
}

// 區域資料
const zones = ref<UnifiedZone[]>([])
const isLoading = ref(false)
const isInitialLoading = ref(true)

// 選中的區域與地點
const selectedZone = ref<string>("")
const selectedLocation = ref<string>("")
// 選中的系統類型（用於篩選）
const selectedSystemType = ref<SystemType | null>(null)

// 選系統時才載入對應系統的狀態（避免總覽時打爆 API/輪詢）
const lightingApi = useLightingApi()
const drainageApi = useDrainageApi()
const fireApi = useFireApi()
const powerApi = usePowerApi()
const hvacApi = useHvacApi()

const lightingZones = ref<LightingZone[]>([])
const drainageZones = ref<DrainageZone[]>([])
const fireZones = ref<FireZone[]>([])
const powerZones = ref<PowerZone[]>([])
const hvacZones = ref<HvacZone[]>([])

const lightingSelectedZoneKey = computed(() => selectedZone.value)
const {
	locationStatuses: lightingLocationStatuses,
	initializeLocationStatuses: initializeLightingStatuses,
	preloadDeviceInfos: preloadLightingDevices,
	loadAllLocationStatuses: loadAllLightingStatuses,
	startAutoRefresh: startLightingAutoRefresh,
	stopAutoRefresh: stopLightingAutoRefresh,
	handleVisibilityChange: handleLightingVisibilityChange,
} = useLightingModbusIntegration(lightingZones, lightingSelectedZoneKey)

const {
	statusItems: drainageStatusItems,
	preloadDeviceInfos: preloadDrainageDevices,
	loadStatusSnapshot: loadDrainageSnapshot,
	startAutoRefresh: startDrainageAutoRefresh,
	stopAutoRefresh: stopDrainageAutoRefresh,
	handleVisibilityChange: handleDrainageVisibilityChange,
} = useDrainageModbusIntegration(drainageZones)

const {
	statusItems: fireStatusItems,
	preloadDeviceInfos: preloadFireDevices,
	loadStatusSnapshot: loadFireSnapshot,
	startAutoRefresh: startFireAutoRefresh,
	stopAutoRefresh: stopFireAutoRefresh,
	handleVisibilityChange: handleFireVisibilityChange,
} = useFireModbusIntegration(fireZones)

const {
	statusItems: powerStatusItems,
	preloadDeviceInfos: preloadPowerDevices,
	loadStatusSnapshot: loadPowerSnapshot,
	startAutoRefresh: startPowerAutoRefresh,
	stopAutoRefresh: stopPowerAutoRefresh,
	handleVisibilityChange: handlePowerVisibilityChange,
} = usePowerModbusIntegration(powerZones)

const hvacSelectedZoneKey = computed(() => selectedZone.value)
const {
	locationStatuses: hvacLocationStatuses,
	initializeLocationStatuses: initializeHvacStatuses,
	preloadDeviceInfos: preloadHvacDevices,
	loadAllLocationStatuses: loadAllHvacStatuses,
	startAutoRefresh: startHvacAutoRefresh,
	stopAutoRefresh: stopHvacAutoRefresh,
	handleVisibilityChange: handleHvacVisibilityChange,
} = useHvacModbusIntegration(hvacZones, hvacSelectedZoneKey)

// 其他狀態
const isZonePlanLoaded = ref(false)
const showLocationManagementDialog = ref(false)

// 選中的區域資料
const selectedZoneData = computed(() => {
	if (!selectedZone.value) return undefined
	return zones.value.find((zone) => zone.id === selectedZone.value)
})

// 選中的區域名稱
const selectedZoneName = computed(() => {
	return selectedZoneData.value?.name || ""
})

// 提取樓層的所有系統類型（共用函數）
const extractSystemTypes = (locations: UnifiedLocation[]): SystemType[] => {
	if (!locations || locations.length === 0) return []

	const systemTypes = new Set<SystemType>()
	locations.forEach((location) => {
		location.systems?.forEach((system) => {
			systemTypes.add(system.systemType)
		})
	})
	return Array.from(systemTypes)
}

// 選中區域的所有系統類型（去重）
const zoneSystemTypes = computed(() => {
	if (!selectedZoneData.value?.locations) return []
	return extractSystemTypes(selectedZoneData.value.locations)
})

// 取得指定區域的所有系統類型（用於總覽顯示）
const getZoneSystemTypes = (zone: UnifiedZone): SystemType[] => {
	if (!zone?.locations) return []
	return extractSystemTypes(zone.locations)
}

// 排序的區域列表
const sortedZones = computed(() => sortZones(zones.value))

// 區域示意圖
const zonePlanImage = computed(() => selectedZoneData.value?.imageUrl)

type FlashMode = "none" | "slow" | "fast"

const dotSeverity = (s: MapDotStatus): 0 | 1 | 2 => {
	if (s === "alarm") return 2
	if (s === "warning") return 1
	return 0
}

const buildUiStatusMap = (items: unknown[]): Map<string, string> => {
	const m = new Map<string, string>()
	for (const it of items) {
		const locationId = String((it as any).locationId || "")
		if (!locationId) continue
		m.set(locationId, String((it as any).uiStatus || "unknown"))
	}
	return m
}

const drainageUiStatusByLocationId = computed(() => buildUiStatusMap(drainageStatusItems.value || []))
const fireUiStatusByLocationId = computed(() => buildUiStatusMap(fireStatusItems.value || []))

const powerUiStatusByLocationId = computed(() => {
	const m = new Map<string, PowerStatusItem["uiStatus"]>()
	for (const it of powerStatusItems.value || []) {
		const locationId = String((it as any).locationId || "")
		if (!locationId) continue
		m.set(locationId, String((it as any).uiStatus || "unknown") as any)
	}
	return m
})

const lightingHealthByLocationDbId = computed(() => {
	const m = new Map<string, { status?: SystemUiStatus }>()
	for (const zone of lightingZones.value || []) {
		for (let i = 0; i < (zone.locations || []).length; i += 1) {
			const loc = zone.locations[i] as any
			const dbId = loc?.id ? String(loc.id) : ""
			if (!dbId) continue
			// lighting integration 的 key 是 UI key（含 index）；以相同算法取回 status，再映射到 dbId
			const uiKey = getLocationUiKey({ zone, location: loc, locationIndex: i })
			const s = lightingLocationStatuses.value[uiKey]?.status
			m.set(dbId, { status: s })
		}
	}
	return m
})

const hvacUiStatusByLocationDbId = computed(() => {
	const m = new Map<string, { uiStatus?: SystemUiStatus; temperatureC?: number | null }>()
	for (const zone of hvacZones.value || []) {
		for (let i = 0; i < (zone.locations || []).length; i += 1) {
			const loc = (zone.locations || [])[i] as any
			const dbId = loc?.id ? String(loc.id) : ""
			if (!dbId) continue
			const uiKey = getLocationUiKey({ zone: zone as any, location: loc as any, locationIndex: i })
			const s = hvacLocationStatuses.value[uiKey]
			if (!s) continue
			m.set(dbId, { uiStatus: s.uiStatus, temperatureC: (s as any).temperatureC ?? null })
		}
	}
	return m
})

const uiStatusToDot = (s: string): MapDotStatus => normalizeSystemUiStatus(s || "unknown")

const uiStatusToFlash = (s: string): FlashMode => {
	const t = String(s || "unknown")
	if (t === "normal") return "none"
	if (t === "alarm") return "fast"
	return "slow"
}

const locationHasSystemType = (location: UnifiedLocation, systemType: SystemType): boolean => {
	const systems = location.systems || []
	return systems.some((s) => s?.systemType === systemType)
}

const getModbusUiStatus = (locationId: string): string | null => {
	if (selectedSystemType.value === "drainage") {
		return drainageUiStatusByLocationId.value.get(locationId) ?? "unknown"
	}
	if (selectedSystemType.value === "fire") return fireUiStatusByLocationId.value.get(locationId) ?? "unknown"
	if (selectedSystemType.value === "power") return powerUiStatusByLocationId.value.get(locationId) ?? "unknown"
	return null
}

const dotStatusForLocation = (location: UnifiedLocation): MapDotStatus => {
	const id = String(location.id || "")

	if (!selectedSystemType.value) {
		let best: MapDotStatus = "normal"

		if (locationHasSystemType(location, "drainage")) {
			const s = uiStatusToDot(drainageUiStatusByLocationId.value.get(id) ?? "unknown")
			if (dotSeverity(s) > dotSeverity(best)) best = s
		}

		if (locationHasSystemType(location, "fire")) {
			const s = uiStatusToDot(fireUiStatusByLocationId.value.get(id) ?? "unknown")
			if (dotSeverity(s) > dotSeverity(best)) best = s
		}

		if (locationHasSystemType(location, "lighting")) {
			const lighting = lightingHealthByLocationDbId.value.get(id)?.status
			if (lighting === "normal") {
				// no-op
			} else {
				// 照明對外僅兩態：normal / warning（warning、error、缺值都算異常）
				best = dotSeverity(best) >= 1 ? best : "warning"
			}
		}

		if (locationHasSystemType(location, "hvac")) {
			const hvac = hvacUiStatusByLocationDbId.value.get(id)?.uiStatus
			if (hvac !== "normal") {
				best = dotSeverity(best) >= 1 ? best : "warning"
			}
		}

		if (locationHasSystemType(location, "power")) {
			const s = uiStatusToDot(powerUiStatusByLocationId.value.get(id) ?? "unknown")
			if (dotSeverity(s) > dotSeverity(best)) best = s
		}

		return best
	}

	const modbusStatus = getModbusUiStatus(id)
	if (modbusStatus !== null) return uiStatusToDot(modbusStatus)

	if (selectedSystemType.value === "lighting") {
		const s = lightingHealthByLocationDbId.value.get(id)?.status
		if (s === "normal") return "normal"
		// 照明對外僅兩態：normal / warning（warning、error、缺值都算異常）
		return "warning"
	}
	if (selectedSystemType.value === "hvac") {
		const s = hvacUiStatusByLocationDbId.value.get(id)?.uiStatus
		return s === "normal" ? "normal" : "warning"
	}
	return "normal"
}

const flashModeForLocation = (location: UnifiedLocation): FlashMode => {
	const id = String(location.id || "")

	if (!selectedSystemType.value) {
		const s = dotStatusForLocation(location)
		if (s === "alarm") return "fast"
		if (s === "warning") return "slow"
		return "none"
	}

	const modbusStatus = getModbusUiStatus(id)
	if (modbusStatus !== null) return uiStatusToFlash(modbusStatus)

	if (selectedSystemType.value === "lighting") {
		const s = lightingHealthByLocationDbId.value.get(id)?.status
		// 照明監控僅兩態：正常不閃，其餘慢閃（與 lighting StatusCenter 一致）
		if (s === "normal") return "none"
		return "slow"
	}
	if (selectedSystemType.value === "hvac") {
		const s = hvacUiStatusByLocationDbId.value.get(id)?.uiStatus
		if (s === "normal") return "none"
		return "slow"
	}
	return "none"
}

const tooltipLabelForLocation = (location: UnifiedLocation): string => {
	const status = dotStatusForLocation(location)
	const label = status === "normal" ? "正常" : status === "alarm" ? "警報" : "異常"
	if (selectedSystemType.value) return `${location.name}：${label}`

	const id = String(location.id || "")
	const parts: string[] = []
	const drainageUi = drainageUiStatusByLocationId.value.get(id)
	if (drainageUi && drainageUi !== "unknown" && drainageUi !== "normal") {
		parts.push(`衛生排水：${uiStatusToDot(drainageUi) === "alarm" ? "警報" : "異常"}`)
	}
	const fireUi = fireUiStatusByLocationId.value.get(id)
	if (fireUi && fireUi !== "unknown" && fireUi !== "normal") {
		parts.push(`消防：${uiStatusToDot(fireUi) === "alarm" ? "警報" : "異常"}`)
	}
	const lighting = lightingHealthByLocationDbId.value.get(id)?.status
	if (lighting === "warning") parts.push("照明：異常")
	if (lighting === "alarm") parts.push("照明：警報")

	const hvac = hvacUiStatusByLocationDbId.value.get(id)
	if (hvac?.uiStatus && hvac.uiStatus !== "normal") {
		const temp =
			hvac.temperatureC != null && Number.isFinite(hvac.temperatureC)
				? `（${Math.round(hvac.temperatureC)}°C）`
				: ""
		parts.push(`空調：異常${temp}`)
	}

	const powerUi = powerUiStatusByLocationId.value.get(id)
	if (powerUi && powerUi !== "normal") {
		parts.push(`電力：${uiStatusToDot(powerUi) === "alarm" ? "警報" : "異常"}`)
	}

	return parts.length ? `${location.name}：${label}\n${parts.join("、")}` : `${location.name}：${label}`
}

const currentZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	if (!zone) return []

	return (zone.locations || []).filter((loc) => {
		if (selectedSystemType.value) return hasCoordinatesForSystem(loc, selectedSystemType.value)
		return hasAnySystemCoordinates(loc)
	})
})

const getLocationDotStyle = (location: UnifiedLocation): Record<string, string> => {
	if (!selectedSystemType.value) {
		// 未選系統：依序找第一個有座標的系統作為顯示座標
		for (const s of location.systems || []) {
			const style = getLocationStyleBySystem(location, s.systemType)
			if ("left" in style && "top" in style) return style as Record<string, string>
		}
		return {}
	}
	return getLocationStyleBySystem(location, selectedSystemType.value) as Record<string, string>
}

const firstZoneByDisplayOrder = (zs: UnifiedZone[]) => sortZones(zs)[0] ?? null

// 載入區域列表
const loadZones = async () => {
	isLoading.value = true
	try {
		const response = await locationApi.getZones()
		zones.value = response.zones

		// 若尚未選區域，依 sort_order／名稱慣例選排序後第一個
		if (!selectedZone.value && zones.value.length > 0) {
			const first = firstZoneByDisplayOrder(zones.value)
			if (first?.id) selectedZone.value = first.id
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoading.value = false
	}
}

const handleDeleteUnifiedZone = async (zoneId: string) => {
	if (!isAdmin.value) return

	await baseHandleDeleteZone(zoneId, zones, locationApi.deleteZone, {
		selectedZoneRef: selectedZone,
		selectedLocationRef: selectedLocation,
		findEarliestZone: firstZoneByDisplayOrder,
		getLocationId: (loc) => String(loc.id || ""),
		reloadZones: async () => {
			await loadZones()
			showLocationManagementDialog.value = false
		},
	})
}

const handleZoneSelected = (zoneId: string) => {
	selectedZone.value = zoneId
	selectedLocation.value = ""
	// 切換區域時重置系統篩選
	selectedSystemType.value = null
}

const handleSystemTypeToggle = (systemType: SystemType) => {
	selectedSystemType.value = selectedSystemType.value === systemType ? null : systemType
}

const selectLocation = (location: UnifiedLocation) => {
	selectedLocation.value = location.id
}

const stopAllSystemAutoRefresh = () => {
	stopLightingAutoRefresh()
	stopDrainageAutoRefresh()
	stopFireAutoRefresh()
	stopPowerAutoRefresh()
	stopHvacAutoRefresh()
}

const hasLoadedLightingSnapshot = ref(false)
const hasLoadedDrainageSnapshot = ref(false)
const hasLoadedFireSnapshot = ref(false)
const hasLoadedPowerSnapshot = ref(false)
const hasLoadedHvacSnapshot = ref(false)

const overviewRefreshIntervalId = ref<ReturnType<typeof setInterval> | null>(null)

const stopOverviewAutoRefresh = () => {
	if (!overviewRefreshIntervalId.value) return
	clearInterval(overviewRefreshIntervalId.value)
	overviewRefreshIntervalId.value = null
}

const refreshOverviewStatuses = async () => {
	// 未選系統也要維持狀態更新，避免與各系統頁資訊不一致
	if (selectedSystemType.value) return

	if (!hasLoadedLightingSnapshot.value) {
		await loadLightingStatusSnapshot({ autoRefresh: false })
	} else {
		await loadAllLightingStatuses({ loadAllZones: true })
	}

	if (!hasLoadedDrainageSnapshot.value) {
		await loadDrainageStatusSnapshot({ autoRefresh: false })
	} else {
		await loadDrainageSnapshot()
	}

	if (!hasLoadedFireSnapshot.value) {
		await loadFireStatusSnapshot({ autoRefresh: false })
	} else {
		await loadFireSnapshot()
	}

	if (!hasLoadedPowerSnapshot.value) {
		await loadPowerStatusSnapshot({ autoRefresh: false })
	} else {
		await loadPowerSnapshot()
	}

	if (!hasLoadedHvacSnapshot.value) {
		await loadHvacStatusSnapshot({ autoRefresh: false })
	} else {
		await loadAllHvacStatuses({ loadAllZones: true })
	}
}

const startOverviewAutoRefresh = () => {
	stopOverviewAutoRefresh()
	if (selectedSystemType.value) return
	overviewRefreshIntervalId.value = setInterval(() => {
		if (typeof document === "undefined") return
		if (document.visibilityState !== "visible") return
		void refreshOverviewStatuses()
	}, 15000)
}

const loadLightingStatusSnapshot = async (options: { autoRefresh: boolean }) => {
	const result = await lightingApi.getZones()
	lightingZones.value = result.zones || []
	initializeLightingStatuses()
	await preloadLightingDevices()
	await loadAllLightingStatuses({ loadAllZones: true })
	hasLoadedLightingSnapshot.value = true
	if (options.autoRefresh) startLightingAutoRefresh()
}

const loadDrainageStatusSnapshot = async (options: { autoRefresh: boolean }) => {
	const result = await drainageApi.getZones()
	drainageZones.value = result.zones || []
	await preloadDrainageDevices()
	await loadDrainageSnapshot()
	hasLoadedDrainageSnapshot.value = true
	if (options.autoRefresh) startDrainageAutoRefresh()
}

const loadFireStatusSnapshot = async (options: { autoRefresh: boolean }) => {
	const result = await fireApi.getZones()
	fireZones.value = result.zones || []
	await preloadFireDevices()
	await loadFireSnapshot()
	hasLoadedFireSnapshot.value = true
	if (options.autoRefresh) startFireAutoRefresh()
}

const loadPowerStatusSnapshot = async (options: { autoRefresh: boolean }) => {
	const result = await powerApi.getZones()
	powerZones.value = result.zones || []
	await preloadPowerDevices()
	await loadPowerSnapshot()
	hasLoadedPowerSnapshot.value = true
	if (options.autoRefresh) startPowerAutoRefresh()
}

const loadHvacStatusSnapshot = async (options: { autoRefresh: boolean }) => {
	const result = await hvacApi.getZones()
	hvacZones.value = result.zones || []
	initializeHvacStatuses()
	await preloadHvacDevices()
	await loadAllHvacStatuses({ loadAllZones: true })
	hasLoadedHvacSnapshot.value = true
	if (options.autoRefresh) startHvacAutoRefresh()
}

const ensureAllStatusSnapshotsLoaded = async () => {
	if (!hasLoadedLightingSnapshot.value) await loadLightingStatusSnapshot({ autoRefresh: false })
	if (!hasLoadedDrainageSnapshot.value) await loadDrainageStatusSnapshot({ autoRefresh: false })
	if (!hasLoadedFireSnapshot.value) await loadFireStatusSnapshot({ autoRefresh: false })
	if (!hasLoadedPowerSnapshot.value) await loadPowerStatusSnapshot({ autoRefresh: false })
	if (!hasLoadedHvacSnapshot.value) await loadHvacStatusSnapshot({ autoRefresh: false })
}

watch(
	() => selectedSystemType.value,
	async (next) => {
		stopOverviewAutoRefresh()
		stopAllSystemAutoRefresh()

		if (!next) {
			await ensureAllStatusSnapshotsLoaded()
			startOverviewAutoRefresh()
			return
		}
		if (next === "lighting") {
			await loadLightingStatusSnapshot({ autoRefresh: true })
			return
		}
		if (next === "drainage") {
			await loadDrainageStatusSnapshot({ autoRefresh: true })
			return
		}
		if (next === "fire") {
			await loadFireStatusSnapshot({ autoRefresh: true })
			return
		}
		if (next === "power") {
			await loadPowerStatusSnapshot({ autoRefresh: true })
			return
		}
		if (next === "hvac") {
			await loadHvacStatusSnapshot({ autoRefresh: true })
			return
		}
	},
	{ immediate: true }
)

const getLocationTypeLabel = getSystemTypeLabel

// 處理打開區域管理對話框
const handleOpenZoneDialog = async () => {
	if (zones.value.length === 0) {
		await loadZones()
	}
	showLocationManagementDialog.value = true
}

// 監聽頁面可見性變化，當頁面重新可見時重新載入資料
const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") {
		// 頁面可見時，重新載入區域資料以確保資料同步
		void loadZones()
		// 未選系統：補一次快照，避免點位狀態與點擊後不一致
		if (!selectedSystemType.value) {
			void ensureAllStatusSnapshotsLoaded()
			startOverviewAutoRefresh()
		}
		// 若當前有選系統，讓該系統的輪詢也補一輪
		if (selectedSystemType.value === "lighting") handleLightingVisibilityChange()
		if (selectedSystemType.value === "drainage") handleDrainageVisibilityChange()
		if (selectedSystemType.value === "fire") handleFireVisibilityChange()
		if (selectedSystemType.value === "power") handlePowerVisibilityChange()
		if (selectedSystemType.value === "hvac") handleHvacVisibilityChange()
	}
}

// 初始化載入
onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver()

	try {
		// 載入區域列表
		await loadZones()
		// 未選系統預設也要能顯示異常/警報：先取一次快照（不輪詢）
		await ensureAllStatusSnapshotsLoaded()
		startOverviewAutoRefresh()

		// 同步右側高度
		await nextTick()
		updateLeftSectionHeight()
	} catch (error) {
		handleError(error, "初始化失敗")
	} finally {
		// 初始載入完成，顯示按鈕和系統列表（使用淡入動畫）
		isInitialLoading.value = false
	}

	// 監聽頁面可見性變化
	document.addEventListener("visibilitychange", handleVisibilityChange)
})

// 清理
onBeforeUnmount(() => {
	document.removeEventListener("visibilitychange", handleVisibilityChange)
	stopOverviewAutoRefresh()
	stopAllSystemAutoRefresh()
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value)
		leftSectionResizeObserver.disconnect()
		leftSectionResizeObserver = null
	}
})
</script>

<style scoped>
</style>
