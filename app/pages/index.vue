<template>
	<div class="space-y-4 2xl:space-y-6">
		<!-- Main Content -->
		<div class="grid grid-cols-3 gap-6 2xl:gap-8">
			<!-- Left Column -->
			<div class="col-span-2 space-y-6 2xl:space-y-8">
				<!-- Data Cards Section -->
				<div class="overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30">
					<div class="grid h-full grid-cols-12">
						<!-- AQI Card -->
						<AQICard
							v-model="selectedAqiLocationId"
							class="col-span-7"
							:aqi="aqiData"
							:options="locationOptions"
							placeholder="請選擇 AQI 地點"
							textSize="text-sm 2xl:text-base"
						/>

						<!-- Environmental Card -->
						<EnvironmentCard
							v-model="selectedEnvironmentLocationId"
							class="col-span-5"
							:data="environmentData"
							:options="locationOptions"
							placeholder="請選擇環境地點"
							textSize="text-sm 2xl:text-base"
						/>
					</div>
				</div>

				<!-- System Modules Section -->
				<div
					class="overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30 px-12 2xl:px-24"
				>
					<SystemModule />
				</div>
			</div>

			<!-- Right Column -->
			<div class="col-span-1 grid grid-rows-12">
				<div class="row-span-12 overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30">
					<!-- Building Image Card -->
					<BuildingCard />
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import AQICard from "~/components/home/AQICard.vue"
import EnvironmentCard from "~/components/home/EnvironmentCard.vue"
import BuildingCard from "~/components/home/BuildingCard.vue"
import SystemModule from "~/components/home/SystemModule.vue"
import { useDeviceApi } from "~/composables/systems/useDeviceApi"
import { useApiBase } from "~/composables/core/useApiBase"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useLocationApi } from "~/composables/systems/location/useLocationApi"
import { useZoneManagement } from "~/composables/systems/useZoneManagement"
import type { UnifiedZone, UnifiedLocation, EnvironmentSystemConfig } from "~/types/location"
import { isDeviceConnectionError } from "~/utils/errorUtils"
import { firstLocationInSortedZones } from "~/utils/sortOrder"
import type { ModbusDeviceConfig, ModbusDataResponse } from "~/types/modbus"
import type { Device, SensorDeviceConfig, SensorDeviceModelConfig } from "~/types/device"
import type { SensorParameterType } from "~/types/environment"

definePageMeta({
	layout: "default",
})

const locationApi = useLocationApi()
const { sortZones } = useZoneManagement<UnifiedZone>()
const deviceApi = useDeviceApi()
const { request } = useApiBase()
const toast = useToast()
const { handleError } = useErrorHandler()

type SensorReadings = {
	pm25: number | null
	pm10: number | null
	tvoc: number | null
	hcho: number | null
	humidity: number | null
	temperature: number | null
	co2: number | null
	noise: number | null
	wind: number | null
}

const OFFLINE_ALERT_INTERVAL = 30000 // 每 30 秒最多顯示一次離線警報

const createEmptySensorReadings = (): SensorReadings => ({
	pm25: null,
	pm10: null,
	tvoc: null,
	hcho: null,
	humidity: null,
	temperature: null,
	co2: null,
	noise: null,
	wind: null,
})

// 兩張卡片可各自選擇不同地點，因此拆成兩份感測器資料與狀態
const aqiSensorData = reactive<SensorReadings>(createEmptySensorReadings())
const environmentSensorData = reactive<SensorReadings>(createEmptySensorReadings())

const isFetchingAqi = ref(false)
const isFetchingEnvironment = ref(false)

const isAqiSensorOffline = ref(false)
const isEnvironmentSensorOffline = ref(false)

const lastAqiOfflineAlertTime = ref<number | null>(null)
const lastEnvironmentOfflineAlertTime = ref<number | null>(null)

// 區域地點選擇（AQI / 環境可分開選；會寫入 localStorage 以固定下次進入首頁的選擇）
const selectedAqiLocationId = ref<string>("")
const selectedEnvironmentLocationId = ref<string>("")

const LS_HOME_AQI_LOCATION_ID = "ba-central-home-aqi-location-id"
const LS_HOME_ENV_LOCATION_ID = "ba-central-home-environment-location-id"

