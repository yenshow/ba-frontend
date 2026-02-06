<template>
	<div>
		<!-- 照明系統頁面內容 - 自定義排版 -->
		<div class="flex justify-center gap-6 2xl:gap-8">
			<!-- 主要內容 -->
			<section class="relative flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="flex overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-6 2xl:p-8"
				>
					<!-- 樓層選擇 -->
					<div class="z-10 flex flex-col justify-between py-4 text-center text-white">
						<div class="space-y-4">
							<!-- 樓層顯示 -->
							<div class="py-4">
								<span
									class="inline-flex text-nowrap border-b-2 border-white/70 pb-1 tracking-widest text-3xl 2xl:text-5xl"
								>
									{{ selectedZoneName }}
								</span>
							</div>
							<!-- 樓層管理按鈕 -->
							<Transition name="fade-in">
								<button
									v-if="!isInitialLoading"
									type="button"
									@click="handleOpenZoneDialog"
									:class="[
										'whitespace-nowrap rounded-2xl p-3 text-base font-light text-white transition-all 2xl:text-lg',
										'border-2 border-white/30 bg-transparent hover:bg-white/10',
									]"
									title="樓層管理"
								>
									樓層管理
								</button>
							</Transition>
							<!-- 編輯模式切換按鈕與下拉選單 -->
							<div class="relative">
								<Transition name="fade-in">
									<button
										v-if="!isInitialLoading"
										type="button"
										@click="handleToggleEditMode"
										:class="[
											'whitespace-nowrap rounded-2xl p-3 text-base font-light text-white transition-all 2xl:text-lg',
											isEditMode
												? 'border-2 border-white bg-white/10'
												: 'border-2 border-white/30 bg-transparent',
										]"
									>
										{{ isEditMode ? "完成編輯" : "編輯定位" }}
									</button>
								</Transition>
								<!-- 地點列表下拉選單 -->
								<Transition name="dropdown">
									<CategoryList
										v-if="isEditMode"
										:categories="
											allZoneLocations.map((location, index) => ({
												id: getLocationId(
													selectedZoneData || ({} as LightingZone),
													location,
													index
												),
												name: location.name,
												zoneId: selectedZone || '',
												location: location.location,
												roomIds: [],
												modbus: location.modbus,
											}))
										"
										:editing="isEditMode"
										:selected-category-id="selectedCategory"
										@select="handleSelectCategory"
										@dragstart="handleCategoryListDragStart"
										@dragend="handleDragEnd"
									/>
								</Transition>
							</div>
						</div>
					</div>

					<!-- 中央區域平面圖 -->
					<div
						ref="zonePlanRef"
						class="relative h-[600px] w-full p-4 2xl:h-[780px]"
						:class="{ 'cursor-crosshair': isEditMode && !draggingCategoryId }"
						@drop="handleDrop"
						@dragover.prevent
					>
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
						<template
							v-for="location in currentZoneLocations"
							:key="getLocationIdForDisplay(location)"
						>
							<div
								v-if="selectedZoneData && location.location"
								class="category-dot-wrapper"
								:class="{
									'is-dragging': draggingCategoryId === getLocationIdForDisplay(location),
								}"
								:style="{
									left: `${location.location.x}%`,
									top: `${location.location.y}%`,
								}"
								:draggable="isEditMode"
								@dragstart="
									handleDotDragStart(
										$event,
										location,
										findLocationOriginalIndex(selectedZoneData, location)
									)
								"
								@dragend="handleDragEnd"
							>
								<div
									class="category-dot"
									:class="[
										{ 'is-active': selectedCategory === getLocationIdForDisplay(location) },
										{ 'is-editing': isEditMode },
									]"
									role="button"
									tabindex="0"
									:data-status="
										isLocationNormal(getLocationIdForDisplay(location)) ? 'normal' : 'abnormal'
									"
									:title="`${location.name}：${isLocationNormal(getLocationIdForDisplay(location)) ? '正常' : '異常'}`"
									:aria-label="`${location.name}：${isLocationNormal(getLocationIdForDisplay(location)) ? '正常' : '異常'}`"
									@click.stop="!isEditMode && selectLocationByLocation(location)"
								></div>
								<CategoryTooltip
									:show="true"
									:category-name="location.name"
									:is-normal="isLocationNormal(getLocationIdForDisplay(location))"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側狀態中心 -->
			<aside
				class="flex-[0.8] overflow-y-auto 2xl:flex-[0.7]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<StatusCenter
					:zones="lightingZones"
					:location-statuses="locationStatuses"
					:location-disabled-map="locationDisabledMap"
					:location-toggling="locationToggling"
					:selected-zone="selectedZone"
					@toggle="handleLocationToggle"
					@zone-selected="handleZoneSelected"
				/>
			</aside>
		</div>
	</div>
	<ZoneManagementDialog
		v-model="showZoneManagementDialog"
		:zones="lightingZones"
		system-type="lighting"
		:require-image-url="true"
		device-hint="請先在「設備管理」中建立控制器設備"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import StatusCenter from "~/components/lighting/StatusCenter.vue"
import CategoryTooltip from "~/components/lighting/CategoryTooltip.vue"
import CategoryList from "~/components/lighting/CategoryList.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import type { CategoryModbusConfig, LightingZone, LightingLocation } from "~/types/lighting"
import { useLightingApi } from "~/composables/systems/useLightingApi"
import { useLocationApi } from "~/composables/systems/location/useLocationApi"
import { useDeviceApi } from "~/composables/systems/useDeviceApi"
import { useApiBase } from "~/composables/core/useApiBase"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useZoneManagement } from "~/composables/systems/useZoneManagement"
import type { Device, ControllerDeviceConfig } from "~/types/device"
import type { ModbusDataResponse, ModbusDeviceConfig } from "~/types/modbus"
import type { UnifiedZone } from "~/types/location"
import { unifiedToLightingZone } from "~/utils/locationAdapter"

definePageMeta({
	layout: "default",
	// 認證由全局中間件處理
})

const lightingApi = useLightingApi()
const locationApi = useLocationApi()

// 左側區域參考與高度（用於使右側 StatusCenter 同高）
const leftSectionRef = ref<HTMLElement | null>(null)
const leftSectionHeight = ref<number | null>(null)

