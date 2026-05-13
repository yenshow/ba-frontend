import { computed, ref, watch, type Ref } from "vue"
import type { LightingLocation, LightingStatusSnapshotItem, LightingZone } from "~/types/lighting"
import type { ControllerDeviceConfig, Device } from "~/types/device"
import type { ModbusDeviceConfig } from "~/utils/modbusPoints"
import { useLightingApi } from "~/composables/systems/lighting/useLightingApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useModbusPollingPolicy } from "~/composables/monitoring/useModbusPollingPolicy"
import {
	extractWritePoints,
	filterDoPoints,
	hasLocationControllerConfig,
	needsModbusConnection,
} from "~/utils/modbusPoints"
import { findLocationInZonesByUiKey, getLocationUiKey, getZoneUiKey } from "~/utils/locationUiId"
import type { SystemUiStatus } from "~/utils/monitoringStatus"

const TOGGLE_DEBOUNCE_DELAY = 300
const TOGGLE_ROUNDTRIP_DELAY_MS = 450
const TOGGLE_SNAPSHOT_HOLD_MS = 8000

type LightingLocationStatus = {
	isRunning: boolean
	status: SystemUiStatus
}

export const useLightingModbusIntegration = (
	lightingZones: Ref<LightingZone[]>,
	selectedZone: Ref<string>
) => {
	const lightingApi = useLightingApi()
	const deviceApi = useDeviceApi()
	const { request } = useApiBase()
	const { handleError } = useErrorHandler()

	const locationStatuses = ref<Record<string, LightingLocationStatus>>({})
	const locationToggling = ref<Set<string>>(new Set())
	// 切換後短時間內避免輪詢用舊快照覆寫 UI（等快照追上再解除）
	const snapshotHoldUntilByLocationId = ref<Record<string, number>>({})
	const deviceCache = ref<Map<number, Device>>(new Map())
	const deviceConfigCache = ref<Map<number, { host: string; port: number; unitId: number }>>(
		new Map()
	)
	const toggleDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
	let inflightStatusRefresh: Promise<void> | null = null
	const pollingPolicy = useModbusPollingPolicy()

	const setSnapshotHold = (locationId: string) => {
		snapshotHoldUntilByLocationId.value = {
			...snapshotHoldUntilByLocationId.value,
			[locationId]: Date.now() + TOGGLE_SNAPSHOT_HOLD_MS,
		}
	}

	const clearSnapshotHold = (locationId: string) => {
		if (!snapshotHoldUntilByLocationId.value[locationId]) return
		const { [locationId]: _removed, ...rest } = snapshotHoldUntilByLocationId.value
		snapshotHoldUntilByLocationId.value = rest
	}

	const writeCoil = async (address: number, value: boolean, deviceConfig: ModbusDeviceConfig) => {
		const queryParams = new URLSearchParams({
			host: deviceConfig.host,
			port: String(deviceConfig.port),
			unitId: String(deviceConfig.unitId),
		})
		return request<{
			address: number
			value: boolean
			success: boolean
			device: ModbusDeviceConfig
		}>(`/modbus/coils?${queryParams.toString()}`, {
			method: "PUT",
			body: JSON.stringify({ address, value }),
		})
	}

	/** 與 useHvacModbusIntegration 一致：尚未有狀態物件時預設為異常（warning），直到快照覆寫 */
	const ensureLocationStatus = (
		locationId: string,
		defaultStatus: SystemUiStatus = "warning"
	): LightingLocationStatus => {
		if (!locationStatuses.value[locationId]) {
			locationStatuses.value[locationId] = {
				isRunning: false,
				status: defaultStatus,
			}
		}
		return locationStatuses.value[locationId]
	}

	/** 與 useHvacModbusIntegration 一致：後端 offline/unknown 等均視為 warning；alarm 對外併入 warning */
	const mapBackendSnapshotUiStatus = (ui: unknown): SystemUiStatus => {
		const s = String(ui || "").toLowerCase()
		if (s === "normal") return "normal"
		if (s === "alarm") return "warning"
		return "warning"
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
				const devId = location.deviceId ?? location.modbus?.deviceId
				if (typeof devId === "number" && Number.isFinite(devId)) {
					deviceIds.add(devId)
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

	const getActiveZoneIdsForSnapshot = (options?: { loadAllZones?: boolean }) => {
		if (options?.loadAllZones) return []
		const sel = String(selectedZone.value ?? "").trim()
		if (!sel) return []
		return lightingZones.value
			.filter((zone) => getZoneUiKey(zone) === sel)
			.map((zone) => zone.id)
			.filter((id): id is string => id != null && String(id).trim() !== "")
			.map((id) => Number(id))
			.filter((id) => Number.isFinite(id))
	}

	/** 與 useHvacModbusIntegration 相同：只依後端回傳的 items 覆寫有對應 locationId 的地點（不掃全區強制 warning） */
	const applyBackendSnapshotItems = (items: LightingStatusSnapshotItem[]) => {
		const locationIdToUiKey = new Map<string, string>()
		for (const zone of lightingZones.value) {
			for (let i = 0; i < zone.locations.length; i++) {
				const loc = zone.locations[i]!
				if (!loc.id) continue
				locationIdToUiKey.set(String(loc.id), getLocationUiKey({ zone, location: loc, locationIndex: i }))
			}
		}

		const now = Date.now()
		for (const item of items || []) {
			const uiKey = locationIdToUiKey.get(String(item.locationId))
			if (!uiKey) continue
			const status = ensureLocationStatus(uiKey)
			status.status = mapBackendSnapshotUiStatus(item.uiStatus)

			const holdUntil = snapshotHoldUntilByLocationId.value[uiKey] ?? 0
			const nextIsRunning = item.raw?.isOn === true
			if (holdUntil > now) {
				if (status.isRunning !== nextIsRunning) {
					continue
				}
				clearSnapshotHold(uiKey)
			} else if (holdUntil > 0) {
				clearSnapshotHold(uiKey)
			}

			status.isRunning = nextIsRunning
		}
	}

	const loadAllLocationStatuses = async (options?: { loadAllZones?: boolean }) => {
		if (inflightStatusRefresh) {
			return inflightStatusRefresh
		}

		inflightStatusRefresh = (async () => {
			try {
				const activeZoneIds = getActiveZoneIdsForSnapshot(options)
				const backendStatus = await lightingApi.getStatus({
					zoneIds: activeZoneIds.length > 0 ? activeZoneIds : undefined,
				})
				applyBackendSnapshotItems(backendStatus.items || [])
				pollingPolicy.recordSuccess()
			} catch (error) {
				pollingPolicy.recordFailure()
				handleError(error, "載入照明狀態失敗")
			} finally {
				inflightStatusRefresh = null
			}
		})()

		return inflightStatusRefresh
	}

	const findLocationById = (locationId: string, requireDbId = false) => {
		return findLocationInZonesByUiKey<LightingLocation, LightingZone>(
			lightingZones.value,
			locationId,
			{ requireDbId }
		)
	}

	const initializeLocationStatuses = () => {
		lightingZones.value.forEach((zone) => {
			zone.locations.forEach((location, locationIndex) => {
				const locationId = getLocationUiKey({ zone, location, locationIndex })
				const hasController = hasLocationControllerConfig(location)
				const existingStatus = locationStatuses.value[locationId]
				const nextStatus: LightingLocationStatus = {
					isRunning: hasController ? (existingStatus?.isRunning ?? false) : false,
					status: hasController ? (existingStatus?.status ?? "warning") : "warning",
				}
				if (
					existingStatus &&
					existingStatus.isRunning === nextStatus.isRunning &&
					existingStatus.status === nextStatus.status
				) {
					return
				}
				locationStatuses.value[locationId] = nextStatus
			})
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
		return !!status && status.status === "normal"
	}

	const executeToggle = async (locationId: string, targetValue: boolean) => {
		const found = findLocationById(locationId)
		if (!found) return

		const { location } = found
		if (!needsModbusConnection(location) || !location.modbus) return
		if (locationToggling.value.has(locationId)) return

		locationToggling.value.add(locationId)
		setSnapshotHold(locationId)
		const currentStatus = locationStatuses.value[locationId]
		const currentValue = currentStatus?.isRunning ?? false

		try {
			ensureLocationStatus(locationId).isRunning = targetValue
			const deviceConfig = await getLocationDeviceConfig(location)
			if (!deviceConfig) {
				ensureLocationStatus(locationId).isRunning = currentValue
				clearSnapshotHold(locationId)
				return
			}

			const writeAddresses = extractWritePoints(location.modbus)
			if (writeAddresses.length === 0) {
				ensureLocationStatus(locationId).isRunning = currentValue
				clearSnapshotHold(locationId)
				return
			}

			await Promise.all(
				writeAddresses.map((address) => writeCoil(address, targetValue, deviceConfig))
			)

			setTimeout(async () => {
				try {
					await loadAllLocationStatuses({ loadAllZones: true })
				} finally {
					locationToggling.value.delete(locationId)
				}
			}, TOGGLE_ROUNDTRIP_DELAY_MS)
		} catch (error) {
			ensureLocationStatus(locationId).isRunning = currentValue
			ensureLocationStatus(locationId).status = "warning"
			handleError(error, `控制 ${location.name} 失敗`)
			clearSnapshotHold(locationId)
			locationToggling.value.delete(locationId)
		}
	}

	const handleLocationToggle = async (locationId: string, targetValue: boolean) => {
		if (locationToggling.value.has(locationId)) return
		const existingTimer = toggleDebounceTimers.get(locationId)
		if (existingTimer) clearTimeout(existingTimer)

		const timer = setTimeout(async () => {
			await executeToggle(locationId, targetValue)
			toggleDebounceTimers.delete(locationId)
		}, TOGGLE_DEBOUNCE_DELAY)
		toggleDebounceTimers.set(locationId, timer)
	}

	const { start: startPolling, stop: stopPolling } = usePolling({
		callback: async () => {
			if (document.visibilityState === "visible") {
				await loadAllLocationStatuses({ loadAllZones: true })
			}
		},
		interval: pollingPolicy.pollIntervalMs,
		immediate: true,
		enabled: () => document.visibilityState === "visible",
		onError: (err) => {
			handleError(err, "載入照明狀態失敗")
		},
	})

	const startAutoRefresh = () => {
		startPolling()
	}

	const stopAutoRefresh = () => {
		stopPolling()
	}

	const handleVisibilityChange = async () => {
		if (typeof document === "undefined") return
		if (document.visibilityState === "visible") {
			await loadAllLocationStatuses({ loadAllZones: true })
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