/** 還原／套用預設時略過 watch 內的感測器載入，改由 onMounted 結尾統一載入 */
const isHydratingHomeLocationSelections = ref(false)

const persistHomeAqiLocationId = () => {
	if (!import.meta.client) return
	const v = selectedAqiLocationId.value
	if (v) localStorage.setItem(LS_HOME_AQI_LOCATION_ID, v)
	else localStorage.removeItem(LS_HOME_AQI_LOCATION_ID)
}

const persistHomeEnvironmentLocationId = () => {
	if (!import.meta.client) return
	const v = selectedEnvironmentLocationId.value
	if (v) localStorage.setItem(LS_HOME_ENV_LOCATION_ID, v)
	else localStorage.removeItem(LS_HOME_ENV_LOCATION_ID)
}

const restoreHomeLocationSelectionsFromStorage = () => {
	if (!import.meta.client) return
	const a = localStorage.getItem(LS_HOME_AQI_LOCATION_ID)
	const e = localStorage.getItem(LS_HOME_ENV_LOCATION_ID)
	if (a) selectedAqiLocationId.value = a
	if (e) selectedEnvironmentLocationId.value = e
}

const getValidHomeLocationOptionIds = (): Set<string> =>
	new Set(locationOptions.value.map((o) => o.value))

const reconcileHomeLocationSelectionsWithZones = (): void => {
	if (unifiedZones.value.length === 0) {
		selectedAqiLocationId.value = ""
		selectedEnvironmentLocationId.value = ""
		return
	}
	const valid = getValidHomeLocationOptionIds()
	if (selectedAqiLocationId.value && !valid.has(selectedAqiLocationId.value)) {
		selectedAqiLocationId.value = ""
	}
	if (selectedEnvironmentLocationId.value && !valid.has(selectedEnvironmentLocationId.value)) {
		selectedEnvironmentLocationId.value = ""
	}
	const defaultLocation = firstLocationInSortedZones(unifiedZones.value)
	if (!defaultLocation) return
	const defaultId = getLocationId(defaultLocation)
	if (!selectedAqiLocationId.value) selectedAqiLocationId.value = defaultId
	if (!selectedEnvironmentLocationId.value) selectedEnvironmentLocationId.value = defaultId
}

// 設備快取（避免每次輪詢都打設備 API）
const deviceCache = new Map<number, Device>()

// 區域與地點（統一地點管理）
const unifiedZones = ref<UnifiedZone[]>([])
const isLoadingZones = ref(false)

const getLocationId = (location: UnifiedLocation): string => {
	return location.id || `unknown-${location.name}`
}

const extractEnvironmentLocation = (unifiedLocation: UnifiedLocation) => {
	const envSystem = unifiedLocation.systems?.find((s) => s.systemType === "environment")
	if (!envSystem) {
		return null
	}

	const config = envSystem.config as EnvironmentSystemConfig | undefined
	if (!config) {
		return null
	}

	const deviceIds =
		Array.isArray(config.deviceIds) && config.deviceIds.length > 0
			? config.deviceIds
			: config.deviceId != null
				? [config.deviceId]
				: []

	return {
		id: unifiedLocation.id,
		systemId: envSystem.id,
		name: unifiedLocation.name,
		deviceId: config.deviceId,
		deviceIds,
	}
}

const findUnifiedLocationByLocationId = (locationId: string): UnifiedLocation | null => {
	if (!locationId) {
		return null
	}

	for (const zone of unifiedZones.value) {
		const location = zone.locations.find((loc) => getLocationId(loc) === locationId)
		if (location) {
			return location
		}
	}

	return null
}

const getEnvironmentDeviceIdsByLocationId = (locationId: string): number[] => {
	const unifiedLocation = findUnifiedLocationByLocationId(locationId)
	if (!unifiedLocation) return []
	const env = extractEnvironmentLocation(unifiedLocation)
	if (!env) return []
	return env.deviceIds?.length ? env.deviceIds : env.deviceId != null ? [env.deviceId] : []
}

const locationOptions = computed(() => {
	const options: Array<{ value: string; label: string }> = []

	unifiedZones.value.forEach((zone) => {
		zone.locations.forEach((location) => {
			const locationId = getLocationId(location)
			const label = `${zone.name} - ${location.name}`
			options.push({ value: locationId, label })
		})
	})

	return options
})