// ResizeObserver 監聽左側高度
let leftSectionResizeObserver: ResizeObserver | null = null

const updateLeftSectionHeight = () => {
	if (leftSectionRef.value) {
		leftSectionHeight.value = leftSectionRef.value.offsetHeight
	}
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

// 生成地點 ID（統一的 ID 生成邏輯）
const getLocationId = (
	zone: LightingZone,
	location: LightingLocation,
	locationIndex: number
): string => {
	return location.id || `location-${zone.id || zone.name}-${locationIndex}`
}

// Toast 通知（統一在頂層定義）
const toast = useToast()
// 錯誤處理（統一在頂層定義）
const { handleError } = useErrorHandler()

// 區域數據（從 API 載入）
const lightingZones = ref<LightingZone[]>([])
const isLoadingZones = ref(false)
const isInitialLoading = ref(true) // 追蹤初始載入狀態

// 選中的區域與分類
const selectedZone = ref<string>("")
const selectedCategory = ref("")

// 編輯模式相關
const isEditMode = ref(false)
const zonePlanRef = ref<HTMLElement | null>(null)
const draggingCategoryId = ref<string>("")
const isZonePlanLoaded = ref(false)
const showZoneManagementDialog = ref(false)

// 創建 zonesById Map（避免重複查找）
const zonesById = computed(() => {
	return new Map(lightingZones.value.map((zone) => [zone.id || zone.name, zone]))
})

// 選中的區域名稱
const selectedZoneName = computed(() => {
	const zone = zonesById.value.get(selectedZone.value)
	return zone?.name || ""
})

// 選中的區域資料
const selectedZoneData = computed(() => {
	return zonesById.value.get(selectedZone.value)
})

// 區域示意圖
const zonePlanImage = computed(() => {
	return selectedZoneData.value?.imageUrl
})

// 檢查 location 是否有效
const isValidLocation = (location: { x: number; y: number } | undefined | null): boolean => {
	return (
		location !== undefined &&
		location !== null &&
		typeof location.x === "number" &&
		typeof location.y === "number" &&
		!isNaN(location.x) &&
		!isNaN(location.y)
	)
}

// 當前選中區域的地點列表（過濾掉未定位的點位，只有定位的點位才會顯示在地圖上）
const currentZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	return (zone?.locations || []).filter((location) => isValidLocation(location.location))
})

// 所有地點列表（包含未定位的，用於 CategoryList）
const allZoneLocations = computed(() => {
	if (!selectedZone.value) return []
	const zone = selectedZoneData.value
	return zone?.locations || []
})

// 判斷地點是否正常（基於 locationStatuses）
const isLocationNormal = (locationId: string) => {
	const status = locationStatuses.value[locationId]
	return !status || status.status === "normal"
}

// 計算地點禁用狀態 Map（用於 StatusCenter）
const locationDisabledMap = computed(() => {
	const map: Record<string, boolean> = {}
	// 遍歷所有區域的地點
	lightingZones.value.forEach((zone) => {
		zone.locations.forEach((location, locationIndex) => {
			const locationId = getLocationId(zone, location, locationIndex)
			const isToggling = locationToggling.value.has(locationId)

			// 如果沒有 Modbus 配置，允許控制（用於範例資料）
			if (!location.modbus) {
				map[locationId] = isToggling
				return
			}

			// 如果有 points 配置，檢查是否有 DO 類型的點位（只有 DO 可以控制）
			if (location.modbus.points && location.modbus.points.length > 0) {
				const hasDoPoints = filterDoPoints(location.modbus.points).length > 0
				map[locationId] = !hasDoPoints || isToggling
				return
			}

			// 向後兼容：檢查舊格式
			if (location.modbus.deviceId) {
				const hasDoAddresses = !(
					!location.modbus.doAddresses &&
					!location.modbus.doAddress &&
					!location.modbus.address
				)
				map[locationId] = !hasDoAddresses || isToggling
				return
			}

			// 如果沒有設備配置，允許控制（可能是範例資料）
			map[locationId] = isToggling
		})
	})
	return map
})

// 處理區域選擇
const handleZoneSelected = async (zoneId: string) => {
	selectedZone.value = zoneId
	selectedCategory.value = ""
}

// 選中地點
const handleSelectCategory = (locationId: string) => {
	selectedCategory.value = locationId
}

// 找到地點在原始區域地點列表中的索引
const findLocationOriginalIndex = (
	zone: LightingZone,
	targetLocation: LightingLocation
): number => {
	return zone.locations.findIndex((location) => {
		if (location.id && targetLocation.id) return location.id === targetLocation.id
		return location === targetLocation
	})
}

// 獲取地點的 ID（用於模板，避免重複計算）
const getLocationIdForDisplay = (location: LightingLocation): string => {
	const zone = selectedZoneData.value
	if (!zone) return ""
	const originalIndex = findLocationOriginalIndex(zone, location)
	return originalIndex !== -1 ? getLocationId(zone, location, originalIndex) : ""
}

// 直接通過地點選中
const selectLocationByLocation = (location: LightingLocation) => {
	const zone = selectedZoneData.value
	if (zone && location) {
		const originalIndex = findLocationOriginalIndex(zone, location)
		if (originalIndex !== -1) {
			selectedCategory.value = getLocationId(zone, location, originalIndex)
		}
	}
}

// 地點狀態管理（每個地點對應一個開關狀態）
const locationStatuses = ref<
	Record<string, { isRunning: boolean; status: "normal" | "warning" | "error" }>
>({})

// 追蹤正在進行切換操作的地點（避免重複點擊）
const locationToggling = ref<Set<string>>(new Set())

// 防抖計時器（避免快速重複點擊）
const toggleDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const TOGGLE_DEBOUNCE_DELAY = 300 // 300ms 防抖延遲

// 確保地點狀態物件存在
const ensureLocationStatus = (locationId: string, defaultStatus: "normal" | "error" = "normal") => {
	if (!locationStatuses.value[locationId]) {
		locationStatuses.value[locationId] = {
			isRunning: false,
			status: defaultStatus,
		}
	}
	return locationStatuses.value[locationId]
}

