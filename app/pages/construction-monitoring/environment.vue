<template>
	<div>
		<div class="flex justify-center gap-6 2xl:gap-8">
			<!-- 左側：詳細視圖 -->
			<section class="relative flex-[1.2] 2xl:flex-[1.3]" ref="leftSectionRef">
				<div
					class="relative flex min-h-[664px] flex-col overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 p-4 2xl:min-h-[848px] 2xl:p-6"
				>
					<!-- 位置標題與地點選擇 -->
					<div
						class="absolute left-1/2 top-0 flex h-[36px] translate-x-[-50%] items-center justify-center bg-white text-lg text-[#595959] 2xl:h-[48px] 2xl:text-xl"
						style="clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, calc(0% + 24px) 100%)"
					>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="currentLocationData" class="ps-[12px] text-[24px] 2xl:text-[36px]">{{
								getLocationZone(currentLocationData)
							}}</span>
						</div>
						<div class="h-[24px] w-px bg-[#595959]"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="currentLocationData" class="pe-[12px] text-[24px] 2xl:text-[36px]">{{
								currentLocationData.name
							}}</span>
						</div>
					</div>

					<button
						v-if="isOperator"
						type="button"
						class="absolute left-8 top-2 rounded-lg border-2 border-white/30 bg-transparent px-4 py-2 text-sm text-white transition-all hover:bg-white/10 2xl:text-base"
						aria-label="地點管理"
						@click="showLocationManagementDialog = true"
					>
						地點管理
					</button>
					<button
						type="button"
						class="absolute right-8 top-2 rounded-lg border-2 border-white/30 bg-transparent px-4 py-2 text-sm text-white transition-all hover:bg-white/10 2xl:text-base"
						aria-label="開啟完整報表"
						@click="handleOpenSimulation"
					>
						完整報表
					</button>

					<!-- 三個大儀表（包含趨勢圖） -->
					<div class="mt-16 grid grid-cols-3 gap-4 border-b border-white/80 pb-2 2xl:gap-6">
						<!-- 噪音值儀表 -->
						<EnvironmentGauge
							type="noise"
							:value="noiseValue"
							:location-id="currentLocationData?.id || null"
							class="border-r border-white/30"
						/>

						<!-- AQI 儀表（中間，較大） -->
						<EnvironmentGauge
							type="aqi"
							:value="aqiScore"
							size="large"
							:location-id="currentLocationData?.id || null"
						/>

						<!-- 溫度儀表 -->
						<EnvironmentGauge
							type="temperature"
							:value="currentTemperature"
							:location-id="currentLocationData?.id || null"
							class="border-l border-white/30"
						/>
					</div>

					<!-- 環境參數網格 -->
					<div
						v-if="currentLocationData && currentLocationData.parameters.length > 0"
						class="mt-8 grid grid-cols-3 gap-2 2xl:grid-cols-4"
					>
						<EnvironmentParamCard
							v-for="param in enabledParameters"
							:key="param.type"
							:type="param.type"
							:value="getParameterValue(param.type)"
							:icon-src="getParameterIcon(param.type)"
							:label="getParameterDisplayName(param.type)"
							:unit="getParameterUnit(param.type)"
							:fraction-digits="getParameterFractionDigits(param.type)"
							:device-error="isSensorOffline"
							:get-status-class="getStatusClass"
							:get-status-dot-class="getStatusDotClass"
							:get-status-text="getStatusText"
							:get-status-text-class="getStatusTextClass"
							:to-fixed-number="toFixedNumber"
						/>
					</div>
					<div
						v-else
						class="flex min-h-[248px] flex-col items-center justify-center py-8 text-center text-white/60"
					>
						<p class="text-base 2xl:text-lg">尚未配置感測器參數</p>
						<p class="mt-2 text-sm 2xl:text-base">請在「地點管理」中新增參數</p>
					</div>
				</div>
			</section>

			<!-- 右側：總覽面板 -->
			<aside
				:class="[
					'flex flex-col transition-all duration-500 ease-in-out',
					isOverviewCollapsed ? 'flex-[0.05]' : 'flex-[0.8] 2xl:flex-[0.7]',
				]"
				:style="{ height: leftSectionHeight ? leftSectionHeight + 'px' : 'auto' }"
			>
				<div
					class="show-scrollbar relative h-full min-w-[72px] overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-white/80 bg-white/30 py-8 transition-all duration-500 ease-in-out 2xl:min-w-[84px]"
				>
					<!-- 標題與收縮按鈕 -->
					<Transition name="fade">
						<h2
							v-if="!isOverviewCollapsed"
							key="title"
							class="mb-4 text-center text-2xl font-semibold tracking-[12px] text-white 2xl:text-3xl"
							style="padding-left: 12px"
						>
							總覽
						</h2>
					</Transition>
					<button
						type="button"
						class="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 text-white hover:bg-white/20 2xl:h-12 2xl:w-12"
						@click="isOverviewCollapsed = !isOverviewCollapsed"
						:title="isOverviewCollapsed ? '展開總覽' : '收縮總覽'"
					>
						<svg
							class="h-6 w-6 2xl:h-7 2xl:w-7"
							:class="{ 'rotate-180': isOverviewCollapsed }"
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
					</button>

					<!-- 總覽內容 -->
					<Transition name="fade">
						<div
							v-if="!isOverviewCollapsed"
							key="content"
							class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
						>
							<div class="space-y-4">
								<template v-if="sortedLocations.length > 0">
									<OverviewLocationCard
										v-for="location in sortedLocations"
										:key="getLocationId(location)"
										:name="location.name"
										:zone="getLocationZone(location) || ''"
										v-bind="getOverviewLocationCardBindings(location)"
										:disabled="!getLocationDeviceIds(location).length"
										:get-status-text="getStatusText"
										@click="selectLocation(location)"
										:class="{
											'ring-2 ring-cyan-400': isCurrentLocation(location),
											'cursor-pointer transition-all hover:ring-2 hover:ring-cyan-300/50': true,
										}"
									/>
								</template>
								<div v-else class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無地點資料</p>
									<p class="mt-2 text-sm 2xl:text-base">請在「地點管理」中新增地點</p>
								</div>
							</div>
						</div>
					</Transition>
				</div>
			</aside>
		</div>
	</div>
	<ZoneManagementDialog
		v-if="isOperator"
		v-model="showLocationManagementDialog"
		:zones="environmentZones"
		system-type="environment"
		:require-image-url="false"
		device-hint="請先在「設備管理」中建立感測器設備"
		@save="handleSaveZone"
		@delete="handleDeleteZone"
	/>
	<SimulationFrame v-model="showSimulationFrame" title="環境監控 - 完整報表">
		<EnvironmentSimulation
			:summary-readings="simulationReadingsSummary"
			:detail-readings="simulationReadingsDetail"
			:preset="simulationTimeRange.preset"
			:zone-name="simulationZoneName"
			:location-name="simulationLocationName"
			:time-range="simulationTimeRange"
			:get-cell-class="getReportCellClass"
			@update:time-range="handleSimulationTimeRangeUpdate"
		/>
	</SimulationFrame>