const loadZones = async (): Promise<void> => {
	if (isLoadingZones.value) {
		return
	}

	isLoadingZones.value = true

	try {
		const result = await locationApi.getZones("environment")
		const zones = result.zones || []
		unifiedZones.value = sortZones(zones)
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}
}

// 使用 usePolling 統一管理輪詢
const { start: startPolling } = usePolling({
	callback: async () => {
		await Promise.allSettled([loadAqiSensorData(), loadEnvironmentSensorData()])
	},
	interval: 30000, // 每 30 秒執行一次
	immediate: false, // 不在啟動時立即執行（因為 onMounted 會手動執行一次）
	onError: (err) => {
		handleError(err, "載入感測器資料失敗")
	},
})

type AQIBreakpoint = {
	concentrationRange: [number, number]
	indexRange: [number, number]
}

const PM25_BREAKPOINTS: AQIBreakpoint[] = [
	{ concentrationRange: [0, 12], indexRange: [0, 50] },
	{ concentrationRange: [12.1, 35.4], indexRange: [51, 100] },
	{ concentrationRange: [35.5, 55.4], indexRange: [101, 150] },
	{ concentrationRange: [55.5, 150.4], indexRange: [151, 200] },
	{ concentrationRange: [150.5, 250.4], indexRange: [201, 300] },
	{ concentrationRange: [250.5, 350.4], indexRange: [301, 400] },
	{ concentrationRange: [350.5, 500.4], indexRange: [401, 500] },
]

const PM10_BREAKPOINTS: AQIBreakpoint[] = [
	{ concentrationRange: [0, 54], indexRange: [0, 50] },
	{ concentrationRange: [55, 154], indexRange: [51, 100] },
	{ concentrationRange: [155, 254], indexRange: [101, 150] },
	{ concentrationRange: [255, 354], indexRange: [151, 200] },
	{ concentrationRange: [355, 424], indexRange: [201, 300] },
	{ concentrationRange: [425, 504], indexRange: [301, 400] },
	{ concentrationRange: [505, 604], indexRange: [401, 500] },
]

const calculatePollutantAQI = (
	value: number | null,
	breakpoints: AQIBreakpoint[]
): number | null => {
	if (value === null) {
		return null
	}

	const targetBreakpoint =
		breakpoints.find((breakpoint) => {
			const [cLow, cHigh] = breakpoint.concentrationRange
			return value >= cLow && value <= cHigh
		}) ?? breakpoints[breakpoints.length - 1]

	const [cLow, cHigh] = targetBreakpoint.concentrationRange
	const [iLow, iHigh] = targetBreakpoint.indexRange

	const clampedValue = Math.min(Math.max(value, cLow), cHigh)
	const index = ((iHigh - iLow) / (cHigh - cLow)) * (clampedValue - cLow) + iLow

	return Math.round(index)
}

const getDeviceByIdCached = async (deviceId: number): Promise<Device | null> => {
	if (!deviceId || deviceId <= 0) {
		return null
	}

	const cached = deviceCache.get(deviceId)
	if (cached) {
		return cached
	}

	const result = await deviceApi.getDevice(deviceId)
	if (result?.device) {
		deviceCache.set(deviceId, result.device)
		return result.device
	}

	return null
}

const loadDeviceAndModelConfig = async (
	deviceId: number
): Promise<{ device: Device; modelConfig: SensorDeviceModelConfig | null } | null> => {
	try {
		const device = await getDeviceByIdCached(deviceId)
		if (!device || device.type_code !== "sensor") return null
		const deviceWithModel = device as { model?: { config?: SensorDeviceModelConfig } }
		let modelConfig: SensorDeviceModelConfig | null =
			deviceWithModel.model?.config != null ? (deviceWithModel.model!.config as SensorDeviceModelConfig) : null
		if (!modelConfig && device.model_id) {
			try {
				const { device_model } = await deviceApi.getDeviceModel(device.model_id)
				modelConfig = (device_model?.config as SensorDeviceModelConfig) ?? null
			} catch {
				// ignore
			}
		}
		return { device, modelConfig }
	} catch {
		return null
	}
}