// 回滾地點狀態
const rollbackLocationStatus = (locationId: string, isRunning: boolean) => {
	if (locationStatuses.value[locationId]) {
		locationStatuses.value[locationId].isRunning = isRunning
	}
}

// 過濾 DO 點位（新格式和向後兼容）
const filterDoPoints = (points: any[] | undefined) => {
	if (!points || points.length === 0) return []
	return points.filter((p) => {
		if (p.type === "DO") return true
		// 向後兼容：從 method 推斷
		if (p.method === "writeCoil" || p.method === "writeCoils" || p.method === "getCoils")
			return true
		return false
	})
}

// 過濾 DI 點位（新格式和向後兼容）
const filterDiPoints = (points: any[] | undefined) => {
	if (!points || points.length === 0) return []
	return points.filter((p) => {
		if (p.type === "DI") return true
		// 向後兼容：從 method 推斷
		if (p.method === "getDiscreteInputs") return true
		return false
	})
}

// 從舊格式提取 DI 地址陣列
const extractDiAddresses = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.diAddresses && modbus.diAddresses.length > 0) {
		return modbus.diAddresses
	}
	if (modbus.diAddress !== undefined) {
		const start = modbus.diAddress
		const length = modbus.diLength ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	return []
}

// 從舊格式提取 DO 地址陣列
const extractDoAddresses = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.doAddresses && modbus.doAddresses.length > 0) {
		return modbus.doAddresses
	}
	if (modbus.doAddress !== undefined) {
		const start = modbus.doAddress
		const length = modbus.doLength ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	if (modbus.address !== undefined) {
		const start = modbus.address
		const length = modbus.length ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	return []
}

// 判斷地點是否需要 Modbus 串接（有 modbus 配置的都需要）
const needsModbusConnection = (location: LightingLocation): boolean => {
	return !!location.modbus
}

// 初始化地點狀態（不設置 isRunning，等待從後端讀取）
const initializeLocationStatuses = () => {
	// 使用所有區域的 locations 來初始化狀態
	lightingZones.value.forEach((zone) => {
		zone.locations.forEach((location, locationIndex) => {
			const locationId = getLocationId(zone, location, locationIndex)
			if (!locationStatuses.value[locationId]) {
				locationStatuses.value[locationId] = {
					isRunning: false, // 暫時設為 false，但會在 loadAllLocationStatuses 中更新
					status: "normal",
				}
			}
		})
	})

	// 清理已不存在的地點狀態
	const locationIds = new Set<string>()
	lightingZones.value.forEach((zone) => {
		zone.locations.forEach((location, locationIndex) => {
			locationIds.add(getLocationId(zone, location, locationIndex))
		})
	})
	Object.keys(locationStatuses.value).forEach((locationId) => {
		if (!locationIds.has(locationId)) {
			delete locationStatuses.value[locationId]
		}
	})
}

const deviceApi = useDeviceApi()
const { request } = useApiBase()

// 構建 Modbus API 查詢參數
const buildModbusQueryParams = (
	deviceConfig: ModbusDeviceConfig,
	address: number,
	length: number
): string => {
	const params = new URLSearchParams({
		host: deviceConfig.host,
		port: String(deviceConfig.port),
		unitId: String(deviceConfig.unitId),
		address: String(address),
		length: String(length),
	})
	return params.toString()
}

// 讀取 Coils（使用較短的超時時間，快速失敗）
const getCoils = async (address: number, length: number, deviceConfig: ModbusDeviceConfig) => {
	const queryParams = buildModbusQueryParams(deviceConfig, address, length)
	return request<ModbusDataResponse<boolean>>(`/modbus/coils?${queryParams}`, {
		timeout: MODBUS_TIMEOUT,
	} as any)
}

// 讀取 Discrete Inputs（使用較短的超時時間，快速失敗）
const getDiscreteInputs = async (
	address: number,
	length: number,
	deviceConfig: ModbusDeviceConfig
) => {
	const queryParams = buildModbusQueryParams(deviceConfig, address, length)
	return request<ModbusDataResponse<boolean>>(`/modbus/discrete-inputs?${queryParams}`, {
		timeout: MODBUS_TIMEOUT,
	} as any)
}

// 寫入 Coil
const writeCoil = async (address: number, value: boolean, deviceConfig: ModbusDeviceConfig) => {
	const queryParams = new URLSearchParams({
		host: deviceConfig.host,
		port: String(deviceConfig.port),
		unitId: String(deviceConfig.unitId),
	})
	return request<{ address: number; value: boolean; success: boolean; device: ModbusDeviceConfig }>(
		`/modbus/coils?${queryParams.toString()}`,
		{
			method: "PUT",
			body: JSON.stringify({ address, value }),
		}
	)
}

// 設備快取（避免重複載入）
const deviceCache = ref<Map<number, Device>>(new Map())
// 設備配置快取（避免重複提取配置）
const deviceConfigCache = ref<Map<number, { host: string; port: number; unitId: number }>>(
	new Map()
)

// 從設備對象提取 Modbus 配置
const extractDeviceConfig = (
	device: Device
): { host: string; port: number; unitId: number } | null => {
	const config = device.config as ControllerDeviceConfig
	if (
		config &&
		config.type === "controller" &&
		config.host &&
		config.port &&
		config.unitId !== undefined
	) {
		return {
			host: config.host,
			port: config.port,
			unitId: config.unitId,
		}
	}
	return null
}

// 載入設備資訊（如果尚未載入）
const loadDeviceInfo = async (deviceId: number): Promise<Device | null> => {
	if (deviceCache.value.has(deviceId)) {
		return deviceCache.value.get(deviceId)!
	}

	try {
		const result = await deviceApi.getDevice(deviceId)
		const device = result.device
		deviceCache.value.set(deviceId, device)

		// 同時快取設備配置
		const config = extractDeviceConfig(device)
		if (config) {
			deviceConfigCache.value.set(deviceId, config)
		}

		return device
	} catch (error) {
		handleError(error, `載入設備 ${deviceId} 失敗`)
		return null
	}
}

// 批量預載入所有需要的設備資訊（優化：在載入樓層數據後立即預載入，避免在讀取狀態時才逐一請求）
const preloadDeviceInfos = async () => {
	// 收集所有需要的設備 ID（去重）
	const deviceIds = new Set<number>()
	lightingZones.value.forEach((zone) => {
		zone.locations.forEach((location) => {
			if (location.modbus?.deviceId) {
				deviceIds.add(location.modbus.deviceId)
			}
		})
	})

	// 過濾掉已經快取的設備
	const uncachedDeviceIds = Array.from(deviceIds).filter((id) => !deviceCache.value.has(id))

	if (uncachedDeviceIds.length === 0) return

	// 並行載入所有設備資訊
	await Promise.allSettled(uncachedDeviceIds.map((deviceId) => loadDeviceInfo(deviceId)))
}

// 取得地點的設備配置（優化：使用快取，避免重複提取）
const getLocationDeviceConfig = async (
	location: LightingLocation
): Promise<{ host: string; port: number; unitId: number } | null> => {
	if (!location.modbus) return null

	// 如果使用新格式（有 deviceId）
	if (location.modbus.deviceId) {
		// 先檢查配置快取
		if (deviceConfigCache.value.has(location.modbus.deviceId)) {
			return deviceConfigCache.value.get(location.modbus.deviceId)!
		}

		// 如果沒有快取，載入設備資訊（會自動快取配置）
		const device = await loadDeviceInfo(location.modbus.deviceId)
		if (!device) return null

		// 從快取中獲取配置
		return deviceConfigCache.value.get(location.modbus.deviceId) || null
	}

	// 向後兼容：使用舊格式
	if (location.modbus.host && location.modbus.port && location.modbus.unitId !== undefined) {
		return {
			host: location.modbus.host,
			port: location.modbus.port,
			unitId: location.modbus.unitId,
		}
	}

	return null
}

// Modbus 請求超時時間（3 秒，快速失敗）
const MODBUS_TIMEOUT = 3000

// 請求去重：記錄最近發送的請求，避免重複請求（同時追蹤正在進行的請求）
const requestCache = new Map<string, { timestamp: number; promise?: Promise<any> }>()
const REQUEST_CACHE_TTL = 4500 // 4.5 秒內相同請求會被去重（略小於輪詢間隔）

// 生成請求緩存鍵（設備 + 地址）
const getRequestKey = (
	deviceConfig: { host: string; port: number; unitId: number },
	address: number,
	type: "coil" | "discrete" = "coil"
) => {
	return `${deviceConfig.host}:${deviceConfig.port}:${deviceConfig.unitId}:${type}:${address}`
}

// 批量讀取請求的結構
interface BatchRequest {
	deviceConfig: { host: string; port: number; unitId: number }
	address: number
	type: "coil" | "discrete"
	locationId: string // 從 areaId 改名
}

// ========== 共用工具函數 ==========

/**
 * 根據 areaId 查找對應的 area 物件和索引（統一查找邏輯）
 */
const findLocationById = (
	locationId: string,
	requireDbId = false
): { location: LightingLocation; zone: LightingZone; locationIndex: number } | null => {
	for (const zone of lightingZones.value) {
		for (let i = 0; i < zone.locations.length; i++) {
			const location = zone.locations[i]
			const computedLocationId = getLocationId(zone, location, i)
			if (computedLocationId === locationId) {
				// 如果需要資料庫 ID，則檢查 location.id 是否存在
				if (requireDbId && !location.id) continue
				return { location, zone, locationIndex: i }
			}
		}
	}
	return null
}

/**
 * 報告照明地點錯誤（靜默處理，不影響主要流程）
 */
const reportLocationError = async (locationId: string, errorMessage: string) => {
	const found = findLocationById(locationId, true)
	if (!found?.location.systemId) return

	try {
		await lightingApi.reportError(found.location.systemId, errorMessage)
	} catch (error) {
		// 靜默處理，不影響主要流程
		if (process.dev) {
			console.warn("[lighting] 報告錯誤失敗:", error)
		}
	}
}

/**
 * 清除照明地點錯誤狀態（靜默處理，不影響主要流程）
 */
const clearLocationError = async (locationId: string) => {
	const found = findLocationById(locationId, true)
	if (!found?.location.systemId) return

	try {
		await lightingApi.clearError(found.location.systemId)
	} catch (error) {
		// 靜默處理，不影響主要流程
		if (process.dev) {
			console.warn("[lighting] 清除錯誤失敗:", error)
		}
	}
}

// 更新地點狀態的共用函數
const updateLocationStatuses = async (locationIds: string[], value: boolean) => {
	for (const locationId of locationIds) {
		const status = ensureLocationStatus(locationId)
		const wasError = status.status === "error"
		status.isRunning = value
		status.status = "normal"

		// 如果地點從錯誤狀態恢復正常，清除錯誤狀態
		if (wasError && status.status === "normal") {
			await clearLocationError(locationId)
		}
	}
}

// 記錄失敗的設備（快速失敗機制，避免重複請求離線設備）
// 使用 Map 同時存儲時間戳，避免使用 Set + Map 兩個數據結構
const failedDevices = new Map<string, number>()
const FAILED_DEVICE_TTL = 30000 // 30 秒後重試失敗的設備

// 批量讀取請求處理（優化：智能合併相同設備和地址的請求，並發處理）
const processBatchRequests = async (requests: BatchRequest[]) => {
	if (requests.length === 0) return

	const now = Date.now()

	// 清理過期的失敗設備記錄
	for (const [deviceKey, timestamp] of failedDevices.entries()) {
		if (now - timestamp > FAILED_DEVICE_TTL) {
			failedDevices.delete(deviceKey)
		}
	}

	// 按請求鍵分組（相同設備、類型、地址的請求合併）
	const grouped = new Map<string, BatchRequest[]>()
	for (const req of requests) {
		const key = getRequestKey(req.deviceConfig, req.address, req.type)
		if (!grouped.has(key)) {
			grouped.set(key, [])
		}
		grouped.get(key)!.push(req)
	}

	// 處理每組請求（並發處理，避免順序阻塞）
	await Promise.allSettled(
		Array.from(grouped.entries()).map(async ([requestKey, groupRequests]) => {
			const firstReq = groupRequests[0]
			const locationIds = groupRequests.map((req) => req.locationId)

			// 檢查設備是否在失敗列表中（快速失敗）
			if (failedDevices.has(requestKey)) {
				locationIds.forEach((locationId) => {
					ensureLocationStatus(locationId).status = "error"
				})
				return
			}

			// 檢查緩存或正在進行的請求
			const cached = requestCache.get(requestKey)
			if (cached?.promise && now - cached.timestamp < REQUEST_CACHE_TTL) {
				try {
					const response = await cached.promise
					if (response?.data?.[0] !== undefined) {
						await updateLocationStatuses(locationIds, response.data[0])
					}
					return
				} catch (error) {
					// 緩存請求失敗，繼續執行新請求
				}
			}

			// 發送新請求
			try {
				const requestPromise =
					firstReq.type === "coil"
						? getCoils(firstReq.address, 1, firstReq.deviceConfig)
						: getDiscreteInputs(firstReq.address, 1, firstReq.deviceConfig)

				// 更新緩存（同時追蹤正在進行的請求）
				requestCache.set(requestKey, { timestamp: now, promise: requestPromise })

				const response = await requestPromise

				// 處理響應
				if (response?.data?.[0] !== undefined) {
					await updateLocationStatuses(locationIds, response.data[0])
				}

				// 請求成功，從失敗列表中移除（設備已恢復）
				failedDevices.delete(requestKey)
			} catch (error) {
				// 請求失敗，標記為錯誤並清除緩存
				requestCache.delete(requestKey)
				const errorMessage = error instanceof Error ? error.message : String(error)

				// 如果是 503 錯誤（設備離線），添加到失敗列表（快速失敗）
				if (
					errorMessage.includes("503") ||
					errorMessage.includes("Service Unavailable") ||
					errorMessage.includes("設備離線")
				) {
					failedDevices.set(requestKey, now)
				}

				// 標記所有相關地點為錯誤狀態
				locationIds.forEach((locationId) => {
					ensureLocationStatus(locationId).status = "error"
				})
				// 並行報告錯誤（不阻塞）
				await Promise.allSettled(
					locationIds.map((locationId) =>
						reportLocationError(locationId, errorMessage || "無法讀取照明設備資料")
					)
				)
			}
		})
	)

	// 清理過期緩存
	for (const [key, value] of requestCache.entries()) {
		if (now - value.timestamp > REQUEST_CACHE_TTL * 2) {
			requestCache.delete(key)
		}
	}
}

// 提取區域的讀取點位配置（共用邏輯）
const extractReadPoint = (
	modbus: CategoryModbusConfig
): { address: number; type: "coil" | "discrete" } | null => {
	// 使用新的 points 配置
	if (modbus.points && modbus.points.length > 0) {
		// 優先讀取 DI 點位來顯示按鈕狀態（DI 反映實際設備狀態）
		const diPoints = filterDiPoints(modbus.points)
		if (diPoints.length > 0) {
			return { address: diPoints[0].address, type: "discrete" }
		}
		// 如果沒有 DI 點位，才使用 DO 點位
		const doPoints = filterDoPoints(modbus.points)
		if (doPoints.length > 0) {
			return { address: doPoints[0].address, type: "coil" }
		}
	} else {
		// 向後兼容：使用舊格式
		const diAddresses = extractDiAddresses(modbus)
		if (diAddresses.length > 0) {
			return { address: Math.min(...diAddresses), type: "discrete" }
		}
		const doAddresses = extractDoAddresses(modbus)
		if (doAddresses.length > 0) {
			return { address: Math.min(...doAddresses), type: "coil" }
		}
	}
	return null
}

// 提取區域的寫入點位配置（共用邏輯）
const extractWritePoints = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.points && modbus.points.length > 0) {
		const doPoints = filterDoPoints(modbus.points)
		return doPoints.map((p) => p.address)
	} else {
		// 向後兼容：使用舊格式
		return extractDoAddresses(modbus)
	}
}

