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
import type { ModbusDeviceConfig, ModbusDataResponse } from "~/types/modbus"
import type { Device, SensorDeviceConfig } from "~/types/device"

definePageMeta({
	layout: "default",
})

const locationApi = useLocationApi()
const { sortZones } = useZoneManagement<UnifiedZone>()
const deviceApi = useDeviceApi()
const { request } = useApiBase()
const toast = useToast()
const { handleError } = useErrorHandler()

const SENSOR_ADDRESSES = {
	PM25: 0,
	PM10: 1,
	TVOC: 2,
	HCHO: 3,
	HUMIDITY: 4,
	TEMPERATURE: 5,
	CO2: 6,
} as const

type SensorReadings = {
	pm25: number | null
	pm10: number | null
	tvoc: number | null
	hcho: number | null
	humidity: number | null
	temperature: number | null
	co2: number | null
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

// 區域地點選擇（AQI / 環境可分開選）
const selectedAqiLocationId = ref<string>("")
const selectedEnvironmentLocationId = ref<string>("")

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

	return {
		id: unifiedLocation.id,
		systemId: envSystem.id,
		name: unifiedLocation.name,
		deviceId: config.deviceId,
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

const getEnvironmentDeviceIdByLocationId = (locationId: string): number | null => {
	const unifiedLocation = findUnifiedLocationByLocationId(locationId)
	if (!unifiedLocation) {
		return null
	}

	const envLocation = extractEnvironmentLocation(unifiedLocation)
	return envLocation?.deviceId ?? null
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

const DEFAULT_LOCATION = { zoneName: "遠岫", locationName: "大門口" }

const loadZones = async (): Promise<boolean> => {
	if (isLoadingZones.value) {
		return false
	}

	isLoadingZones.value = true
	let didSetDefaultSelection = false

	try {
		const result = await locationApi.getZones("environment")
		const zones = result.zones || []
		unifiedZones.value = sortZones(zones)

		if (unifiedZones.value.length === 0) {
			return false
		}

		let defaultLocation: UnifiedLocation | undefined

		for (const zone of unifiedZones.value) {
			if (zone.name === DEFAULT_LOCATION.zoneName) {
				const found = zone.locations.find((loc) => loc.name === DEFAULT_LOCATION.locationName)
				if (found) {
					defaultLocation = found
					break
				}
			}
		}

		if (!defaultLocation) {
			defaultLocation = unifiedZones.value.flatMap((zone) => zone.locations)[0]
		}

		if (defaultLocation) {
			const defaultLocationId = getLocationId(defaultLocation)
			if (!selectedAqiLocationId.value) {
				selectedAqiLocationId.value = defaultLocationId
				didSetDefaultSelection = true
			}
			if (!selectedEnvironmentLocationId.value) {
				selectedEnvironmentLocationId.value = defaultLocationId
				didSetDefaultSelection = true
			}
		}
	} catch (error) {
		handleError(error, "載入區域列表失敗")
	} finally {
		isLoadingZones.value = false
	}

	return didSetDefaultSelection
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

// 噪音值和風速（從感測器讀取）
const noiseValue = ref<number | null>(null)
const windSpeed = ref<number | null>(null)

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

const transformSensorData = (raw: number[]): SensorReadings | null => {
	if (raw.length < 7) {
		return null
	}

	return {
		pm25: raw[SENSOR_ADDRESSES.PM25] - 1,
		pm10: raw[SENSOR_ADDRESSES.PM10] - 1,
		tvoc: Number((raw[SENSOR_ADDRESSES.TVOC] / 1000).toFixed(3)),
		hcho: raw[SENSOR_ADDRESSES.HCHO],
		humidity: Number((raw[SENSOR_ADDRESSES.HUMIDITY] / 10).toFixed(1)),
		temperature: Number((raw[SENSOR_ADDRESSES.TEMPERATURE] / 10).toFixed(1)),
		co2: raw[SENSOR_ADDRESSES.CO2],
	}
}

const getModbusDeviceConfigFromDevice = (device: Device): ModbusDeviceConfig | null => {
	if (!device || device.type_code !== "sensor") {
		return null
	}

	const config = device.config as SensorDeviceConfig
	if (config.protocol !== "modbus" || !config.host || !config.port) {
		return null
	}

	return {
		host: config.host,
		port: config.port,
		unitId: config.unitId || 1,
	}
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

type LoadTarget = "aqi" | "environment"
const loadSensorDataByLocationId = async (params: {
	target: LoadTarget
	locationId: string
	targetSensorData: SensorReadings
	isFetchingRef: Ref<boolean>
	isOfflineRef: Ref<boolean>
	lastOfflineAlertTimeRef: Ref<number | null>
}): Promise<void> => {
	if (params.isFetchingRef.value) {
		return
	}

	if (!params.locationId) {
		return
	}

	const deviceId = getEnvironmentDeviceIdByLocationId(params.locationId)
	if (!deviceId) {
		Object.assign(params.targetSensorData, createEmptySensorReadings())
		return
	}

	params.isFetchingRef.value = true

	try {
		const device = await getDeviceByIdCached(deviceId)
		if (!device) {
			Object.assign(params.targetSensorData, createEmptySensorReadings())
			return
		}

		const modbusConfig = getModbusDeviceConfigFromDevice(device)
		if (!modbusConfig) {
			Object.assign(params.targetSensorData, createEmptySensorReadings())
			return
		}

		const queryParams = new URLSearchParams({
			host: modbusConfig.host,
			port: String(modbusConfig.port),
			unitId: String(modbusConfig.unitId),
			address: "0",
			length: "7",
		})

		const response = await request<ModbusDataResponse<number>>(
			`/modbus/holding-registers?${queryParams.toString()}`
		)

		const readings = transformSensorData(response.data)
		if (readings) {
			Object.assign(params.targetSensorData, readings)
		}

		if (params.isOfflineRef.value) {
			params.isOfflineRef.value = false
			params.lastOfflineAlertTimeRef.value = null
			toast.success(`${params.target === "aqi" ? "AQI" : "環境"} 感測器已恢復連線`, 5000)
		}
	} catch (error: any) {
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
		Object.assign(aqiSensorData, createEmptySensorReadings())
		await loadAqiSensorData()
	}
)

watch(
	() => selectedEnvironmentLocationId.value,
	async () => {
		Object.assign(environmentSensorData, createEmptySensorReadings())
		await loadEnvironmentSensorData()
	}
)

onMounted(async () => {
	const didSetDefaultSelection = await loadZones()
	if (!didSetDefaultSelection) {
		await Promise.allSettled([loadAqiSensorData(), loadEnvironmentSensorData()])
	}
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
			value: toFixedNumber(windSpeed.value, 1),
			unit: "m/s",
			icon: "wind",
		},
		{
			label: "噪音",
			value: toFixedNumber(noiseValue.value),
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
