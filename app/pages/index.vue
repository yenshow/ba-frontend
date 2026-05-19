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
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi"
import { useDeviceConnectivity } from "~/composables/systems/devices/useDeviceConnectivity"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import {
	formatSensorDisplayValue,
	isEnvironmentLocationLive,
} from "~/utils/environmentLiveReadings"
import { useZoneManagement } from "~/composables/location/management/useZoneManagement"
import type { UnifiedZone, UnifiedLocation, EnvironmentSystemConfig } from "~/types/location"
import { firstLocationInSortedZones } from "~/utils/sortOrder"
import { getLocationUiKey } from "~/utils/locationUiId"
import { calculateAqiScore } from "~/utils/environmentAqi"

definePageMeta({
	layout: "default",
})

const locationApi = useLocationApi()
const { sortZones } = useZoneManagement<UnifiedLocation, UnifiedZone>()
useApiBase()
const environmentApi = useEnvironmentApi()
const deviceConnectivity = useDeviceConnectivity()
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
	const defaultRow =
		unifiedZones.value
			.flatMap((z) => (z.locations || []).map((loc, idx) => ({ zone: z, loc, idx })))
			.find(({ loc }) => loc === defaultLocation) ?? null
	const defaultId = defaultRow ? getLocationId(defaultRow.zone, defaultRow.loc, defaultRow.idx) : ""
	if (!selectedAqiLocationId.value) selectedAqiLocationId.value = defaultId
	if (!selectedEnvironmentLocationId.value) selectedEnvironmentLocationId.value = defaultId
}

// 區域與地點（統一地點管理）
const unifiedZones = ref<UnifiedZone[]>([])
const isLoadingZones = ref(false)

const getLocationId = (zone: UnifiedZone, location: UnifiedLocation, locationIndex: number): string => {
	return getLocationUiKey({ zone, location, locationIndex })
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
		const location = (zone.locations || []).find(
			(loc, idx) => getLocationId(zone, loc, idx) === locationId
		)
		if (location) {
			return location
		}
	}

	return null
}

const getEnvironmentDbLocationIdByUiLocationId = (locationId: string): string | null => {
	const unifiedLocation = findUnifiedLocationByLocationId(locationId)
	if (!unifiedLocation?.id) return null
	return String(unifiedLocation.id)
}

const getDeviceIdsForUiLocationId = (locationId: string): number[] => {
	const unifiedLocation = findUnifiedLocationByLocationId(locationId)
	if (!unifiedLocation) return []
	const envLoc = extractEnvironmentLocation(unifiedLocation)
	return envLoc?.deviceIds ?? []
}

const collectAllEnvironmentDeviceIds = (): number[] => {
	const ids = new Set<number>()
	for (const zone of unifiedZones.value) {
		for (const location of zone.locations || []) {
			const envLoc = extractEnvironmentLocation(location)
			envLoc?.deviceIds.forEach((id) => ids.add(id))
		}
	}
	return [...ids].sort((a, b) => a - b)
}

watch(
	() => collectAllEnvironmentDeviceIds().join(","),
	() => {
		void deviceConnectivity.refresh(collectAllEnvironmentDeviceIds())
	},
	{ immediate: true }
)