// 收集地點的讀取請求（用於批量處理）
const collectLocationReadRequests = async (
	zone: LightingZone,
	location: LightingLocation,
	locationIndex: number
): Promise<BatchRequest[]> => {
	if (!needsModbusConnection(location) || !location.modbus) return []

	const deviceConfig = await getLocationDeviceConfig(location)
	if (!deviceConfig) return []

	const locationId = getLocationId(zone, location, locationIndex)
	const readPoint = extractReadPoint(location.modbus)

	if (!readPoint) return []

	return [
		{
			deviceConfig: deviceConfig as { host: string; port: number; unitId: number },
			address: readPoint.address,
			type: readPoint.type,
			locationId: locationId,
		},
	]
}

// 載入所有地點的狀態（優化：批量讀取，減少請求數）
const loadAllLocationStatuses = async (options?: { silent?: boolean; loadAllZones?: boolean }) => {
	// 如果 loadAllZones 為 true，載入所有區域的地點狀態（用於 StatusCenter 顯示）
	// 否則只載入當前選中區域的地點狀態
	const currentZoneName = selectedZoneName.value

	// 收集需要 Modbus 連接的地點
	const locationsNeedingModbus: Array<{
		zone: LightingZone
		location: LightingLocation
		locationIndex: number
	}> = []
	lightingZones.value.forEach((zone) => {
		zone.locations.forEach((location, locationIndex) => {
			if (needsModbusConnection(location)) {
				if (
					options?.loadAllZones ||
					(currentZoneName && (zone.id || zone.name) === currentZoneName)
				) {
					locationsNeedingModbus.push({ zone, location, locationIndex })
				}
			}
		})
	})

	if (locationsNeedingModbus.length === 0) return

	// 優化：批量預載入所有需要的設備配置（避免在 collectLocationReadRequests 中逐一請求）
	const deviceIds = new Set<number>()
	locationsNeedingModbus.forEach(({ location }) => {
		if (location.modbus?.deviceId) {
			deviceIds.add(location.modbus.deviceId)
		}
	})
	if (deviceIds.size > 0) {
		const uncachedDeviceIds = Array.from(deviceIds).filter((id) => !deviceCache.value.has(id))
		if (uncachedDeviceIds.length > 0) {
			await Promise.allSettled(uncachedDeviceIds.map((deviceId) => loadDeviceInfo(deviceId)))
		}
	}

	// 收集所有讀取請求（現在設備配置已經預載入，不會再有異步等待）
	const allRequests: BatchRequest[] = []
	const results = await Promise.allSettled(
		locationsNeedingModbus.map(({ zone, location, locationIndex }) =>
			collectLocationReadRequests(zone, location, locationIndex)
		)
	)

	// 合併所有請求
	for (const result of results) {
		if (result.status === "fulfilled") {
			allRequests.push(...result.value)
		}
	}

	if (allRequests.length === 0) return

	// 批量處理請求（自動合併相同設備和類型的請求）
	await processBatchRequests(allRequests)
}

