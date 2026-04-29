import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"
import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import type {
	Device,
	ModbusRegisterType,
	SensorDeviceConfig,
	SensorDeviceModelConfig,
} from "~/types/device"
import type {
	EnvironmentLocation,
	EnvironmentZone,
	SensorParameter,
} from "~/types/environment"
import { getParameterDisplayName, getLocationDeviceIds } from "~/utils/sensorUtils"

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
	const deviceApi = useDeviceApi()
	const toast = useToast()
	const { handleError } = useErrorHandler()

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

	const deviceModelConfigCache = ref<
		Map<number, { device: Device; modelConfig: SensorDeviceModelConfig | null; timestamp: number }>
	>(new Map())
	const CONFIG_CACHE_TTL = 5 * 60 * 1000
	const sharedConfigCache = ref<Map<string, SensorDeviceModelConfig | null>>(new Map())

	const clearSensorData = () => {
		Object.assign(sensorData, createEmptySensorReadings())
	}

	watch(
		() => options.selectedLocationId.value,
		() => {
			clearSensorData()
			deviceModelConfigCache.value.clear()
			sharedConfigCache.value.clear()
		}
	)

	const overviewLoadingMap = ref<Map<string, boolean>>(new Map())
	const isFetching = ref(false)
	const isSensorOffline = ref(false)
	const VALIDATION_ALERT_INTERVAL = 30000
	let lastValidationAlertTime: number | null = null
	let lastConnectionAlertTime: number | null = null

	const isOfflineError = (errorMessage: string): boolean => {
		return (
			errorMessage.includes("503") ||
			errorMessage.includes("服務不可用") ||
			errorMessage.includes("設備離線")
		)
	}

	/**
	 * 重要：環境系統的「連線錯誤追蹤 / 警報建立」以後端背景監控為準（SSOT）。
	 * 前端頁面讀取失敗只做 UI 提示，不再呼叫 /systems/:id/errors，避免「點開頁面才會累積達閾值」。
	 */

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

		const keyStr = (v: string | number | undefined) => (v == null ? "" : String(v))
		const primaryKey = keyStr(location?.id || locationId)

		if (primaryKey && !allLocationsSensorData.value.has(primaryKey)) {
			allLocationsSensorData.value.set(primaryKey, createEmptySensorReadings())
		}
		if (primaryKey) {
			const locationData = allLocationsSensorData.value.get(primaryKey)!
			locationData[type] = value
		}

		const syntheticId = location ? options.getLocationId(location) : ""
		if (location?.id && syntheticId && syntheticId !== primaryKey) {
			if (!allLocationsSensorData.value.has(syntheticId)) {
				allLocationsSensorData.value.set(syntheticId, createEmptySensorReadings())
			}
			const syntheticData = allLocationsSensorData.value.get(syntheticId)!
			syntheticData[type] = value
		}
	}

	const getLocationSensorData = (
		locationId: string | number | undefined
	): SensorReadings | null => {
		if (locationId == null || locationId === "") return null
		const idStr = String(locationId)

		let data = allLocationsSensorData.value.get(idStr)
		if (data) return data

		for (const zone of options.environmentZones.value) {
			for (const location of zone.locations) {
				const dbId = location.id != null ? String(location.id) : ""
				const syntheticId = options.getLocationId(location)
				if (dbId === idStr || syntheticId === idStr) {
					if (dbId) {
						data = allLocationsSensorData.value.get(dbId)
						if (data) return data
					}
					data = allLocationsSensorData.value.get(syntheticId)
					if (data) return data
				}
			}
		}

		return null
	}

	const loadDeviceAndModelConfig = async (
		deviceId: number,
		useCache = true
	): Promise<{ device: Device; modelConfig: SensorDeviceModelConfig | null } | null> => {
		if (useCache) {
			const cached = deviceModelConfigCache.value.get(deviceId)
			if (cached && Date.now() - cached.timestamp < CONFIG_CACHE_TTL) {
				return { device: cached.device, modelConfig: cached.modelConfig }
			}
		}

		try {
			const result = await deviceApi.getDevice(deviceId)
			const device = result.device
			if (!device || device.type_code !== "sensor") return null

			let modelConfig: SensorDeviceModelConfig | null = null

			const deviceWithModel = device as any
			if (deviceWithModel.model?.config) {
				const config = deviceWithModel.model.config as SensorDeviceModelConfig | undefined
				if (config?.sensorParameters) modelConfig = config || null
			}

			if (!modelConfig && device.model_id) {
				try {
					const modelResult = await deviceApi.getDeviceModel(device.model_id)
					modelConfig =
						(modelResult.device_model.config as SensorDeviceModelConfig | undefined) || null
				} catch {
					modelConfig = null
				}
			}

			deviceModelConfigCache.value.set(deviceId, { device, modelConfig, timestamp: Date.now() })
			return { device, modelConfig }
		} catch (error) {
			handleError(error, "載入設備失敗")
			return null
		}
	}

	const findSharedDeviceModelConfig = async (
		currentLocation: EnvironmentLocation,
		currentDevice: Device
	): Promise<SensorDeviceModelConfig | null> => {
		const currentConfig = currentDevice.config as SensorDeviceConfig
		if (currentConfig.protocol !== "modbus" || !currentConfig.host || !currentConfig.port) {
			return null
		}

		const cacheKey = `${currentConfig.host}:${currentConfig.port}`
		const cachedConfig = sharedConfigCache.value.get(cacheKey)
		if (cachedConfig !== undefined) return cachedConfig

		for (const zone of options.environmentZones.value) {
			for (const otherLocation of zone.locations) {
				if (otherLocation.id === currentLocation.id) continue
				const otherDeviceIds = getLocationDeviceIds(otherLocation)
				const otherPrimaryDeviceId = otherDeviceIds[0]
				if (!otherPrimaryDeviceId) continue

				try {
					const result = await loadDeviceAndModelConfig(otherPrimaryDeviceId)
					if (!result) continue

					const { device, modelConfig } = result
					const otherConfig = device.config as SensorDeviceConfig
					if (
						otherConfig.protocol === "modbus" &&
						otherConfig.host === currentConfig.host &&
						otherConfig.port === currentConfig.port
					) {
						sharedConfigCache.value.set(cacheKey, modelConfig)
						return modelConfig
					}
				} catch {
					continue
				}
			}
		}

		sharedConfigCache.value.set(cacheKey, null)
		return null
	}

	const normalizeSensorRegisterType = (
		registerType: ModbusRegisterType | undefined
	): "holding" | "input" => {
		const rt = String(registerType || "holding").toLowerCase()
		if (rt === "input") return "input"
		return "holding"
	}

	const loadSensorData = async () => {
		if (isFetching.value) return
		if (!options.currentLocationData.value) return

		isFetching.value = true

		try {
			const location = options.currentLocationData.value
			if (location.id == null) {
				clearSensorData()
				return
			}

			const { readings } = await environmentApi.getReadings(String(location.id), { limit: 1 })
			const latest = readings?.[0]
			const data = (latest?.data || {}) as Record<string, unknown>
			const enabledParams = location.parameters.filter((param) => param.enabled)
			for (const param of enabledParams) {
				const raw = data[param.type]
				updateSensorData(
					param.type,
					typeof raw === "number" && Number.isFinite(raw) ? raw : null,
					options.getLocationId(location),
					location
				)
			}

			if (isSensorOffline.value) {
				isSensorOffline.value = false
				toast.success("感測器已恢復連線", 5000)
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			const offline = isOfflineError(errorMessage)
			if (offline && !isSensorOffline.value) isSensorOffline.value = true

			// SSOT：不回報後端 errors（由 background monitor 處理）
		} finally {
			isFetching.value = false
		}
	}

	const loadLocationSensorData = async (location: EnvironmentLocation) => {
		// `loadSensorData()` 會依 currentLocationData 讀取多台設備並處理清空／離線等狀態
		// 這裡只需確保「當前地點」已切換即可（由 page 先更新 selectedLocationId）
		await loadSensorData()
	}

	const loadLocationSensorDataForOverview = async (location: EnvironmentLocation) => {
		if (location.id == null) return

		const locationId = options.getLocationId(location)
		if (overviewLoadingMap.value.get(locationId)) return
		overviewLoadingMap.value.set(locationId, true)

		const primaryKey = location.id != null ? String(location.id) : locationId
		const existing = allLocationsSensorData.value.get(primaryKey)
		if (existing) {
			Object.assign(existing, createEmptySensorReadings())
		} else {
			allLocationsSensorData.value.set(primaryKey, createEmptySensorReadings())
		}

		try {
			const { readings } = await environmentApi.getReadings(String(location.id), { limit: 1 })
			const latest = readings?.[0]
			const data = (latest?.data || {}) as Record<string, unknown>
			const enabledParams = location.parameters.filter((param) => param.enabled)
			for (const param of enabledParams) {
				const raw = data[param.type]
				updateSensorData(
					param.type,
					typeof raw === "number" && Number.isFinite(raw) ? raw : null,
					locationId,
					location
				)
			}
		} catch (error: unknown) {
			// SSOT：不回報後端 errors（由 background monitor 處理）
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
		overviewLoadingMap,
		loadSensorData,
		loadLocationSensorData,
		loadLocationSensorDataForOverview,
	}
}