</template>

<script setup lang="ts">
import EnvironmentGauge from "~/components/environment/EnvironmentGauge.vue"
import EnvironmentParamCard from "~/components/environment/EnvironmentParamCard.vue"
import OverviewLocationCard from "~/components/environment/OverviewLocationCard.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import SimulationFrame from "~/components/common/SimulationFrame.vue"
import EnvironmentSimulation from "~/components/environment/EnvironmentSimulation.vue"
import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { useWebSocket } from "~/composables/websocket/useWebSocket"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import { useAlertRules } from "~/composables/monitoring/useAlertRules"
import { useAuth } from "~/composables/core/useAuth"
import { useEnvironmentSensors, type SensorReadings } from "~/composables/systems/environment/useEnvironmentSensors"
import type { EnvironmentReadingNewEvent } from "~/types/websocket"
import {
	getParameterDisplayName,
	getParameterUnit,
	getParameterIcon,
	getParameterFractionDigits,
	getLocationDeviceIds,
	cleanZone,
} from "~/utils/sensorUtils"
import type {
	EnvironmentZone,
	EnvironmentLocation,
	SensorParameter,
	SensorParameterType,
	SensorReading,
} from "~/types/environment"
import type { UnifiedZone } from "~/types/location"
import { unifiedToEnvironmentZone } from "~/utils/locationAdapter"
import { getTodayDateRangeUTC, getTimeRangeUTC } from "~/utils/dateUtils"
import { compareZonesLoose } from "~/utils/sortOrder"
import { findLocationIndexInZone, getLocationUiKey } from "~/utils/locationUiId"
import { calculateAqiScore } from "~/utils/environmentAqi"