// 處理地點開關切換（添加防抖和 loading 狀態）
const handleLocationToggle = async (locationId: string, targetValue: boolean) => {
	// 如果正在處理此地點的切換，忽略重複請求
	if (locationToggling.value.has(locationId)) {
		return
	}

	// 清除之前的防抖計時器
	const existingTimer = toggleDebounceTimers.get(locationId)
	if (existingTimer) {
		clearTimeout(existingTimer)
	}

	// 設置防抖計時器
	const timer = setTimeout(async () => {
		await executeToggle(locationId, targetValue)
		toggleDebounceTimers.delete(locationId)
	}, TOGGLE_DEBOUNCE_DELAY)

	toggleDebounceTimers.set(locationId, timer)
}

// 執行實際的切換操作
const executeToggle = async (locationId: string, targetValue: boolean) => {
	const found = findLocationById(locationId)
	if (!found) return

	const { location: targetLocation, zone: targetZone, locationIndex: targetLocationIndex } = found

	// 如果正在處理，忽略
	if (locationToggling.value.has(locationId)) {
		return
	}

	// 標記為正在處理
	locationToggling.value.add(locationId)

	// 取得當前狀態
	const currentStatus = locationStatuses.value[locationId]
	const currentValue = currentStatus?.isRunning ?? false

	try {
		// 更新本地狀態（樂觀更新）
		if (locationStatuses.value[locationId]) {
			locationStatuses.value[locationId].isRunning = targetValue
		}

		// 如果沒有 Modbus 配置，只更新本地狀態
		if (!needsModbusConnection(targetLocation) || !targetLocation.modbus) {
			locationToggling.value.delete(locationId)
			return
		}

		const deviceConfig = await getLocationDeviceConfig(targetLocation)
		if (!deviceConfig) {
			rollbackLocationStatus(locationId, currentValue)
			locationToggling.value.delete(locationId)
			return
		}

		// 提取寫入點位（統一處理新舊格式）
		const writeAddresses = extractWritePoints(targetLocation.modbus)
		if (writeAddresses.length === 0) {
			rollbackLocationStatus(locationId, currentValue)
			locationToggling.value.delete(locationId)
			return
		}

		// 執行所有 DO 點位的寫入操作（統一使用 writeCoil）
		await Promise.all(
			writeAddresses.map((address) => writeCoil(address, targetValue, deviceConfig))
		)

		// 寫入成功後，稍等一下再重新讀取狀態（避免與設備響應時間衝突）
		setTimeout(async () => {
			const readRequests = await collectLocationReadRequests(
				targetZone,
				targetLocation,
				targetLocationIndex
			)
			if (readRequests.length > 0) {
				await processBatchRequests(readRequests)
			}
			locationToggling.value.delete(locationId)
		}, 200) // 200ms 後讀取狀態
	} catch (error) {
		// 回滾狀態並標記為錯誤
		rollbackLocationStatus(locationId, currentValue)
		ensureLocationStatus(locationId, "error").status = "error"
		locationToggling.value.delete(locationId)

		handleError(error, `控制 ${targetLocation.name} 失敗`)
	}
}