const getParameterModbusConfigFromModel = (
	paramType: SensorParameterType,
	modelConfig: SensorDeviceModelConfig | null
): { address: number; transform?: string } | null => {
	if (!modelConfig?.sensorParameters) return null
	const paramDef = modelConfig.sensorParameters.find((p) => p.type === paramType)
	return paramDef?.modbusConfig?.address !== undefined
		? { address: paramDef.modbusConfig!.address, transform: paramDef.modbusConfig?.transform }
		: null
}

const readModbusRegister = async (
	modbusConfig: ModbusDeviceConfig,
	address: number
): Promise<ModbusDataResponse<number>> => {
	const queryParams = new URLSearchParams({
		host: modbusConfig.host,
		port: String(modbusConfig.port),
		unitId: String(modbusConfig.unitId),
		address: String(address),
	})
	return request<ModbusDataResponse<number>>(`/modbus/holding-registers?${queryParams.toString()}`)
}

const readModbusRegisterBatch = async (
	modbusConfig: ModbusDeviceConfig,
	startAddress: number,
	length: number
): Promise<ModbusDataResponse<number>> => {
	const queryParams = new URLSearchParams({
		host: modbusConfig.host,
		port: String(modbusConfig.port),
		unitId: String(modbusConfig.unitId),
		address: String(startAddress),
		length: String(length),
	})
	return request<ModbusDataResponse<number>>(`/modbus/holding-registers?${queryParams.toString()}`)
}

const applyTransform = (value: number, transform?: string): number => {
	if (!transform?.trim()) return value
	try {
		const trimmed = transform.trim()
		let formula = ""
		if (/^[\+\-\*\/]/.test(trimmed)) {
			if (trimmed.startsWith("-")) {
				const numPart = trimmed.substring(1).trim()
				formula = `${value} - ${numPart}`
			} else {
				formula = `${value} ${trimmed}`
			}
		} else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
			formula = `${value} - ${trimmed}`
		} else {
			formula = trimmed.replace(/value/gi, String(value))
		}
		const result = Function(`"use strict"; return (${formula})`)()
		return typeof result === "number" && !Number.isNaN(result) ? result : value
	} catch {
		return value
	}
}

type ParameterWithModbusConfig = { type: SensorParameterType; modbusConfig: { address: number; transform?: string } }
type BatchResult = { type: SensorParameterType; value: number | null; success: boolean }

const groupConsecutiveAddresses = (addresses: number[]): { start: number; length: number; addresses: number[] }[] => {
	if (addresses.length === 0) return []
	const sorted = [...addresses].sort((a, b) => a - b)
	const groups: { start: number; length: number; addresses: number[] }[] = []
	let current: number[] = [sorted[0]]
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === current[current.length - 1] + 1) {
			current.push(sorted[i])
		} else {
			groups.push({ start: current[0], length: current.length, addresses: [...current] })
			current = [sorted[i]]
		}
	}
	groups.push({ start: current[0], length: current.length, addresses: current })
	return groups
}

const mapParamListToResults = (
	list: ParameterWithModbusConfig[],
	rawValue: number,
	success: boolean
): BatchResult[] =>
	list.map((param) => ({
		type: param.type,
		value: success ? applyTransform(rawValue, param.modbusConfig.transform) : null,
		success,
	}))

const readParametersBatch = async (
	modbusConfig: ModbusDeviceConfig,
	paramAddressMap: Map<number, ParameterWithModbusConfig[]>
): Promise<BatchResult[]> => {
	const addresses = Array.from(paramAddressMap.keys()).sort((a, b) => a - b)
	if (addresses.length === 0) return []
	const addressGroups = groupConsecutiveAddresses(addresses)
	const readPromises: Promise<BatchResult[]>[] = []
	for (const group of addressGroups) {
		if (group.length > 1) {
			readPromises.push(
				readModbusRegisterBatch(modbusConfig, group.start, group.length)
					.then((res) =>
						group.addresses.flatMap((addr, idx) => {
							const list = paramAddressMap.get(addr)
							return list?.length ? mapParamListToResults(list, res.data[idx], true) : []
						})
					)
					.catch(async () => {
						const fallback = await Promise.all(
							group.addresses.map(async (addr) => {
								const list = paramAddressMap.get(addr)
								if (!list?.length) return []
								try {
									const res = await readModbusRegister(modbusConfig, addr)
									return mapParamListToResults(list, res.data[0], true)
								} catch {
									return mapParamListToResults(list, 0, false)
								}
							})
						)
						return fallback.flat()
					})
			)
		} else {
			const addr = group.addresses[0]
			const list = paramAddressMap.get(addr)
			if (list?.length) {
				readPromises.push(
					readModbusRegister(modbusConfig, addr)
						.then((res) => mapParamListToResults(list, res.data[0], true))
						.catch(() => mapParamListToResults(list, 0, false))
				)
			}
		}
	}
	return (await Promise.all(readPromises)).flat()
}