definePageMeta({
	layout: "default",
})

const { isOperator } = useAuth()

const environmentApi = useEnvironmentApi()
const locationApi = useLocationApi()
const { isConnected, on, off } = useWebSocket()
const { handleError } = useErrorHandler()
const { getRules, getStatusText: getStatusTextFromRules } = useAlertRules()

// 警報規則緩存
const alertRules = ref<any[]>([])
const rulesLoaded = ref(false)

// 環境區域和地點資料
const environmentZones = ref<EnvironmentZone[]>([])
const isLoadingZones = ref(false)
const showLocationManagementDialog = ref(false)
const showSimulationFrame = ref(false)
const simulationReadingsSummary = ref<SensorReading[]>([])
const simulationReadingsDetail = ref<SensorReading[]>([])
const selectedLocationId = ref<string>("")

const { start: todayStart, end: todayEnd } = getTodayDateRangeUTC()
const simulationTimeRange = ref({
	startDate: todayStart.toISOString(),
	endDate: todayEnd.toISOString(),
	preset: "today",
})

// 模擬框用：區域名、地點名、設備配置字串
const simulationZoneName = computed(() =>
	currentLocationData.value ? (getLocationZone(currentLocationData.value) ?? "") : ""
)
const simulationLocationName = computed(() => currentLocationData.value?.name ?? "")

const loadSimulationReadings = async () => {
	const loc = currentLocationData.value
	const preset = simulationTimeRange.value.preset
	const startDate = simulationTimeRange.value.startDate
	const endDate = simulationTimeRange.value.endDate
	if (!loc?.id || !startDate || !endDate) {
		simulationReadingsSummary.value = []
		simulationReadingsDetail.value = []
		return
	}
	try {
		const isDayRange = preset === "today" || preset === "yesterday"
		if (isDayRange) {
			const [summaryRes, detailRes] = await Promise.all([
				environmentApi.getReadingsAggregated(loc.id, {
					bucket: "hour",
					startTime: startDate,
					endTime: endDate,
				}),
				environmentApi.getReadings(loc.id, {
					startTime: startDate,
					endTime: endDate,
					limit: 500,
				}),
			])
			simulationReadingsSummary.value = summaryRes.readings ?? []
			simulationReadingsDetail.value = detailRes.readings ?? []
		} else {
			// 週／月（與其他較長區間）一律用「每日平均」避免 raw 的單次 limit 截斷
			const result = await environmentApi.getReadingsAggregated(loc.id, {
				bucket: "day",
				startTime: startDate,
				endTime: endDate,
			})
			simulationReadingsSummary.value = []
			simulationReadingsDetail.value = result.readings ?? []
		}
	} catch (error) {
		handleError(error, "載入環境讀數失敗")
		simulationReadingsSummary.value = []
		simulationReadingsDetail.value = []
	}
}