// 使用 usePolling 統一管理輪詢（支持頁面可見性檢查）
const { start: startPolling, stop: stopPolling } = usePolling({
	callback: async () => {
		// 只有在頁面可見時才載入（優化：使用 Page Visibility API）
		if (document.visibilityState === "visible") {
			await loadAllLocationStatuses({ silent: true })
		}
	},
	interval: 5000, // 每 5 秒執行一次
	immediate: true, // 立即執行一次
	enabled: () => document.visibilityState === "visible", // 只在頁面可見時執行
	onError: (err) => {
		handleError(err, "載入區域狀態失敗")
	},
})

// 啟動自動刷新
const startAutoRefresh = () => {
	startPolling()
}

// 停止自動刷新
const stopAutoRefresh = () => {
	stopPolling()
	// 清理請求緩存
	requestCache.clear()
}

// 監聽頁面可見性變化（優化：頁面不可見時暫停輪詢）
const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") {
		// 頁面可見時，立即載入一次狀態
		void loadAllLocationStatuses({ silent: true })
	}
}

// 刪除地點（通過更新區域來刪除地點）
const handleDeleteCategory = async (locationId: string) => {
	if (!isEditMode.value) return
	if (!confirm("確定要刪除這個點位嗎？")) return

	try {
		const found = findLocationById(locationId)
		if (!found) {
			throw new Error("找不到要刪除的點位")
		}

		const { zone: targetZone, locationIndex: targetLocationIndex } = found

		// 從區域的 locations 中移除該地點
		const updatedLocations = targetZone.locations.filter(
			(_, index) => index !== targetLocationIndex
		)

		// 更新區域（包含更新後的 locations）
		const result = await lightingApi.updateZone(targetZone.id!, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			locations: updatedLocations,
		})

		// 更新本地資料
		const index = lightingZones.value.findIndex((z) => z.id === targetZone.id)
		if (index > -1) {
			lightingZones.value[index] = result.zone
		}

		// 清理狀態
		if (selectedCategory.value === locationId) {
			selectedCategory.value = ""
		}
		delete locationStatuses.value[locationId]

		toast.success("點位已刪除")
	} catch (error) {
		handleError(error, "刪除點位失敗")
	}
}

// 拖曳處理：在圖片上拖曳地點
const handleDotDragStart = (
	event: DragEvent,
	location: LightingLocation,
	locationIndex: number
) => {
	if (!isEditMode.value || !selectedZoneData.value) return
	const locationId = getLocationId(selectedZoneData.value, location, locationIndex)
	startDrag(event, locationId)
}

