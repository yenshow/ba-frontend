import { ref, watch, type Ref } from "vue"
import type { HvacLocation, HvacZone, HvacUiStatus } from "~/types/hvac"
import type { Device, ControllerDeviceConfig } from "~/types/device"
import type { ModbusDeviceConfig } from "~/utils/modbusPoints"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useHvacApi } from "~/composables/systems/hvac/useHvacApi"
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useModbusPollingPolicy } from "~/composables/monitoring/useModbusPollingPolicy"
import { extractWritePoints, hasControllerConfig } from "~/utils/modbusPoints"
import { findLocationInZonesByUiKey, getLocationUiKey } from "~/utils/locationUiId"
import type { MapDotStatus } from "~/utils/monitoringStatus"

const TOGGLE_DEBOUNCE_DELAY = 300
const TOGGLE_ROUNDTRIP_DELAY_MS = 450
const TOGGLE_SNAPSHOT_HOLD_MS = 8000

type HvacLocationStatus = {
	isOn: boolean
	uiStatus: HvacUiStatus
	temperatureC: number | null
}

export const useHvacModbusIntegration = (hvacZones: Ref<HvacZone[]>, selectedZone: Ref<string>) => {
	const hvacApi = useHvacApi()
	const deviceApi = useDeviceApi()
	const { request } = useApiBase()
	const { handleError } = useErrorHandler()

	const locationStatuses = ref<Record<string, HvacLocationStatus>>({})
	const locationToggling = ref<Set<string>>(new Set())
	const locationDisabledMap = ref<Record<string, boolean>>({})
	// 切換後短時間內避免輪詢用舊快照覆寫 UI（等快照追上再解除）
	const snapshotHoldUntilByUiKey = ref<Record<string, number>>({})

	const deviceCache = ref<Map<number, Device>>(new Map())
	const deviceConfigCache = ref<Map<number, { host: string; port: number; unitId: number }>>(
		new Map()
	)
	const toggleDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
	let inflightRefresh: Promise<void> | null = null
	const pollingPolicy = useModbusPollingPolicy()

	const setSnapshotHold = (uiKey: string) => {
		snapshotHoldUntilByUiKey.value = {
			...snapshotHoldUntilByUiKey.value,
			[uiKey]: Date.now() + TOGGLE_SNAPSHOT_HOLD_MS,
		}
	}

	const clearSnapshotHold = (uiKey: string) => {
		if (!snapshotHoldUntilByUiKey.value[uiKey]) return
		const { [uiKey]: _removed, ...rest } = snapshotHoldUntilByUiKey.value
		snapshotHoldUntilByUiKey.value = rest
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

	const extractDeviceConfig = (
		device: Device
	): { host: string; port: number; unitId: number } | null => {
		const config = device.config as ControllerDeviceConfig & Record<string, unknown>
		if (!config?.host || config.port === undefined || config.unitId === undefined) return null
		const isController =
			config.type === "controller" ||
			(device as Device & { type_code?: string }).type_code === "controller"
		if (!isController) return null
		return { host: String(config.host), port: Number(config.port), unitId: Number(config.unitId) }
	}

	const loadDeviceInfo = async (deviceId: number): Promise<Device | null> => {
		if (deviceCache.value.has(deviceId)) return deviceCache.value.get(deviceId)!
		try {
			const result = await deviceApi.getDevice(deviceId)
			const device = result.device
			deviceCache.value.set(deviceId, device)
			const cfg = extractDeviceConfig(device)
			if (cfg) deviceConfigCache.value.set(deviceId, cfg)
			return device
		} catch (error) {
			handleError(error, `載入設備 ${deviceId} 失敗`)
			return null
		}
	}

	const preloadDeviceInfos = async () => {
		const deviceIds = new Set<number>()
		for (const zone of hvacZones.value) {
			for (const loc of zone.locations) {
				if (loc.modbus?.deviceId) deviceIds.add(loc.modbus.deviceId)
			}
		}
		const uncached = Array.from(deviceIds).filter((id) => !deviceCache.value.has(id))
		if (uncached.length === 0) return
		await Promise.allSettled(uncached.map((id) => loadDeviceInfo(id)))
	}

	const getLocationDeviceConfig = async (
		location: HvacLocation
	): Promise<{ host: string; port: number; unitId: number } | null> => {
		if (!location.modbus) return null
		const effectiveDeviceId = location.deviceId ?? location.modbus.deviceId
		if (!effectiveDeviceId) {
			// inline device config（相容舊資料）
			const mb: any = location.modbus as any
			if (mb.host && mb.port && mb.unitId !== undefined) {
				return { host: String(mb.host), port: Number(mb.port), unitId: Number(mb.unitId) }
			}
			return null
		}
		if (deviceConfigCache.value.has(effectiveDeviceId))
			return deviceConfigCache.value.get(effectiveDeviceId)!
		const device = await loadDeviceInfo(effectiveDeviceId)
		if (!device) return null
		return deviceConfigCache.value.get(effectiveDeviceId) || null
	}

	const ensureLocationStatus = (locationId: string): HvacLocationStatus => {
		if (!locationStatuses.value[locationId]) {
			locationStatuses.value[locationId] = {
				isOn: false,
				uiStatus: "warning",
				temperatureC: null,
			}
		}
		return locationStatuses.value[locationId]
	}

	const mapBackendUiStatus = (ui: unknown): HvacUiStatus => {
		const s = String(ui || "").toLowerCase()
		if (s === "normal") return "normal"
		// HVAC 對外不提供 alarm：一律視為 warning 層
		if (s === "alarm") return "warning"
		return "warning"
	}

	const coerceNumber = (v: unknown): number | null => {
		if (typeof v === "number" && Number.isFinite(v)) return v
		if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
		return null
	}

	const locationToUiKey = (zone: HvacZone, location: HvacLocation, locationIndex: number) =>
		getLocationUiKey({ zone: zone as any, location: location as any, locationIndex })

	const findLocationByUiKey = (locationId: string, requireDbId = false) =>
		findLocationInZonesByUiKey<HvacLocation, HvacZone>(hvacZones.value, locationId, { requireDbId })

	const initializeLocationStatuses = () => {
		const disabled: Record<string, boolean> = {}
		for (const zone of hvacZones.value) {
			zone.locations.forEach((loc, idx) => {
				const id = locationToUiKey(zone, loc, idx)
				ensureLocationStatus(id)
				const hasController = hasControllerConfig({
					deviceId: (loc as any).deviceId,
					modbus: (loc as any).modbus,
				})
				const hasWritableDo = !!loc.modbus && extractWritePoints(loc.modbus as any).length > 0
				disabled[id] = !hasController || !hasWritableDo
			})
		}
		locationDisabledMap.value = disabled
	}

	// 移除 batch-read 直讀：HVAC 狀態一律以後端 /hvac/status 快照為準

	const loadAllLocationStatuses = async (options?: { loadAllZones?: boolean }) => {
		if (inflightRefresh) return inflightRefresh
		inflightRefresh = (async () => {
			try {
				const zoneIds =
					selectedZone.value && !options?.loadAllZones ? [selectedZone.value] : undefined
				const { items } = await hvacApi.getStatus(zoneIds)

				const locationIdToUiKey = new Map<string, string>()
				for (const zone of hvacZones.value) {
					for (let i = 0; i < zone.locations.length; i++) {
						const loc = zone.locations[i]!
						if (!loc.id) continue
						locationIdToUiKey.set(String(loc.id), locationToUiKey(zone, loc, i))
					}
				}

				const now = Date.now()
				for (const item of (items || []) as any[]) {
					const uiKey = locationIdToUiKey.get(String(item.locationId))
					if (!uiKey) continue
					const status = ensureLocationStatus(uiKey)
					status.uiStatus = mapBackendUiStatus(item.uiStatus)
					const holdUntil = snapshotHoldUntilByUiKey.value[uiKey] ?? 0
					const nextIsOn = Boolean(item?.raw?.isOn)
					if (holdUntil > now) {
						// 若快照仍與目前狀態相反，先不覆寫（避免 UI 跳回）
						if (status.isOn !== nextIsOn) {
							continue
						}
						// 快照已追上 → 解除 hold
						clearSnapshotHold(uiKey)
					} else if (holdUntil > 0) {
						// hold 已過期：清掉避免累積
						clearSnapshotHold(uiKey)
					}
					status.isOn = nextIsOn
					status.temperatureC = coerceNumber(item?.raw?.temperatureC)
				}

				pollingPolicy.recordSuccess()
			} catch (error) {
				pollingPolicy.recordFailure()
				handleError(error, "載入空調狀態失敗")
			} finally {
				inflightRefresh = null
			}
		})()
		return inflightRefresh
	}

	const handleLocationToggle = async (locationUiKey: string, nextIsOn: boolean) => {
		if (locationToggling.value.has(locationUiKey)) return

		const existingTimer = toggleDebounceTimers.get(locationUiKey)
		if (existingTimer) clearTimeout(existingTimer)

		const timer = setTimeout(async () => {
			await executeToggle(locationUiKey, nextIsOn)
			toggleDebounceTimers.delete(locationUiKey)
		}, TOGGLE_DEBOUNCE_DELAY)

		toggleDebounceTimers.set(locationUiKey, timer)
	}

	const executeToggle = async (locationUiKey: string, nextIsOn: boolean) => {
		const found = findLocationByUiKey(locationUiKey, true)
		if (!found) return

		const { location } = found
		if (!location.modbus) return
		if (locationToggling.value.has(locationUiKey)) return

		locationToggling.value.add(locationUiKey)
		setSnapshotHold(locationUiKey)

		const status = ensureLocationStatus(locationUiKey)
		const prev = status.isOn

		try {
			// 1) 樂觀更新
			status.isOn = nextIsOn
			// OFF 不代表異常：保留目前健康狀態（由回讀決定）
			status.uiStatus = status.uiStatus ?? "warning"

			// 2) 寫入
			const deviceConfig = await getLocationDeviceConfig(location)
			if (!deviceConfig) {
				status.isOn = prev
				// 維持原 uiStatus（健康狀態）
				status.uiStatus = status.uiStatus ?? "warning"
				clearSnapshotHold(locationUiKey)
				locationToggling.value.delete(locationUiKey)
				return
			}

			const writeAddresses = extractWritePoints(location.modbus as any)
			if (writeAddresses.length === 0) {
				status.isOn = prev
				status.uiStatus = status.uiStatus ?? "warning"
				clearSnapshotHold(locationUiKey)
				locationToggling.value.delete(locationUiKey)
				return
			}

			await Promise.all(writeAddresses.map((addr) => writeCoil(addr, nextIsOn, deviceConfig)))

			// 3) 延遲回讀：狀態以後端 /hvac/status 快照為準
			setTimeout(async () => {
				try {
					await loadAllLocationStatuses({ loadAllZones: true })
				} finally {
					locationToggling.value.delete(locationUiKey)
				}
			}, TOGGLE_ROUNDTRIP_DELAY_MS)
		} catch (error) {
			status.isOn = prev
			status.uiStatus = status.uiStatus ?? "warning"
			clearSnapshotHold(locationUiKey)
			locationToggling.value.delete(locationUiKey)
			handleError(error, "空調切換失敗")
		}
	}

	const dotStatusForLocation = (locationUiKey: string): MapDotStatus => {
		const s = locationStatuses.value[locationUiKey]
		if (!s) return "warning"
		return s.uiStatus
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
			handleError(err, "載入空調狀態失敗")
		},
	})

	const startAutoRefresh = () => {
		startPolling()
	}

	const stopAutoRefresh = () => {
		stopPolling()
		toggleDebounceTimers.clear()
	}

	const handleVisibilityChange = async () => {
		if (typeof document === "undefined") return
		if (document.visibilityState === "visible") {
			await loadAllLocationStatuses({ loadAllZones: true })
		}
	}

	// 與照明一致：zones 變更時重新初始化與預載
	watch(
		() => hvacZones.value,
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
		dotStatusForLocation,
		startAutoRefresh,
		stopAutoRefresh,
		handleVisibilityChange,
	}
}
