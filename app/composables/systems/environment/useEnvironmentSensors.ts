import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi"
import { useDeviceConnectivity } from "~/composables/systems/devices/useDeviceConnectivity"
import { isEnvironmentLocationLive } from "~/utils/environmentLiveReadings"
import type { EnvironmentLocation, EnvironmentZone, SensorParameter } from "~/types/environment"
import { getLocationDeviceIds } from "~/utils/sensorUtils"

export type SensorReadings = {
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

export type EnvironmentSensorsOptions = {
	environmentZones: Ref<EnvironmentZone[]>
	selectedLocationId: Ref<string>
	currentLocationData: ComputedRef<EnvironmentLocation | null>
	getLocationId: (location: EnvironmentLocation) => string
}

export const useEnvironmentSensors = (options: EnvironmentSensorsOptions) => {
	const environmentApi = useEnvironmentApi()
	const deviceConnectivity = useDeviceConnectivity()

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

	const sensorData = reactive<SensorReadings>(createEmptySensorReadings())
	const allLocationsSensorData = ref<Map<string, SensorReadings>>(new Map())
	const overviewLoadingMap = ref<Map<string, boolean>>(new Map())
	const locationOfflineMap = ref<Map<string, boolean>>(new Map())
	const isFetching = ref(false)
	const isSensorOffline = ref(false)

	const collectAllDeviceIds = (): number[] => {
		const ids = new Set<number>()
		for (const zone of options.environmentZones.value) {
			for (const location of zone.locations) {
				getLocationDeviceIds(location).forEach((id) => ids.add(id))
			}
		}
		return [...ids].sort((a, b) => a - b)
	}

	const refreshAllDeviceConnectivity = async () => {
		const ids = collectAllDeviceIds()
		if (ids.length > 0) {
			await deviceConnectivity.refresh(ids)
		}
	}

	watch(
		() => collectAllDeviceIds().join(","),
		() => {
			void refreshAllDeviceConnectivity()
		},
		{ immediate: true }
	)

	watch(
		() => options.selectedLocationId.value,
		() => {
			Object.assign(sensorData, createEmptySensorReadings())
		}
	)

	const markLocationOffline = (location: EnvironmentLocation, offline: boolean) => {
		const next = new Map(locationOfflineMap.value)
		if (location.id != null) next.set(String(location.id), offline)
		next.set(options.getLocationId(location), offline)
		locationOfflineMap.value = next
	}

	const isLocationOffline = (location: EnvironmentLocation): boolean => {
		if (location.id != null && locationOfflineMap.value.get(String(location.id))) {
			return true
		}
		return locationOfflineMap.value.get(options.getLocationId(location)) ?? false
	}

	const isLocationOfflineForDisplay = (location: EnvironmentLocation): boolean => {
		const current = options.currentLocationData.value
		if (
			current &&
			(current.id === location.id ||
				options.getLocationId(current) === options.getLocationId(location))
		) {
			return isSensorOffline.value
		}
		return isLocationOffline(location)
	}

	const findLocationByDbId = (dbLocationId: string): EnvironmentLocation | null => {
		for (const zone of options.environmentZones.value) {
			const found = zone.locations.find((loc) => loc.id != null && String(loc.id) === dbLocationId)
			if (found) return found
		}
		return null
	}

	const extractReadingValues = (reading: Record<string, unknown>): Record<string, unknown> => {
		const nested = reading.data
		if (nested && typeof nested === "object" && !Array.isArray(nested)) {
			return nested as Record<string, unknown>
		}
		return reading
	}

	const clearSensorData = () => {
		Object.assign(sensorData, createEmptySensorReadings())
	}

	const clearLocationSensorEntries = (location: EnvironmentLocation) => {
		const empty = createEmptySensorReadings()
		for (const key of [
			location.id != null ? String(location.id) : "",
			options.getLocationId(location),
		].filter(Boolean)) {
			allLocationsSensorData.value.set(key, { ...empty })
		}
		const current = options.currentLocationData.value
		if (
			current &&
			(current.id === location.id ||
				options.getLocationId(current) === options.getLocationId(location))
		) {
			clearSensorData()
		}
	}

	const updateSensorData = (
		type: SensorParameter["type"],
		value: number | null,
		locationId?: string,
		location?: EnvironmentLocation
	) => {
		const current = options.currentLocationData.value
		const isCurrentLocation =
			location?.id === current?.id ||
			(!location?.id &&
				locationId === options.getLocationId(current || ({} as EnvironmentLocation)))

		if (isCurrentLocation) {
			sensorData[type] = value
		}

		if (!locationId) return

		const primaryKey = String(location?.id ?? locationId)
		if (!allLocationsSensorData.value.has(primaryKey)) {
			allLocationsSensorData.value.set(primaryKey, createEmptySensorReadings())
		}
		allLocationsSensorData.value.get(primaryKey)![type] = value

		const syntheticId = location ? options.getLocationId(location) : ""
		if (location?.id && syntheticId && syntheticId !== primaryKey) {
			if (!allLocationsSensorData.value.has(syntheticId)) {
				allLocationsSensorData.value.set(syntheticId, createEmptySensorReadings())
			}
			allLocationsSensorData.value.get(syntheticId)![type] = value
		}
	}

	const applyReadingToLocation = (
		location: EnvironmentLocation,
		data: Record<string, unknown>,
		locationKey?: string
	) => {
		for (const param of location.parameters.filter((p) => p.enabled)) {
			const raw = data[param.type]
			updateSensorData(
				param.type,
				typeof raw === "number" && Number.isFinite(raw) ? raw : null,
				locationKey ?? options.getLocationId(location),
				location
			)
		}
	}

	const applyWebSocketReading = (dbLocationId: string, reading: Record<string, unknown>) => {
		const location = findLocationByDbId(dbLocationId)
		if (!location) return

		markLocationOffline(location, false)
		applyReadingToLocation(location, extractReadingValues(reading), dbLocationId)

		if (String(options.currentLocationData.value?.id) === dbLocationId) {
			isSensorOffline.value = false
		}
	}

	const evaluateAndApplyLiveReading = async (
		location: EnvironmentLocation,
		opts?: { updateCurrentOfflineFlag?: boolean }
	): Promise<boolean> => {
		if (location.id == null) return false

		const deviceIds = getLocationDeviceIds(location)
		const { readings } = await environmentApi.getReadings(String(location.id), {
			limit: 1,
			order: "desc",
		})
		const latest = readings?.[0]
		const isLive = isEnvironmentLocationLive({
			deviceIds,
			readingTimestamp: latest?.timestamp,
			getDeviceStatus: deviceConnectivity.getStatus,
		})

		markLocationOffline(location, !isLive)

		if (!isLive) {
			clearLocationSensorEntries(location)
			if (opts?.updateCurrentOfflineFlag) isSensorOffline.value = true
			return false
		}

		if (latest?.data) {
			applyReadingToLocation(location, latest.data as Record<string, unknown>)
		}
		if (opts?.updateCurrentOfflineFlag) isSensorOffline.value = false
		return true
	}

	const isOfflineError = (message: string): boolean =>
		message.includes("503") || message.includes("服務不可用") || message.includes("設備離線")

	const getLocationSensorData = (locationId: string | number | undefined): SensorReadings | null => {
		if (locationId == null || locationId === "") return null
		const idStr = String(locationId)

		let data = allLocationsSensorData.value.get(idStr)
		if (data) return data

		for (const zone of options.environmentZones.value) {
			for (const location of zone.locations) {
				const dbId = location.id != null ? String(location.id) : ""
				const syntheticId = options.getLocationId(location)
				if (dbId === idStr || syntheticId === idStr) {
					data = allLocationsSensorData.value.get(dbId) ?? allLocationsSensorData.value.get(syntheticId)
					if (data) return data
				}
			}
		}
		return null
	}

	const loadSensorData = async (opts?: { skipConnectivityRefresh?: boolean }) => {
		if (isFetching.value || !options.currentLocationData.value) return

		const location = options.currentLocationData.value
		isFetching.value = true

		try {
			if (location.id == null) {
				clearSensorData()
				return
			}
			if (!opts?.skipConnectivityRefresh) {
				await refreshAllDeviceConnectivity()
			}
			await evaluateAndApplyLiveReading(location, { updateCurrentOfflineFlag: true })
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			clearLocationSensorEntries(location)
			markLocationOffline(location, true)
			if (isOfflineError(message)) isSensorOffline.value = true
		} finally {
			isFetching.value = false
		}
	}

	const loadLocationSensorData = async () => {
		await loadSensorData()
	}

	const loadLocationSensorDataForOverview = async (location: EnvironmentLocation) => {
		if (location.id == null) return

		const locationId = options.getLocationId(location)
		if (overviewLoadingMap.value.get(locationId)) return
		overviewLoadingMap.value.set(locationId, true)

		try {
			await evaluateAndApplyLiveReading(location)
		} catch {
			clearLocationSensorEntries(location)
			markLocationOffline(location, true)
		} finally {
			overviewLoadingMap.value.set(locationId, false)
		}
	}

	return {
		createEmptySensorReadings,
		sensorData,
		allLocationsSensorData,
		getLocationSensorData,
		isFetching,
		isSensorOffline,
		isLocationOffline,
		isLocationOfflineForDisplay,
		applyWebSocketReading,
		refreshAllDeviceConnectivity,
		overviewLoadingMap,
		loadSensorData,
		loadLocationSensorData,
		loadLocationSensorDataForOverview,
	}
}