// 處理從 CategoryList 開始的拖曳
const handleCategoryListDragStart = (event: DragEvent, category: any) => {
	if (!isEditMode.value || !selectedZoneData.value) return
	startDrag(event, category.id, true)
}

// 統一的拖曳開始處理
const startDrag = (event: DragEvent, locationId: string, fromCategoryList = false) => {
	draggingCategoryId.value = locationId
	event.dataTransfer!.effectAllowed = "move"
	event.dataTransfer!.setData("locationId", locationId)
	if (fromCategoryList) {
		event.dataTransfer!.setData("fromCategoryList", "true")
	}
}

// 統一的拖曳結束處理
const handleDragEnd = () => {
	draggingCategoryId.value = ""
}

// 處理拖放（通過更新區域來調整地點位置）
const handleDrop = async (event: DragEvent) => {
	if (!isEditMode.value || !zonePlanRef.value) return

	event.preventDefault()
	const locationId = event.dataTransfer?.getData("locationId")
	if (!locationId) return

	const found = findLocationById(locationId)
	if (!found) return

	const { zone: targetZone, locationIndex: targetLocationIndex } = found

	const rect = zonePlanRef.value.getBoundingClientRect()
	const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
	const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))

	// 更新地點位置（如果是從 CategoryList 拖曳過來的未定位點位，現在設定位置）
	const updatedLocations = targetZone.locations.map((location, index) => {
		if (index === targetLocationIndex) {
			return { ...location, location: { x, y } }
		}
		return location
	})

	try {
		// 更新區域（包含更新後的 locations）
		const result = await lightingApi.updateZone(targetZone.id!, {
			name: targetZone.name,
			imageUrl: targetZone.imageUrl,
			locations: updatedLocations,
		})

		// 更新本地資料
		const index = lightingZones.value.findIndex((z) => z.id === targetZone.id)
		if (index > -1) {
			lightingZones.value[index] = result.zone
		}
	} catch (error) {
		handleError(error, "更新位置失敗")
	}

	draggingCategoryId.value = ""
}

// 批次更新位置（通過更新區域來實現）
const saveBatchPositions = async (
	updates: Array<{ id: string; location: { x: number; y: number } }>
) => {
	try {
		// 按區域分組更新
		const updatesByZone = new Map<string, typeof updates>()
		for (const update of updates) {
			// 找到地點所屬的區域
			for (const zone of lightingZones.value) {
				const locationIndex = zone.locations.findIndex(
					(location, idx) => getLocationId(zone, location, idx) === update.id
				)
				if (locationIndex !== -1) {
					const zoneId = zone.id || zone.name
					if (!updatesByZone.has(zoneId)) {
						updatesByZone.set(zoneId, [])
					}
					updatesByZone.get(zoneId)!.push(update)
					break
				}
			}
		}

		// 更新每個區域
		for (const [zoneId, zoneUpdates] of updatesByZone.entries()) {
			const zone = lightingZones.value.find((z) => (z.id || z.name) === zoneId)
			if (!zone) continue

			// 更新地點位置
			const updatedLocations = zone.locations.map((location, index) => {
				const locationId = getLocationId(zone, location, index)
				const update = zoneUpdates.find((u) => u.id === locationId)
				if (update) {
					return { ...location, location: update.location }
				}
				return location
			})

			// 更新區域
			const result = await lightingApi.updateZone(zone.id!, {
				name: zone.name,
				imageUrl: zone.imageUrl,
				locations: updatedLocations,
			})

			// 更新本地資料
			const index = lightingZones.value.findIndex((z) => z.id === zone.id)
			if (index > -1) {
				lightingZones.value[index] = result.zone
			}
		}
	} catch (error) {
		handleError(error, "批次更新位置失敗")
		throw error // 重新拋出以便調用者處理
	}
}

// 監聽區域資料變化，重新初始化狀態
watch(
	() => lightingZones.value,
	async () => {
		// 當區域資料變化時，重新初始化地點狀態
		initializeLocationStatuses()
		// 優化：批量預載入所有需要的設備資訊
		await preloadDeviceInfos()
		// 重新載入所有區域的狀態（用於 StatusCenter）
		// 注意：loadAllLocationStatuses 內部已經會批量預載入設備配置，這裡不需要重複
		void loadAllLocationStatuses({ loadAllZones: true })
	},
	{ deep: true }
)

// 初始化：自動選中第一個地點
watch(
	() => currentZoneLocations.value,
	(newLocations) => {
		if (!selectedZoneData.value) return

		// 檢查當前選中的地點是否還存在於新清單中
		const currentLocationExists = newLocations.some(
			(location) => getLocationIdForDisplay(location) === selectedCategory.value
		)

		if (!currentLocationExists) {
			// 如果不存在，選中第一個或清空
			if (newLocations.length > 0) {
				selectedCategory.value = getLocationIdForDisplay(newLocations[0])
			} else {
				selectedCategory.value = ""
			}
		}
	},
	{ immediate: true }
)

// ========== 區域管理功能 ==========

// 處理打開區域管理對話框
const handleOpenZoneDialog = async () => {
	// 如果還沒有載入區域數據，先載入
	if (lightingZones.value.length === 0) {
		await loadZonesFromAPI()
	}
	// 打開對話框
	showZoneManagementDialog.value = true
}

// 處理編輯模式切換
const handleToggleEditMode = () => {
	// 如果切換到編輯模式，確保數據已載入
	if (!isEditMode.value && lightingZones.value.length === 0) {
		loadZonesFromAPI()
	}
	// 切換編輯模式
	isEditMode.value = !isEditMode.value
}

// 從 API 載入區域列表
const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await lightingApi.getZones()
		lightingZones.value = result.zones || []

		// 如果沒有選中的區域且有區域資料，優先選擇 1F
		if (!selectedZone.value && lightingZones.value.length > 0) {
			// 優先查找 1F
			const zone1F = lightingZones.value.find(
				(zone) => zone.name === "1F" || zone.name.toLowerCase().includes("1f")
			)
			if (zone1F) {
				selectedZone.value = zone1F.id || zone1F.name
			} else {
				// 如果沒有 1F，選中第一個
				selectedZone.value = lightingZones.value[0].id || lightingZones.value[0].name
			}
		}

		// 優化：批量預載入所有需要的設備資訊，避免在讀取狀態時才逐一請求
		await preloadDeviceInfos()
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

