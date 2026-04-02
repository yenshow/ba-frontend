import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useToast } from "~/composables/core/useToast"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi"
import type { ModbusDeviceConfig } from "~/types/modbus"
import type { Device, SensorDeviceConfig, SensorDeviceModelConfig } from "~/types/device"
import type { EnvironmentLocation, EnvironmentZone, SensorParameter, SensorParameterType } from "~/types/environment"
import { getParameterDisplayName, getLocationDeviceIds } from "~/utils/sensorUtils"
import { applyTransform, groupConsecutiveAddresses } from "~/utils/modbusMath"

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
	const deviceApi = useDeviceApi()
	const environmentApi = useEnvironmentApi()
	const { request } = useApiBase()
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

	const reportLocationError = async (location: EnvironmentLocation | undefined, errorMessage: string) => {
		if (!location?.systemId) return
		try {
			await environmentApi.reportError(location.systemId, errorMessage)
		} catch {
			// 靜默：不影響主要流程
		}
	}

	const clearLocationError = async (location: EnvironmentLocation | undefined) => {
		if (!location?.systemId) return
		try {
			await environmentApi.clearError(location.systemId)
		} catch {
			// 靜默：不影響主要流程
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
			(!location?.id && locationId === options.getLocationId(current || ({} as EnvironmentLocation)))

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

	const batchReadHolding = async (config: ModbusDeviceConfig, address: number, length: number) => {
		return request<{
			results: Array<
				| {
						ok: true
						data: number[]
						device: ModbusDeviceConfig
						registerType: "holding"
						address: number
						length: number
						meta?: any
				  }
				| { ok: false; error: string; meta?: any }
			>
		}>("/modbus/batch-read", {
			method: "POST",
			body: JSON.stringify({
				requests: [
					{
						host: config.host,
						port: config.port,
						unitId: config.unitId,
						registerType: "holding",
						address,
						length,
					},
				],
			}),
		} as any)
	}

	type ParameterWithModbusConfig = {
		type: SensorParameterType
		modbusConfig: { address: number; transform?: string }
	}

	const findParameterModbusConfig = (
		paramType: SensorParameterType,
		modelConfig: SensorDeviceModelConfig | null,
		sharedModelConfig: SensorDeviceModelConfig | null
	): { address: number; transform?: string } | null => {
		let paramDef = modelConfig?.sensorParameters?.find((p) => p.type === paramType)
		if (!paramDef?.modbusConfig?.address && sharedModelConfig?.sensorParameters) {
			paramDef = sharedModelConfig.sensorParameters.find((p) => p.type === paramType)
		}

		return paramDef?.modbusConfig?.address !== undefined
			? { address: paramDef.modbusConfig.address, transform: paramDef.modbusConfig.transform }
			: null
	}

	const readParameterValue = async (
		modbusConfig: ModbusDeviceConfig,
		address: number,
		transform?: string
	): Promise<number | null> => {
		try {
			const response = await batchReadHolding(modbusConfig, address, 1)
			const first = response.results?.[0] as any
			if (!first?.ok || !Array.isArray(first.data)) return null
			const rawValue = first.data[0]
			return applyTransform(rawValue, transform)
		} catch {
			return null
		}
	}

	const readParametersBatch = async (
		modbusConfig: ModbusDeviceConfig,
		paramAddressMap: Map<number, ParameterWithModbusConfig>
	): Promise<Array<{ type: SensorParameterType; value: number | null; success: boolean }>> => {
		const addresses = Array.from(paramAddressMap.keys()).sort((a, b) => a - b)
		if (addresses.length === 0) return []

		const addressGroups = groupConsecutiveAddresses(addresses)
		const readPromises: Promise<
			Array<{ type: SensorParameterType; value: number | null; success: boolean }>
		>[] = []

		for (const group of addressGroups) {
			if (group.length > 1) {
				readPromises.push(
					batchReadHolding(modbusConfig, group.start, group.length)
						.then((response) => {
							const first = response.results?.[0] as any
							if (!first?.ok || !Array.isArray(first.data)) {
								throw new Error(String(first?.error || "讀取失敗"))
							}
							return group.addresses.map((addr, idx) => {
								const paramData = paramAddressMap.get(addr)
								if (!paramData) {
									return { type: "pm25" as SensorParameterType, value: null, success: false }
								}

								const rawValue = first.data[idx]
								return {
									type: paramData.type,
									value: applyTransform(rawValue, paramData.modbusConfig.transform),
									success: true,
								}
							})
						})
						.catch(() => {
							return Promise.all(
								group.addresses.map((addr) => {
									const paramData = paramAddressMap.get(addr)
									if (!paramData) {
										return Promise.resolve({
											type: "pm25" as SensorParameterType,
											value: null,
											success: false,
										})
									}
									return readParameterValue(
										modbusConfig,
										paramData.modbusConfig.address,
										paramData.modbusConfig.transform
									).then((value) => ({
										type: paramData.type,
										value,
										success: value !== null,
									}))
								})
							)
						})
				)
				continue
			}

			const addr = group.addresses[0]
			const paramData = paramAddressMap.get(addr)
			if (!paramData) continue

			readPromises.push(
				readParameterValue(
					modbusConfig,
					paramData.modbusConfig.address,
					paramData.modbusConfig.transform
				).then((value) => [
					{
						type: paramData.type,
						value,
						success: value !== null,
					},
				])
			)
		}

		const nestedResults = await Promise.all(readPromises)
		return nestedResults.flat()
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

	const loadSensorData = async () => {
		if (isFetching.value) return
		if (!options.currentLocationData.value) return

		isFetching.value = true

		try {
			const location = options.currentLocationData.value
			const deviceIds = getLocationDeviceIds(location)
			if (deviceIds.length === 0) {
				clearSensorData()
				return
			}

			const enabledParams = location.parameters.filter((param) => param.enabled)
			if (enabledParams.length === 0) {
				clearSensorData()
				return
			}

			for (const param of enabledParams) {
				updateSensorData(param.type, null, options.getLocationId(location), location)
			}

			const providedParams = new Set<SensorParameterType>()
			const attemptedParams = new Set<SensorParameterType>()
			let successCount = 0
			let failCount = 0

			for (const deviceId of deviceIds) {
				const result = await loadDeviceAndModelConfig(deviceId)
				if (!result) continue

				const { device, modelConfig } = result
				const deviceCfg = device.config as SensorDeviceConfig
				if (deviceCfg.protocol !== "modbus" || !deviceCfg.host || !deviceCfg.port) continue

				const modbusConfig: ModbusDeviceConfig = {
					host: deviceCfg.host,
					port: deviceCfg.port,
					unitId: deviceCfg.unitId || 1,
				}

				let sharedModelConfig: SensorDeviceModelConfig | null = null
				const missingParamsForThisDevice = enabledParams.filter(
					(param) =>
						!modelConfig?.sensorParameters?.find(
							(p) => p.type === param.type && p.modbusConfig?.address
						)
				)
				if (missingParamsForThisDevice.length > 0) {
					sharedModelConfig = await findSharedDeviceModelConfig(location, device)
				}

				const paramAddressMapForBatch = new Map<number, ParameterWithModbusConfig>()
				for (const param of enabledParams) {
					const modbusCfg = findParameterModbusConfig(param.type, modelConfig, sharedModelConfig)
					if (!modbusCfg) continue
					paramAddressMapForBatch.set(modbusCfg.address, { type: param.type, modbusConfig: modbusCfg })
				}
				if (paramAddressMapForBatch.size === 0) continue

				const results = await readParametersBatch(modbusConfig, paramAddressMapForBatch)
				for (const { type, value, success } of results) {
					attemptedParams.add(type)
					if (success) {
						updateSensorData(type, value, options.getLocationId(location), location)
						providedParams.add(type)
						successCount++
						continue
					}

					if (!providedParams.has(type)) {
						updateSensorData(type, null, options.getLocationId(location), location)
					}
					failCount++
				}
			}

			const missingConfigParamNames = enabledParams
				.filter((p) => !attemptedParams.has(p.type))
				.map((p) => getParameterDisplayName(p.type))

			if (missingConfigParamNames.length > 0) {
				const now = Date.now()
				const shouldShowAlert =
					!lastValidationAlertTime || now - lastValidationAlertTime >= VALIDATION_ALERT_INTERVAL
				if (shouldShowAlert) {
					lastValidationAlertTime = now
					toast.warning(
						`以下參數在已勾選的所有設備中都找不到 Modbus 配置：${missingConfigParamNames.join("、")}\n請到「設備型號管理」設定，或在「地點管理」再勾選能提供該參數的設備`,
						10000
					)
				}
			}

			if (successCount === 0 && failCount > 0) {
				await reportLocationError(options.currentLocationData.value, "無法讀取感測器資料，請檢查設備連線狀態")
				const now = Date.now()
				const shouldShowConnectionAlert =
					!lastConnectionAlertTime || now - lastConnectionAlertTime >= VALIDATION_ALERT_INTERVAL
				if (shouldShowConnectionAlert) {
					lastConnectionAlertTime = now
					toast.warning("設備連線異常或讀取失敗，請檢查設備連線與 Modbus 位址設定", 8000)
				}
			}

			if (isSensorOffline.value && successCount > 0) {
				isSensorOffline.value = false
				toast.success("感測器已恢復連線", 5000)
				await clearLocationError(options.currentLocationData.value)
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			const offline = isOfflineError(errorMessage)
			if (offline && !isSensorOffline.value) isSensorOffline.value = true

			if (offline || !isSensorOffline.value) {
				await reportLocationError(
					options.currentLocationData.value,
					errorMessage || (offline ? "感測器離線，無法讀取資料" : "讀取感測器資料失敗")
				)
			}
		} finally {
			isFetching.value = false
		}
	}

	const loadLocationSensorData = async (location: EnvironmentLocation) => {
		await loadSensorData()
	}

	const loadLocationSensorDataForOverview = async (location: EnvironmentLocation) => {
		const deviceIds = getLocationDeviceIds(location)
		if (deviceIds.length === 0) return

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

		let totalSuccess = 0
		let totalFail = 0

		try {
			const enabledParams = location.parameters.filter((param) => param.enabled)

			for (const deviceId of deviceIds) {
				const result = await loadDeviceAndModelConfig(deviceId)
				if (!result) continue

				const { device, modelConfig } = result
				if (!modelConfig?.sensorParameters) continue

				const config = device.config as SensorDeviceConfig
				if (config.protocol !== "modbus" || !config.host || !config.port) continue

				const modbusConfig: ModbusDeviceConfig = {
					host: config.host,
					port: config.port,
					unitId: config.unitId || 1,
				}

				let sharedModelConfig: SensorDeviceModelConfig | null = null
				const missingParams = enabledParams.filter(
					(param) =>
						!modelConfig.sensorParameters?.find(
							(p) => p.type === param.type && p.modbusConfig?.address
						)
				)
				if (missingParams.length > 0) {
					sharedModelConfig = await findSharedDeviceModelConfig(location, device)
				}

				const paramAddressMapForBatch = new Map<number, ParameterWithModbusConfig>()
				for (const param of enabledParams) {
					const modbusCfg = findParameterModbusConfig(param.type, modelConfig, sharedModelConfig)
					if (!modbusCfg) continue
					paramAddressMapForBatch.set(modbusCfg.address, { type: param.type, modbusConfig: modbusCfg })
				}

				const results = await readParametersBatch(modbusConfig, paramAddressMapForBatch)
				results.forEach(({ type, value, success }) => {
					if (!success) {
						totalFail++
						return
					}
					updateSensorData(type, value, locationId, location)
					totalSuccess++
				})
			}

			if (totalSuccess === 0 && totalFail > 0) {
				await reportLocationError(location, "無法讀取感測器資料，請檢查設備連線狀態")
			} else if (totalSuccess > 0) {
				await clearLocationError(location)
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			if (isOfflineError(errorMessage)) {
				await reportLocationError(location, errorMessage || "感測器離線，無法讀取資料")
			}
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

