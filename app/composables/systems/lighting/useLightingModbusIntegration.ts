import { computed, ref, watch, type Ref } from "vue"
import type { LightingLocation, LightingZone } from "~/types/lighting"
import type { Device, ControllerDeviceConfig } from "~/types/device"
import type { ModbusDeviceConfig } from "~/types/modbus"
import { useLightingApi } from "~/composables/systems/lighting/useLightingApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import {
	extractReadPoint,
	extractWritePoints,
	filterDoPoints,
	hasLocationControllerConfig,
	needsModbusConnection,
} from "~/utils/lightingModbus"
import { findLocationInZonesByUiKey, getLocationUiKey } from "~/utils/locationUiId"

const MODBUS_TIMEOUT = 3000
const TOGGLE_DEBOUNCE_DELAY = 300
const REQUEST_CACHE_TTL = 4500
const FAILED_DEVICE_TTL = 30000

interface BatchRequest {
	deviceConfig: { host: string; port: number; unitId: number }
	address: number
	type: "coil" | "discrete"
	locationId: string
}

export const useLightingModbusIntegration = (
	lightingZones: Ref<LightingZone[]>,
	selectedZone: Ref<string>
) => {
	const lightingApi = useLightingApi()
	const deviceApi = useDeviceApi()
	const { request } = useApiBase()
	const { handleError } = useErrorHandler()

	const locationStatuses = ref<
		Record<string, { isRunning: boolean; status: "normal" | "warning" | "error" }>
	>({})

	const locationToggling = ref<Set<string>>(new Set())
	const deviceCache = ref<Map<number, Device>>(new Map())
	const deviceConfigCache = ref<Map<number, { host: string; port: number; unitId: number }>>(
		new Map()
	)

	const requestCache = new Map<
		string,
		{ timestamp: number; ok: boolean; value?: boolean; error?: string }
	>()
	const failedDevices = new Map<string, number>()
	const toggleDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
	let inflightRefresh: Promise<void> | null = null

	const batchRead = async (
		reqs: Array<{
			host: string
			port: number
			unitId: number
			registerType: "coil" | "discrete"
			address: number
			length: number
			meta?: any
		}>
	) => {
		return request<{
			results: Array<
				| {
						ok: true
						data: unknown[]
						device: ModbusDeviceConfig
						registerType: "coil" | "discrete"
						address: number
						length: number
						meta?: any
				  }
				| { ok: false; error: string; meta?: any }
			>
		}>("/modbus/batch-read", {
			method: "POST",
			body: JSON.stringify({ requests: reqs }),
			timeout: MODBUS_TIMEOUT,
		} as any)
	}

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

	const refreshLocationStatusFresh = async (
		locationId: string,
		deviceConfig: { host: string; port: number; unitId: number },
		readPoint: { address: number; type: "coil" | "discrete" }
	) => {
		const requestKey = getRequestKey(deviceConfig, readPoint.address, readPoint.type)
		try {
			const res = await batchRead([
				{
					host: deviceConfig.host,
					port: deviceConfig.port,
					unitId: deviceConfig.unitId,
					registerType: readPoint.type,
					address: readPoint.address,
					length: 1,
					meta: { requestKey, noCache: true },
				},
			])
			const rr = res.results?.[0] as any
			if (rr?.ok && typeof rr.data?.[0] === "boolean") {
				requestCache.set(requestKey, { timestamp: Date.now(), ok: true, value: rr.data[0] })
				await updateLocationStatuses([locationId], rr.data[0])
				return
			}
			const errorMessage = String(rr?.error || "無法讀取照明設備資料")
			requestCache.set(requestKey, { timestamp: Date.now(), ok: false, error: errorMessage })
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			requestCache.set(requestKey, { timestamp: Date.now(), ok: false, error: errorMessage })
		}
	}

	const extractDeviceConfig = (
		device: Device
	): { host: string; port: number; unitId: number } | null => {
		const config = device.config as ControllerDeviceConfig & Record<string, unknown>
		if (!config?.host || config.port === undefined || config.unitId === undefined) return null
		const isController =
			config.type === "controller" ||
			(device as Device & { type_code?: string }).type_code === "controller"
		if (!isController) return null
		return {
			host: String(config.host),
			port: Number(config.port),
			unitId: Number(config.unitId),
		}
	}

	const loadDeviceInfo = async (deviceId: number): Promise<Device | null> => {
		if (deviceCache.value.has(deviceId)) {
			return deviceCache.value.get(deviceId)!
		}

		try {
			const result = await deviceApi.getDevice(deviceId)
			const device = result.device
			deviceCache.value.set(deviceId, device)

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

	const preloadDeviceInfos = async () => {
		const deviceIds = new Set<number>()
		lightingZones.value.forEach((zone) => {
			zone.locations.forEach((location) => {
				if (location.modbus?.deviceId) {
					deviceIds.add(location.modbus.deviceId)
				}
			})
		})

		const uncachedDeviceIds = Array.from(deviceIds).filter((id) => !deviceCache.value.has(id))

		if (uncachedDeviceIds.length === 0) return

		await Promise.allSettled(uncachedDeviceIds.map((deviceId) => loadDeviceInfo(deviceId)))
	}

	const getLocationDeviceConfig = async (
		location: LightingLocation
	): Promise<{ host: string; port: number; unitId: number } | null> => {
		if (!location.modbus) return null

		const effectiveDeviceId = location.deviceId ?? location.modbus.deviceId
		if (!effectiveDeviceId) {
			if (location.modbus.host && location.modbus.port && location.modbus.unitId !== undefined) {
				return {
					host: location.modbus.host,
					port: location.modbus.port,
					unitId: location.modbus.unitId,
				}
			}
			return null
		}

		if (deviceConfigCache.value.has(effectiveDeviceId)) {
			return deviceConfigCache.value.get(effectiveDeviceId)!
		}

		const device = await loadDeviceInfo(effectiveDeviceId)
		if (!device) return null

		return deviceConfigCache.value.get(effectiveDeviceId) || null
	}

	const getRequestKey = (
		deviceConfig: { host: string; port: number; unitId: number },
		address: number,
		type: "coil" | "discrete" = "coil"
	) => {
		return `${deviceConfig.host}:${deviceConfig.port}:${deviceConfig.unitId}:${type}:${address}`
	}

	const findLocationById = (locationId: string, requireDbId = false) => {
		return findLocationInZonesByUiKey<LightingLocation, LightingZone>(
			lightingZones.value,
			locationId,
			{ requireDbId }
		)
	}

	const ensureLocationStatus = (locationId: string, defaultStatus: "normal" | "error" = "normal") => {
		if (!locationStatuses.value[locationId]) {
			locationStatuses.value[locationId] = {
				isRunning: false,
				status: defaultStatus,
			}
		}
		return locationStatuses.value[locationId]
	}

	const rollbackLocationStatus = (locationId: string, isRunning: boolean) => {
		if (locationStatuses.value[locationId]) {
			locationStatuses.value[locationId].isRunning = isRunning
		}
	}

	/**
	 * 重要：照明系統的「連線錯誤追蹤 / 警報建立」以後端背景監控為準（SSOT）。
	 * 前端操作失敗只做 UI 狀態與提示，不再呼叫 /systems/:id/errors，避免「點開頁面才會累積達閾值」。
	 */

	const updateLocationStatuses = async (locationIds: string[], value: boolean) => {
		for (const locationId of locationIds) {
			const status = ensureLocationStatus(locationId)
			const wasError = status.status === "error"
			status.isRunning = value
			status.status = "normal"

			// SSOT：不回報後端 errors（由 background monitor 處理）
			void wasError
		}
	}

	const processBatchRequests = async (requests: BatchRequest[]) => {
		if (requests.length === 0) return

		if (inflightRefresh) {
			await inflightRefresh
			return
		}

		inflightRefresh = (async () => {
		const now = Date.now()

		for (const [deviceKey, timestamp] of failedDevices.entries()) {
			if (now - timestamp > FAILED_DEVICE_TTL) {
				failedDevices.delete(deviceKey)
			}
		}

		const grouped = new Map<string, BatchRequest[]>()
		for (const req of requests) {
			const key = getRequestKey(req.deviceConfig, req.address, req.type)
			if (!grouped.has(key)) {
				grouped.set(key, [])
			}
			grouped.get(key)!.push(req)
		}

		const batchPayload: Array<{
			host: string
			port: number
			unitId: number
			registerType: "coil" | "discrete"
			address: number
			length: number
			meta: { requestKey: string }
		}> = []

		for (const [requestKey, groupRequests] of grouped.entries()) {
			const firstReq = groupRequests[0]
			if (failedDevices.has(requestKey)) {
				groupRequests.forEach((r) => ensureLocationStatus(r.locationId).status = "error")
				continue
			}
			const cached = requestCache.get(requestKey)
			if (cached && now - cached.timestamp < REQUEST_CACHE_TTL) {
				if (cached.ok && typeof cached.value === "boolean") {
					await updateLocationStatuses(groupRequests.map((r) => r.locationId), cached.value)
				} else if (!cached.ok) {
					const errorMessage = cached.error || "無法讀取照明設備資料"
					groupRequests.forEach((r) => ensureLocationStatus(r.locationId).status = "error")
				}
				continue
			}

			batchPayload.push({
				host: firstReq.deviceConfig.host,
				port: firstReq.deviceConfig.port,
				unitId: firstReq.deviceConfig.unitId,
				registerType: firstReq.type,
				address: firstReq.address,
				length: 1,
				meta: { requestKey },
			})
		}

		if (batchPayload.length > 0) {
			try {
				const res = await batchRead(batchPayload)
				const list = res.results || []
				const byKey = new Map<string, (typeof list)[number]>()
				list.forEach((r) => {
					const k = (r as any)?.meta?.requestKey
					if (k) byKey.set(String(k), r)
				})

				for (const [requestKey, groupRequests] of grouped.entries()) {
					const rr = byKey.get(requestKey)
					const locationIds = groupRequests.map((r) => r.locationId)
					if (!rr) continue

					if ((rr as any).ok) {
						const v = (rr as any).data?.[0]
						if (typeof v === "boolean") {
							requestCache.set(requestKey, { timestamp: now, ok: true, value: v })
							await updateLocationStatuses(locationIds, v)
						}
						failedDevices.delete(requestKey)
						continue
					}

					const errorMessage = String((rr as any).error || "無法讀取照明設備資料")
					requestCache.set(requestKey, { timestamp: now, ok: false, error: errorMessage })
					if (
						errorMessage.includes("503") ||
						errorMessage.includes("Service Unavailable") ||
						errorMessage.includes("設備離線")
					) {
						failedDevices.set(requestKey, now)
					}

					locationIds.forEach((locationId) => {
						ensureLocationStatus(locationId).status = "error"
					})
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				batchPayload.forEach((p) => {
					requestCache.set(p.meta.requestKey, { timestamp: now, ok: false, error: errorMessage })
				})
				for (const [requestKey, groupRequests] of grouped.entries()) {
					if (
						errorMessage.includes("503") ||
						errorMessage.includes("Service Unavailable") ||
						errorMessage.includes("設備離線")
					) {
						failedDevices.set(requestKey, now)
					}
					groupRequests.forEach((r) => ensureLocationStatus(r.locationId).status = "error")
				}
			}
		}

		for (const [key, value] of requestCache.entries()) {
			if (now - value.timestamp > REQUEST_CACHE_TTL * 2) {
				requestCache.delete(key)
			}
		}
		})().finally(() => {
			inflightRefresh = null
		})

		await inflightRefresh
	}

	const collectLocationReadRequests = async (
		zone: LightingZone,
		location: LightingLocation,
		locationIndex: number
	): Promise<BatchRequest[]> => {
		if (!needsModbusConnection(location) || !location.modbus) return []

		const locationId = getLocationUiKey({ zone, location, locationIndex })
		const readPoint = extractReadPoint(location.modbus)
		if (!readPoint) {
			ensureLocationStatus(locationId, "error").status = "error"
			return []
		}

		const deviceConfig = await getLocationDeviceConfig(location)
		if (!deviceConfig) {
			ensureLocationStatus(locationId, "error").status = "error"
			return []
		}

		return [
			{
				deviceConfig: deviceConfig as { host: string; port: number; unitId: number },
				address: readPoint.address,
				type: readPoint.type,
				locationId: locationId,
			},
		]
	}

	const loadAllLocationStatuses = async (options?: { silent?: boolean; loadAllZones?: boolean }) => {
		const selectedZoneKey = selectedZone.value

		const locationsNeedingModbus: Array<{
			zone: LightingZone
			location: LightingLocation
			locationIndex: number
		}> = []
		lightingZones.value.forEach((zone) => {
			const zoneKey = zone.id || zone.name
			zone.locations.forEach((location, locationIndex) => {
				if (needsModbusConnection(location)) {
					if (options?.loadAllZones || (selectedZoneKey && zoneKey === selectedZoneKey)) {
						locationsNeedingModbus.push({ zone, location, locationIndex })
					}
				}
			})
		})

		if (locationsNeedingModbus.length === 0) return

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

		const allRequests: BatchRequest[] = []
		const results = await Promise.allSettled(
			locationsNeedingModbus.map(({ zone, location, locationIndex }) =>
				collectLocationReadRequests(zone, location, locationIndex)
			)
		)

		for (const result of results) {
			if (result.status === "fulfilled") {
				allRequests.push(...result.value)
			}
		}

		if (allRequests.length === 0) return

		await processBatchRequests(allRequests)
	}

	const initializeLocationStatuses = () => {
		lightingZones.value.forEach((zone) => {
			zone.locations.forEach((location, locationIndex) => {
				const locationId = getLocationUiKey({ zone, location, locationIndex })
				const hasController = hasLocationControllerConfig(location)
				const existingStatus = locationStatuses.value[locationId]

				locationStatuses.value[locationId] = {
					isRunning: hasController ? (existingStatus?.isRunning ?? false) : false,
					status: hasController ? (existingStatus?.status ?? "normal") : "error",
				}
			})
		})

		const locationIds = new Set<string>()
		lightingZones.value.forEach((zone) => {
			zone.locations.forEach((location, locationIndex) => {
				locationIds.add(getLocationUiKey({ zone, location, locationIndex }))
			})
		})
		Object.keys(locationStatuses.value).forEach((locationId) => {
			if (!locationIds.has(locationId)) {
				delete locationStatuses.value[locationId]
			}
		})
	}

	const locationDisabledMap = computed(() => {
		const map: Record<string, boolean> = {}
		lightingZones.value.forEach((zone) => {
			zone.locations.forEach((location, locationIndex) => {
				const locationId = getLocationUiKey({ zone, location, locationIndex })
				const isToggling = locationToggling.value.has(locationId)
				const hasDeviceReference = hasLocationControllerConfig(location)

				if (!hasDeviceReference) {
					map[locationId] = true
					return
				}

				if (location.modbus?.points && location.modbus.points.length > 0) {
					const hasDoPoints = filterDoPoints(location.modbus.points).length > 0
					map[locationId] = !hasDoPoints || isToggling
					return
				}

				if (location.modbus?.deviceId) {
					const hasDoAddresses = !(
						!location.modbus.doAddresses &&
						!location.modbus.doAddress &&
						!location.modbus.address
					)
					map[locationId] = !hasDoAddresses || isToggling
					return
				}

				map[locationId] = isToggling
			})
		})
		return map
	})

	const isLocationNormal = (locationId: string) => {
		const status = locationStatuses.value[locationId]
		return !status || status.status === "normal"
	}

	const executeToggle = async (locationId: string, targetValue: boolean) => {
		const found = findLocationById(locationId)
		if (!found) return

		const { location: targetLocation, zone: targetZone, locationIndex: targetLocationIndex } = found

		if (locationToggling.value.has(locationId)) {
			return
		}

		locationToggling.value.add(locationId)

		const currentStatus = locationStatuses.value[locationId]
		const currentValue = currentStatus?.isRunning ?? false

		try {
			if (locationStatuses.value[locationId]) {
				locationStatuses.value[locationId].isRunning = targetValue
			}

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

			const writeAddresses = extractWritePoints(targetLocation.modbus)
			if (writeAddresses.length === 0) {
				rollbackLocationStatus(locationId, currentValue)
				locationToggling.value.delete(locationId)
				return
			}

			await Promise.all(
				writeAddresses.map((address) => writeCoil(address, targetValue, deviceConfig))
			)

			const readPointAfterWrite = extractReadPoint(targetLocation.modbus)
			if (readPointAfterWrite) {
				requestCache.delete(
					getRequestKey(deviceConfig, readPointAfterWrite.address, readPointAfterWrite.type)
				)
			}

			setTimeout(async () => {
				if (readPointAfterWrite) {
					await refreshLocationStatusFresh(locationId, deviceConfig, readPointAfterWrite)
				} else {
					const readRequests = await collectLocationReadRequests(
						targetZone,
						targetLocation,
						targetLocationIndex
					)
					if (readRequests.length > 0) {
						await processBatchRequests(readRequests)
					}
				}
				locationToggling.value.delete(locationId)
			}, 450)
		} catch (error) {
			rollbackLocationStatus(locationId, currentValue)
			ensureLocationStatus(locationId, "error").status = "error"
			locationToggling.value.delete(locationId)

			handleError(error, `控制 ${targetLocation.name} 失敗`)
		}
	}

	const handleLocationToggle = async (locationId: string, targetValue: boolean) => {
		if (locationToggling.value.has(locationId)) {
			return
		}

		const existingTimer = toggleDebounceTimers.get(locationId)
		if (existingTimer) {
			clearTimeout(existingTimer)
		}

		const timer = setTimeout(async () => {
			await executeToggle(locationId, targetValue)
			toggleDebounceTimers.delete(locationId)
		}, TOGGLE_DEBOUNCE_DELAY)

		toggleDebounceTimers.set(locationId, timer)
	}

	const { start: startPolling, stop: stopPolling } = usePolling({
		callback: async () => {
			if (document.visibilityState === "visible") {
				await loadAllLocationStatuses({ silent: true, loadAllZones: true })
			}
		},
		interval: 5000,
		immediate: true,
		enabled: () => document.visibilityState === "visible",
		onError: (err) => {
			handleError(err, "載入區域狀態失敗")
		},
	})

	const startAutoRefresh = () => {
		startPolling()
	}

	const stopAutoRefresh = () => {
		stopPolling()
		requestCache.clear()
	}

	const handleVisibilityChange = () => {
		if (document.visibilityState === "visible") {
			void loadAllLocationStatuses({ silent: true, loadAllZones: true })
		}
	}

	watch(
		() => lightingZones.value,
		async () => {
			initializeLocationStatuses()
			await preloadDeviceInfos()
			void loadAllLocationStatuses({ loadAllZones: true })
		},
		{ deep: true }
	)

	return {
		locationStatuses,
		locationToggling,
		locationDisabledMap,
		initializeLocationStatuses,
		preloadDeviceInfos,
		loadAllLocationStatuses,
		handleLocationToggle,
		isLocationNormal,
		startAutoRefresh,
		stopAutoRefresh,
		handleVisibilityChange,
	}
}