const locationOptions = computed(() => {
	const options: Array<{ value: string; label: string }> = []

	unifiedZones.value.forEach((zone) => {
		zone.locations.forEach((location, locationIndex) => {
			const locationId = getLocationId(zone, location, locationIndex)
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
		const ids = collectAllEnvironmentDeviceIds()
		if (ids.length > 0) await deviceConnectivity.refresh(ids)
		await Promise.allSettled([loadAqiSensorData(), loadEnvironmentSensorData()])
	},
	interval: 30000, // 每 30 秒執行一次
	immediate: false, // 不在啟動時立即執行（因為 onMounted 會手動執行一次）
	onError: (err) => {
		handleError(err, "載入感測器資料失敗")
	},
})

const PARAM_KEYS = [
	"pm25", "pm10", "tvoc", "hcho", "humidity", "temperature", "co2", "noise", "wind",
] as const

const loadSensorDataByLocationId = async (params: {
	locationId: string
	targetSensorData: SensorReadings
	isFetchingRef: Ref<boolean>
	isOfflineRef: Ref<boolean>
}): Promise<void> => {
	if (params.isFetchingRef.value || !params.locationId) return

	const dbLocationId = getEnvironmentDbLocationIdByUiLocationId(params.locationId)
	if (!dbLocationId) {
		Object.assign(params.targetSensorData, createEmptySensorReadings())
		return
	}

	params.isFetchingRef.value = true
	// 每輪清空後僅合併成功讀取值（多設備時風速等可來自不同設備）
	Object.assign(params.targetSensorData, createEmptySensorReadings())

	try {
		const deviceIds = getDeviceIdsForUiLocationId(params.locationId)
		const { readings } = await environmentApi.getReadings(dbLocationId, {
			limit: 1,
			order: "desc",
		})
		const latest = readings?.[0]
		const isLive = isEnvironmentLocationLive({
			deviceIds,
			readingTimestamp: latest?.timestamp,
			getDeviceStatus: deviceConnectivity.getStatus,
		})

		if (!isLive) {
			params.isOfflineRef.value = true
			return
		}

		const data = (latest?.data || {}) as Record<string, unknown>
		for (const key of PARAM_KEYS) {
			const value = data[key]
			;(params.targetSensorData as Record<string, number | null>)[key] =
				typeof value === "number" && Number.isFinite(value) ? value : null
		}

		params.isOfflineRef.value = false
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		if (errorMessage.includes("503") || errorMessage.includes("設備離線")) {
			params.isOfflineRef.value = true
			return
		}
		if (!params.isOfflineRef.value) {
			handleError(error, "讀取感測器資料失敗")
		}
	} finally {
		params.isFetchingRef.value = false
	}
}

const formatAqiDisplay = (value: number | null, fractionDigits = 0) =>
	formatSensorDisplayValue(value, { offline: isAqiSensorOffline.value, fractionDigits })

const formatEnvironmentDisplay = (value: number | null, fractionDigits = 0) =>
	formatSensorDisplayValue(value, {
		offline: isEnvironmentSensorOffline.value,
		fractionDigits,
	})

const loadAqiSensorData = async () => {
	return loadSensorDataByLocationId({
		locationId: selectedAqiLocationId.value,
		targetSensorData: aqiSensorData,
		isFetchingRef: isFetchingAqi,
		isOfflineRef: isAqiSensorOffline,
	})
}

const loadEnvironmentSensorData = async () => {
	return loadSensorDataByLocationId({
		locationId: selectedEnvironmentLocationId.value,
		targetSensorData: environmentSensorData,
		isFetchingRef: isFetchingEnvironment,
		isOfflineRef: isEnvironmentSensorOffline,
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
	const ids = collectAllEnvironmentDeviceIds()
	if (ids.length > 0) await deviceConnectivity.refresh(ids)
	await Promise.allSettled([loadAqiSensorData(), loadEnvironmentSensorData()])
	startPolling()
})

const getSelectedLocationLabel = (locationId: string) => {
	const option = locationOptions.value.find((opt) => opt.value === locationId)
	return option?.label || "未選擇地點"
}

const aqiData = computed(() => ({
	value: formatAqiDisplay(calculateAqiScore({ pm25: aqiSensorData.pm25, pm10: aqiSensorData.pm10 })),
	location: getSelectedLocationLabel(selectedAqiLocationId.value),
	metrics: [
		{ label: "PM2.5", value: formatAqiDisplay(aqiSensorData.pm25), unit: "µg/m³", icon: "PM2.5" },
		{ label: "PM10", value: formatAqiDisplay(aqiSensorData.pm10), unit: "µg/m³", icon: "PM10" },
		{ label: "溫度", value: formatAqiDisplay(aqiSensorData.temperature, 1), unit: "°C", icon: "temperature" },
		{ label: "濕度", value: formatAqiDisplay(aqiSensorData.humidity, 1), unit: "%", icon: "humidity" },
		{ label: "風速", value: formatAqiDisplay(aqiSensorData.wind, 1), unit: "m/s", icon: "wind" },
		{ label: "噪音", value: formatAqiDisplay(aqiSensorData.noise), unit: "dB", icon: "noise" },
	],
}))

const environmentData = computed(() => ({
	temperature: formatEnvironmentDisplay(environmentSensorData.temperature, 1),
	location: getSelectedLocationLabel(selectedEnvironmentLocationId.value),
	metrics: [
		{
			label: "濕度",
			value: formatEnvironmentDisplay(environmentSensorData.humidity, 1),
			unit: "%",
			icon: "humidity",
		},
		{
			label: "CO₂",
			value: formatEnvironmentDisplay(environmentSensorData.co2),
			unit: "ppm",
			icon: "CO2",
		},
		{
			label: "PM2.5",
			value: formatEnvironmentDisplay(environmentSensorData.pm25),
			unit: "µg/m³",
			icon: "PM2.5",
		},
	],
}))
</script>