const PARAM_KEYS: SensorParameterType[] = [
	"pm25", "pm10", "tvoc", "hcho", "humidity", "temperature", "co2", "noise", "wind",
]

type LoadTarget = "aqi" | "environment"
const loadSensorDataByLocationId = async (params: {
	target: LoadTarget
	locationId: string
	targetSensorData: SensorReadings
	isFetchingRef: Ref<boolean>
	isOfflineRef: Ref<boolean>
	lastOfflineAlertTimeRef: Ref<number | null>
}): Promise<void> => {
	if (params.isFetchingRef.value || !params.locationId) return

	const deviceIds = getEnvironmentDeviceIdsByLocationId(params.locationId)
	if (deviceIds.length === 0) {
		Object.assign(params.targetSensorData, createEmptySensorReadings())
		return
	}

	params.isFetchingRef.value = true
	// 每輪清空後僅合併成功讀取值（多設備時風速等可來自不同設備）
	Object.assign(params.targetSensorData, createEmptySensorReadings())

	try {
		for (const deviceId of deviceIds) {
			const result = await loadDeviceAndModelConfig(deviceId)
			if (!result) continue
			const { device, modelConfig } = result
			const config = device.config as SensorDeviceConfig
			if (config?.protocol !== "modbus" || !config?.host || !config?.port) continue

			const modbusConfig: ModbusDeviceConfig = {
				host: config.host,
				port: config.port,
				unitId: config.unitId ?? 1,
			}

			const paramAddressMap = new Map<number, ParameterWithModbusConfig[]>()
			for (const paramType of PARAM_KEYS) {
				const modbusCfg = getParameterModbusConfigFromModel(paramType, modelConfig)
				if (!modbusCfg) continue
				const existing = paramAddressMap.get(modbusCfg.address) ?? []
				existing.push({ type: paramType, modbusConfig: modbusCfg })
				paramAddressMap.set(modbusCfg.address, existing)
			}
			if (paramAddressMap.size === 0) continue

			const results = await readParametersBatch(modbusConfig, paramAddressMap)
			for (const r of results) {
				if (r.success && r.value != null) {
					;(params.targetSensorData as Record<string, number | null>)[r.type] = r.value
				}
			}
		}

		if (params.isOfflineRef.value) {
			params.isOfflineRef.value = false
			params.lastOfflineAlertTimeRef.value = null
			toast.success(`${params.target === "aqi" ? "AQI" : "環境"} 感測器已恢復連線`, 5000)
		}
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		if (isDeviceConnectionError(errorMessage)) {
			const now = Date.now()
			const shouldShowAlert =
				!params.isOfflineRef.value ||
				params.lastOfflineAlertTimeRef.value === null ||
				now - params.lastOfflineAlertTimeRef.value >= OFFLINE_ALERT_INTERVAL
			if (shouldShowAlert) {
				params.isOfflineRef.value = true
				params.lastOfflineAlertTimeRef.value = now
				toast.warning(`${params.target === "aqi" ? "AQI" : "環境"} 感測器離線，無法讀取資料`, 8000)
			}
			return
		}
		if (!params.isOfflineRef.value) {
			handleError(error, "讀取感測器資料失敗")
		}
	} finally {
		params.isFetchingRef.value = false
	}
}

const loadAqiSensorData = async () => {
	return loadSensorDataByLocationId({
		target: "aqi",
		locationId: selectedAqiLocationId.value,
		targetSensorData: aqiSensorData,
		isFetchingRef: isFetchingAqi,
		isOfflineRef: isAqiSensorOffline,
		lastOfflineAlertTimeRef: lastAqiOfflineAlertTime,
	})
}