const handleSimulationTimeRangeUpdate = (v: {
	startDate: string
	endDate: string
	preset: string
}) => {
	simulationTimeRange.value = v
	void loadSimulationReadings()
}

const handleOpenSimulation = async () => {
	const { start, end } = getTodayDateRangeUTC()
	simulationTimeRange.value = {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset: "today",
	}
	showSimulationFrame.value = true
	await loadSimulationReadings()
}

// 獲取地點所屬的區域名稱
const getLocationZone = (location: EnvironmentLocation): string | null => {
	for (const zone of environmentZones.value) {
		if (zone.locations.some((loc) => loc.id === location.id || loc.name === location.name)) {
			return zone.name
		}
	}
	return null
}

// 獲取地點 ID（一律字串，供總覽 Map key 與 API 對應）
const getLocationId = (location: EnvironmentLocation): string => {
	// UI 穩定 key：優先 DB id，否則 `location-${zoneKey}-${index}`（避免 rename 造成 key 變動）
	const zone =
		environmentZones.value.find((z) =>
			(z.locations || []).some(
				(l) => l === location || (l.id && location.id && String(l.id) === String(location.id))
			)
		) ?? null
	if (!zone) {
		const zoneName = getLocationZone(location)
		return `${zoneName || "unknown"}-${location.name}`
	}
	const idx = findLocationIndexInZone(zone, location)
	if (idx < 0) {
		const zoneName = getLocationZone(location)
		return `${zoneName || "unknown"}-${location.name}`
	}
	return getLocationUiKey({ zone, location, locationIndex: idx })
}

// 當前選中的地點
const currentLocationData = computed<EnvironmentLocation | null>(() => {
	if (!selectedLocationId.value) return null

	for (const zone of environmentZones.value) {
		const location = zone.locations.find((loc) => getLocationId(loc) === selectedLocationId.value)
		if (location) return location
	}
	return null
})

const {
	createEmptySensorReadings,
	sensorData,
	allLocationsSensorData,
	getLocationSensorData,
	isFetching,
	isSensorOffline,
	overviewLoadingMap,
	loadSensorData,
	loadLocationSensorData,
	loadLocationSensorDataForOverview,
} = useEnvironmentSensors({
	environmentZones,
	selectedLocationId,
	currentLocationData,
	getLocationId,
})

// 噪音值和風速（使用 computed 從 sensorData 中取得，避免重複）
const noiseValue = computed(() => sensorData.noise)
const windSpeed = computed(() => sensorData.wind)

// 總覽面板收縮狀態
const isOverviewCollapsed = ref(false)

// 左側區域的 ref 和高度
const leftSectionRef = ref<HTMLElement | null>(null)
const leftSectionHeight = ref<number | null>(null)

// ResizeObserver 用於動態監聽左側區域高度變化
let leftSectionResizeObserver: ResizeObserver | null = null

// 更新左側高度
const updateLeftSectionHeight = () => {
	if (leftSectionRef.value) {
		leftSectionHeight.value = leftSectionRef.value.offsetHeight
	}
}

// 初始化 ResizeObserver
const initLeftSectionObserver = () => {
	if (typeof ResizeObserver === "undefined") return
	if (!leftSectionRef.value) return

	leftSectionResizeObserver = new ResizeObserver((entries) => {
		if (entries.length) {
			leftSectionHeight.value = entries[0].contentRect.height
		}
	})
	leftSectionResizeObserver.observe(leftSectionRef.value)
}

// 監聽左側區域高度變化由 ResizeObserver 處理，僅需在區域/地點變化時更新一次
watch([currentLocationData, environmentZones], () => {
	nextTick(() => {
		updateLeftSectionHeight()
	})
})

// 與 environmentZones 順序一致（區域已依 sort_order／名稱慣例排序，地點依後端陣列序）
const sortedLocations = computed(() => environmentZones.value.flatMap((zone) => zone.locations))