// 使用區域管理 composable
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<LightingZone & { id: string }>()

// 處理儲存區域
const handleSaveZone = async (zone: LightingZone) => {
	await baseHandleSaveZone(
		zone as LightingZone & { id: string },
		lightingZones as Ref<(LightingZone & { id: string })[]>,
		async (z: LightingZone & { id: string }) => {
			// 檢查是否為臨時 ID（以 temp- 開頭）或有效的數字 ID
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await lightingApi.updateZone(z.id, {
						name: z.name,
						imageUrl: z.imageUrl,
						locations: z.locations,
					})
				: await lightingApi.createZone({
						name: z.name,
						imageUrl: z.imageUrl,
						locations: z.locations,
					})
			// 確保返回的 zone 有 id
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as LightingZone & {
				id: string
			}
			return {
				merged: result.merged,
				message: result.message,
				zone: zoneWithId,
			}
		},
		{
			selectedZoneRef: selectedZone,
			onAfterSave: () => {
				initializeLocationStatuses()
			},
		}
	)
}

// 處理刪除區域
const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(
		zoneId,
		lightingZones as Ref<(LightingZone & { id: string })[]>,
		lightingApi.deleteZone,
		{
			selectedZoneRef: selectedZone,
			systemType: "lighting",
			getFullZoneApiCall: (id: string) => locationApi.getZone(id),
			updateZoneApiCall: async (id: string, data: { locations: UnifiedZone["locations"] }) => {
				const response = await locationApi.updateZone(id, { locations: data.locations })
				const lightingZone = unifiedToLightingZone(response.zone)
				return {
					merged: response.merged,
					message: response.message,
					zone: { ...lightingZone, id: lightingZone.id || id } as LightingZone & { id: string },
				}
			},
			onAfterDelete: async () => {
				await loadZonesFromAPI()
			},
		}
	)
}

// 初始化：載入區域數據
onMounted(async () => {
	// 初始化左側 ResizeObserver
	initLeftSectionObserver()
	try {
		// 載入區域列表（會自動選擇 1F 或第一個區域）
		await loadZonesFromAPI()

		// 初始化地點狀態（從區域的 locations）
		initializeLocationStatuses()

		// 同步右側高度
		nextTick(() => {
			updateLeftSectionHeight()
		})

		// 立即從後端載入所有區域的地點實際狀態（不預設為 OFF）
		// 注意：loadAllLocationStatuses 內部已經會批量預載入設備配置，避免重複請求
		// 這樣 StatusCenter 也能正確顯示所有區域的狀態
		await loadAllLocationStatuses({ loadAllZones: true })
	} finally {
		// 初始載入完成，顯示按鈕（使用淡入動畫）
		isInitialLoading.value = false
	}

	// 啟動自動刷新
	startAutoRefresh()

	// 監聽頁面可見性變化
	document.addEventListener("visibilitychange", handleVisibilityChange)
})

// 清理：停止自動刷新
onBeforeUnmount(() => {
	stopAutoRefresh()
	document.removeEventListener("visibilitychange", handleVisibilityChange)
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value)
		leftSectionResizeObserver.disconnect()
		leftSectionResizeObserver = null
	}
})
</script>

<style scoped>
/* 按鈕進場動畫 */
.fade-in-enter-active {
	transition:
		opacity 0.4s ease-in,
		transform 0.4s ease-out;
}

.fade-in-enter-from {
	opacity: 0;
	transform: translateY(-10px);
}

.fade-in-enter-to {
	opacity: 1;
	transform: translateY(0);
}

.image-blur-load {
	transition:
		filter 0.6s ease-in-out,
		opacity 0.6s ease-in-out,
		transform 0.6s ease-in-out;
	filter: blur(20px);
	opacity: 0.6;
}

.image-blur-load.image-loaded {
	filter: blur(0);
	opacity: 1;
}

.category-dot-wrapper {
	position: absolute;
	z-index: 10;
}

.category-dot {
	position: absolute;
	width: 48px;
	height: 48px;
	border-radius: 9999px;
	transform: translate(-50%, -50%);
	border: 2px solid transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	backdrop-filter: blur(3px);
	transition:
		box-shadow 0.2s ease,
		border-color 0.2s ease,
		background 0.2s ease;
}

.category-dot::before {
	content: "";
	position: absolute;
	inset: 6px;
	border-radius: inherit;
	transition: background 0.2s ease;
}

.category-dot::after {
	position: relative;
	content: "";
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
	transition: transform 0.2s ease;
}

.category-dot[data-status="normal"] {
	background: rgba(28, 200, 138, 0.28);
	border-color: rgba(28, 200, 138, 0.6);
}

.category-dot[data-status="normal"]::before {
	background: #1cc88a;
}

.category-dot[data-status="normal"]::after {
	content: "✓";
}

.category-dot[data-status="abnormal"] {
	background: rgba(245, 101, 101, 0.32);
	border-color: rgba(245, 101, 101, 0.72);
	animation: dot-alert 1.6s ease-in-out infinite;
}

.category-dot[data-status="abnormal"]::before {
	background: #f56565;
}

.category-dot[data-status="abnormal"]::after {
	content: "!";
}

.category-dot:focus-visible {
	outline: 2px solid #ffffff;
	outline-offset: 2px;
}

.category-dot.is-editing {
	cursor: move;
}

.category-dot-wrapper.is-dragging {
	opacity: 0.5;
	z-index: 100;
}

.category-dot-wrapper[draggable="true"] {
	cursor: move;
}

@keyframes dot-alert {
	0%,
	100% {
		box-shadow: 0 0 18px rgba(245, 101, 101, 0.6);
	}
	50% {
		box-shadow: 0 0 28px rgba(245, 101, 101, 0.95);
	}
}

/* 下拉選單動畫 */
.dropdown-enter-active,
.dropdown-leave-active {
	transition: all 0.2s ease;
}

.dropdown-enter-from {
	opacity: 0;
	transform: translateY(-8px);
}

.dropdown-enter-to {
	opacity: 1;
	transform: translateY(0);
}

.dropdown-leave-from {
	opacity: 1;
	transform: translateY(0);
}

.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