const loadEnvironmentSensorData = async () => {
	return loadSensorDataByLocationId({
		target: "environment",
		locationId: selectedEnvironmentLocationId.value,
		targetSensorData: environmentSensorData,
		isFetchingRef: isFetchingEnvironment,
		isOfflineRef: isEnvironmentSensorOffline,
		lastOfflineAlertTimeRef: lastEnvironmentOfflineAlertTime,
	})
}

watch(
	() => selectedAqiLocationId.value,
	async () => {
		persistHomeAqiLocationId()
		if (isHydratingHomeLocationSelections.value) return
		Object.assign(aqiSensorData, createEmptySensorReadings())
		await loadAqiSensorData()
	}
)

watch(
	() => selectedEnvironmentLocationId.value,
	async () => {
		persistHomeEnvironmentLocationId()
		if (isHydratingHomeLocationSelections.value) return
		Object.assign(environmentSensorData, createEmptySensorReadings())
		await loadEnvironmentSensorData()
	}
)

onMounted(async () => {
	isHydratingHomeLocationSelections.value = true
	try {
		restoreHomeLocationSelectionsFromStorage()
		await loadZones()
		reconcileHomeLocationSelectionsWithZones()
		persistHomeAqiLocationId()
		persistHomeEnvironmentLocationId()
	} finally {
		isHydratingHomeLocationSelections.value = false
	}
	await Promise.allSettled([loadAqiSensorData(), loadEnvironmentSensorData()])
	startPolling()
})

const toFixedNumber = (value: number | null, fractionDigits = 0) => {
	if (value === null || Number.isNaN(value)) {
		return 0
	}
	return Number(value.toFixed(fractionDigits))
}

const getSelectedLocationLabel = (locationId: string) => {
	const option = locationOptions.value.find((opt) => opt.value === locationId)
	return option?.label || "未選擇地點"
}

const aqiScore = computed(() => {
	const pollutantAQIs = [
		calculatePollutantAQI(aqiSensorData.pm25, PM25_BREAKPOINTS),
		calculatePollutantAQI(aqiSensorData.pm10, PM10_BREAKPOINTS),
	].filter((value): value is number => value !== null)

	if (!pollutantAQIs.length) {
		return 0
	}

	return Math.max(...pollutantAQIs)
})

const aqiData = computed(() => ({
	value: aqiScore.value,
	location: getSelectedLocationLabel(selectedAqiLocationId.value),
	metrics: [
		{
			label: "PM2.5",
			value: toFixedNumber(aqiSensorData.pm25),
			unit: "µg/m³",
			icon: "PM2.5",
		},
		{
			label: "PM10",
			value: toFixedNumber(aqiSensorData.pm10),
			unit: "µg/m³",
			icon: "PM10",
		},
		{
			label: "溫度",
			value: toFixedNumber(aqiSensorData.temperature, 1),
			unit: "°C",
			icon: "temperature",
		},
		{
			label: "濕度",
			value: toFixedNumber(aqiSensorData.humidity, 1),
			unit: "%",
			icon: "humidity",
		},
		{
			label: "風速",
			value: toFixedNumber(aqiSensorData.wind, 1),
			unit: "m/s",
			icon: "wind",
		},
		{
			label: "噪音",
			value: toFixedNumber(aqiSensorData.noise),
			unit: "dB",
			icon: "noise",
		},
	],
}))

const environmentData = computed(() => ({
	temperature: toFixedNumber(environmentSensorData.temperature, 1),
	location: getSelectedLocationLabel(selectedEnvironmentLocationId.value),
	metrics: [
		{
			label: "濕度",
			value: toFixedNumber(environmentSensorData.humidity, 1),
			unit: "%",
			icon: "humidity",
		},
		{
			label: "CO₂",
			value: toFixedNumber(environmentSensorData.co2),
			unit: "ppm",
			icon: "CO2",
		},
		{
			label: "PM2.5",
			value: toFixedNumber(environmentSensorData.pm25),
			unit: "µg/m³",
			icon: "PM2.5",
		},
	],
}))
</script>