// 啟用的參數（用於顯示）
const enabledParameters = computed(() => {
	if (!currentLocationData.value) return []
	return currentLocationData.value.parameters.filter((param) => param.enabled)
})

// getLocationZone / getLocationId 已於上方宣告，供 composable 與 currentLocationData 共用

// 處理環境讀數新事件
const handleEnvironmentReadingNew = (event: EnvironmentReadingNewEvent) => {
	const { locationId, reading } = event
	const locationIdStr = String(locationId)

	// 更新當前選中地點的資料
	if (currentLocationData.value?.id === locationIdStr) {
		Object.keys(reading).forEach((key) => {
			if (key in sensorData) {
				;(sensorData as any)[key] = reading[key]
			}
		})
	}

	// 更新總覽面板的資料
	const existingData =
		allLocationsSensorData.value.get(locationIdStr) || createEmptySensorReadings()
	Object.keys(reading).forEach((key) => {
		if (key in existingData) {
			;(existingData as any)[key] = reading[key]
		}
	})
	allLocationsSensorData.value.set(locationIdStr, existingData)
}

// 選擇地點
const selectLocation = (location: EnvironmentLocation) => {
	selectedLocationId.value = getLocationId(location)

	// 載入該地點的感測器資料
	void loadLocationSensorData(location)
}

// 總覽面板載入狀態追蹤由 useEnvironmentSensors 管理

// 輪詢間隔：每 30 秒
const POLLING_INTERVAL = 30000

// 取得「總覽用」的載入 promise 列表（所有有設備且非選中地點）
const getOverviewLoadPromises = (): Promise<void>[] => {
	const promises: Promise<void>[] = []
	for (const zone of environmentZones.value) {
		for (const location of zone.locations) {
			if (getLocationDeviceIds(location).length === 0) continue
			if (getLocationId(location) === selectedLocationId.value) continue
			promises.push(loadLocationSensorDataForOverview(location))
		}
	}
	return promises
}

// 使用 usePolling 統一管理輪詢：總覽會讀取「所有地點」的感測器資料（含大門口等）
const { start: startPolling, stop: stopPolling } = usePolling({
	callback: async () => {
		const promises: Promise<void>[] = []
		if (selectedLocationId.value && currentLocationData.value) {
			promises.push(loadSensorData())
		}
		promises.push(...getOverviewLoadPromises())
		await Promise.allSettled(promises)
	},
	interval: POLLING_INTERVAL,
	immediate: true, // 進站時先跑一輪，讓選中地點與總覽所有地點都有資料
	onError: (err) => {
		handleError(err, "載入感測器資料失敗")
	},
})

// 感測器讀值／總覽資料查找已由 useEnvironmentSensors 統一處理

// cleanLocation 和 cleanZone 已從 composable 導入

// 載入區域和地點資料
const loadZonesFromAPI = async () => {
	if (isLoadingZones.value) return
	isLoadingZones.value = true
	try {
		const result = await environmentApi.getZones()
		// 與首頁／全區一致：sort_order → 名稱數字 → id
		const sortedZones = [...(result.zones || []).map(cleanZone)].sort((a, b) =>
			compareZonesLoose(a, b)
		)
		environmentZones.value = sortedZones
		if (!selectedLocationId.value) {
			const first = sortedZones.find((z) => z.locations?.length)?.locations?.[0]
			if (first) selectLocation(first)
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

const startAutoRefresh = () => {
	startPolling()
}

const stopAutoRefresh = () => {
	stopPolling()
}

// 使用區域管理 composable
const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<EnvironmentLocation, EnvironmentZone>()

// 處理儲存區域
const handleSaveZone = async (zone: EnvironmentZone) => {
	await baseHandleSaveZone(
		zone,
		environmentZones,
		async (z: EnvironmentZone) => {
			// 檢查是否為臨時 ID（以 temp- 開頭）或有效的數字 ID
			const isValidId = z.id && !z.id.startsWith("temp-") && /^\d+$/.test(z.id)
			const result = isValidId
				? await environmentApi.updateZone(z.id, {
						name: z.name,
						sortOrder: (z as unknown as { sortOrder?: number }).sortOrder,
						locations: z.locations,
					})
				: await environmentApi.createZone({
						name: z.name,
						sortOrder: (z as unknown as { sortOrder?: number }).sortOrder,
						locations: z.locations,
					})
			// 確保返回的 zone 有 id
			const zoneWithId = { ...result.zone, id: result.zone.id || z.id } as EnvironmentZone & {
				id: string
			}
			return {
				merged: result.merged,
				message: result.message,
				zone: zoneWithId,
			}
		},
		{
			cleanZone: cleanZone,
		}
	)
}

// 處理刪除區域
const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, environmentZones, environmentApi.deleteZone, {
		selectedLocationRef: selectedLocationId,
		getLocationId,
		systemType: "environment",
		onAfterDelete: async () => {
			await loadZonesFromAPI()
		},
	})
}

// 獲取參數值
const getParameterValue = (type: SensorParameter["type"]): number | null => {
	let value: number | null = null
	switch (type) {
		case "pm25":
			value = sensorData.pm25
			break
		case "pm10":
			value = sensorData.pm10
			break
		case "tvoc":
			value = sensorData.tvoc
			break
		case "hcho":
			value = sensorData.hcho
			break
		case "humidity":
			value = sensorData.humidity
			break
		case "temperature":
			value = sensorData.temperature
			break
		case "co2":
			value = sensorData.co2
			break
		case "noise":
			value = sensorData.noise
			break
		case "wind":
			value = sensorData.wind
			break
		default:
			return null
	}

	return value
}

// getParameterIcon 和 getParameterFractionDigits 已從 composable 導入

// 檢查是否為當前選中的地點
const isCurrentLocation = (location: EnvironmentLocation): boolean => {
	return getLocationId(location) === selectedLocationId.value
}

// 獲取地點的顯示資料（支援所有地點，不僅限於當前選中）
const getLocationDisplayData = (location: EnvironmentLocation) => {
	// 優先使用資料庫 ID（與 WebSocket 一致），key 統一字串
	const locationId = location.id != null ? String(location.id) : getLocationId(location)
	const locationSensorData = getLocationSensorData(locationId)

	const dataSource = isCurrentLocation(location) ? sensorData : locationSensorData
	if (!dataSource) {
		return {
			params: undefined,
			aqi: null,
			noise: null,
		}
	}

	// 取得該地點的啟用參數
	const locationParams = location.parameters.filter((param) => param.enabled)

	return {
		params: locationParams.map((param) => {
			const value = dataSource[param.type]
			return {
				label: getParameterDisplayName(param.type),
				value: value !== null ? toFixedNumber(value, getParameterFractionDigits(param.type)) : "--",
				unit: getParameterUnit(param.type),
				alertClass: getStatusTextClass(param.type, value),
				type: param.type, // 傳遞參數類型用於狀態判斷
				rawValue: value, // 傳遞原始數值用於狀態判斷
			}
		}),
		aqi: calculateAQI(dataSource),
		noise: dataSource.noise,
	}
}

const getOverviewLocationCardBindings = (location: EnvironmentLocation) => {
	const displayData = getLocationDisplayData(location)
	return {
		aqi: displayData.aqi,
		noise: displayData.noise,
		params: displayData.params,
	}
}

// 監聽 WebSocket 連接狀態
watch(
	isConnected,
	(connected) => {
		if (connected) {
			// 設置事件監聽器
			on("environment:reading:new", handleEnvironmentReadingNew)
		} else {
			// 移除事件監聽器
			off("environment:reading:new", handleEnvironmentReadingNew)
		}

		// 重新啟動自動刷新（根據連接狀態調整間隔）
		stopAutoRefresh()
		startAutoRefresh()
	},
	{ immediate: true }
)

// 注意：環境感測器讀數現在會自動推送給所有客戶端，不需要房間訂閱

// 載入警報規則（`useAlertRules`：單次 GET 全量後依 threshold 過濾，失敗回空陣列）
const loadAlertRules = async () => {
	const rules = await getRules("environment", "threshold")
	alertRules.value = rules
	rulesLoaded.value = true
}

onMounted(async () => {
	// 載入警報規則（優先載入，確保狀態判斷使用正確的規則）
	await loadAlertRules()

	// 初始化左側 ResizeObserver
	initLeftSectionObserver()

	// 載入區域和地點資料（從環境 API）
	await loadZonesFromAPI()

	// 進站時並行載入：選中地點主面板 + 總覽所有地點
	const initialLoadPromises: Promise<void>[] = []
	if (currentLocationData.value && getLocationDeviceIds(currentLocationData.value).length > 0) {
		initialLoadPromises.push(loadLocationSensorData(currentLocationData.value))
	}
	initialLoadPromises.push(...getOverviewLoadPromises())
	await Promise.allSettled(initialLoadPromises)

	// 啟動輪詢（immediate: true 會再跑一輪，之後每 30 秒讀取所有地點）
	startAutoRefresh()

	// 更新左側高度（初始化）
	nextTick(() => {
		updateLeftSectionHeight()
	})
})

onBeforeUnmount(() => {
	stopAutoRefresh()

	// 移除 WebSocket 監聽器
	off("environment:reading:new", handleEnvironmentReadingNew)

	// 釋放 ResizeObserver
	if (leftSectionResizeObserver && leftSectionRef.value) {
		leftSectionResizeObserver.unobserve(leftSectionRef.value)
		leftSectionResizeObserver.disconnect()
		leftSectionResizeObserver = null
	}
})

const toFixedNumber = (value: number | null, fractionDigits = 0) => {
	if (value === null || Number.isNaN(value)) {
		return 0
	}
	return Number(value.toFixed(fractionDigits))
}

// 計算 AQI（共用函數）
const calculateAQI = (data: SensorReadings): number | null => {
	return calculateAqiScore({ pm25: data.pm25, pm10: data.pm10 })
}

// 當沒有設備時，AQI 和溫度應該為 null
const aqiScore = computed(() => {
	if (!getLocationDeviceIds(currentLocationData.value).length) return null
	return calculateAQI(sensorData)
})

const currentTemperature = computed(() => {
	if (!getLocationDeviceIds(currentLocationData.value).length) return null
	return sensorData.temperature
})

// 取得當前地點的顯示字串（共用函數）
const getCurrentLocationString = (): string => {
	if (!currentLocationData.value) return "請選擇地點"
	const zoneName = getLocationZone(currentLocationData.value)
	return `${zoneName || ""} / ${currentLocationData.value.name}`
}

const aqiData = computed(() => ({
	value: aqiScore.value,
	location: getCurrentLocationString(),
	metrics: [
		{ label: "PM2.5", value: toFixedNumber(sensorData.pm25), unit: "µg/m³" },
		{ label: "PM10", value: toFixedNumber(sensorData.pm10), unit: "µg/m³" },
		{ label: "CO₂", value: toFixedNumber(sensorData.co2), unit: "ppm" },
		{ label: "TVOC", value: toFixedNumber(sensorData.tvoc, 1), unit: "ppm" },
		{ label: "HCHO", value: toFixedNumber(sensorData.hcho), unit: "ppm" },
		{ label: "濕度", value: toFixedNumber(sensorData.humidity, 1), unit: "%" },
	],
}))

const environmentData = computed(() => ({
	temperature: toFixedNumber(sensorData.temperature, 1),
	location: getCurrentLocationString(),
	metrics: [
		{
			label: "溫度",
			value: toFixedNumber(sensorData.temperature, 1),
			unit: "°C",
			icon: "temperature",
		},
		{ label: "濕度", value: toFixedNumber(sensorData.humidity, 1), unit: "%", icon: "humidity" },
		{ label: "CO₂", value: toFixedNumber(sensorData.co2), unit: "ppm", icon: "CO₂" },
	],
}))

// 狀態判斷函數（基於 getStatusText 的結果，確保與規則一致）
// 注意：這些函數現在基於 getStatusText 的結果，而不是硬編碼閾值
// 這樣可以確保與後端規則一致
const getStatusClass = (type: string, value: number | null): string => {
	if (value === null) return ""

	const status = getStatusText(type, value)
	if (status === "正常") return ""
	if (status === "注意") return "border-yellow-400"
	if (status === "警報") return "border-red-400 bg-red-500/20"
	return ""
}

const getStatusDotClass = (type: string, value: number | null): string => {
	if (value === null) return "bg-gray-400"

	const status = getStatusText(type, value)
	if (status === "正常") return "bg-green-400"
	if (status === "注意") return "bg-yellow-400"
	if (status === "警報") return "bg-red-400"

	// 特殊處理：某些參數沒有規則時預設為正常
	if (type === "tvoc" || type === "hcho" || type === "wind") {
		return "bg-green-400"
	}

	return "bg-gray-400"
}

// 預設狀態判斷（向後兼容，當規則未載入時使用）
const getDefaultStatusText = (type: string, value: number | null): string => {
	if (value === null) return "無資料"

	switch (type) {
		case "pm25":
			if (value <= 25) return "正常"
			if (value <= 50) return "注意"
			return "警報"
		case "pm10":
			if (value <= 50) return "正常"
			if (value <= 100) return "注意"
			return "警報"
		case "co2":
			if (value <= 1000) return "正常"
			if (value <= 2000) return "注意"
			return "警報"
		case "tvoc":
		case "hcho":
			return "正常"
		case "temperature":
			if (value >= 20 && value <= 26) return "正常"
			if ((value >= 18 && value < 20) || (value > 26 && value <= 28)) return "注意"
			return "警報"
		case "humidity":
			if (value >= 30 && value <= 60) return "正常"
			if ((value >= 20 && value < 30) || (value > 60 && value <= 70)) return "注意"
			return "警報"
		case "wind":
			return "正常"
		case "noise":
			if (value <= 55) return "正常"
			if (value <= 70) return "注意"
			return "警報"
		default:
			return "正常"
	}
}

// 使用後端規則的狀態判斷（優先使用規則，失敗時使用預設值）
const getStatusText = (type: string, value: number | null): string => {
	if (value === null) return "無資料"

	// 如果規則已載入，使用規則判斷
	if (rulesLoaded.value && alertRules.value.length > 0) {
		try {
			const status = getStatusTextFromRules(type, value, alertRules.value)
			return status
		} catch (error) {
			console.warn("[environment] 使用規則判斷狀態失敗，使用預設值:", error)
		}
	}

	// 否則使用預設值（向後兼容）
	return getDefaultStatusText(type, value)
}

const getStatusTextClass = (type: string, value: number | null): string => {
	if (value === null) return "text-white/50"

	const status = getStatusText(type, value)
	if (status === "正常") return "text-green-300"
	if (status === "注意") return "text-yellow-300"
	if (status === "警報" || status === "異常") return "text-red-300"
	return "text-white/70"
}

/** 完整報表儲存格背景：超過閾值標黃/紅 */
const getReportCellClass = (type: string, value: number | null): string => {
	if (value === null) return ""
	const status = getStatusText(type, value)
	if (status === "注意") return "bg-yellow-500/30"
	if (status === "警報" || status === "異常") return "bg-red-500/30"
	return ""
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>

