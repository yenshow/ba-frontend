import { ref, watch, type Ref } from "vue"
import type { HvacLocation, HvacZone, HvacUiStatus } from "~/types/hvac"
import type { Device, ControllerDeviceConfig } from "~/types/device"
import type { ModbusDeviceConfig } from "~/types/modbus"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useHvacApi } from "~/composables/systems/hvac/useHvacApi"
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import {
	MODBUS_FAILURE_CACHE_TTL_MS,
	MODBUS_SUCCESS_CACHE_TTL_MS,
	isSuppressibleModbusError,
	useModbusPollingPolicy,
} from "~/composables/monitoring/useModbusPollingPolicy"
import { extractReadPoint, extractWritePoints, hasControllerConfig } from "~/utils/modbusPoints"
import { findLocationInZonesByUiKey, getLocationUiKey } from "~/utils/locationUiId"

const MODBUS_TIMEOUT = 3000
const TOGGLE_DEBOUNCE_DELAY = 300
const TOGGLE_ROUNDTRIP_DELAY_MS = 450
const REQUEST_CACHE_TTL = MODBUS_SUCCESS_CACHE_TTL_MS
const FAILED_DEVICE_TTL = MODBUS_FAILURE_CACHE_TTL_MS

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

	const deviceCache = ref<Map<number, Device>>(new Map())
	const deviceConfigCache = ref<Map<number, { host: string; port: number; unitId: number }>>(new Map())

	const requestCache = new Map<
		string,
		{ timestamp: number; ok: boolean; value?: unknown; error?: string }
	>()
	const failedDevices = new Map<string, number>()
	const toggleDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
	let inflightRefresh: Promise<void> | null = null
	const pollingPolicy = useModbusPollingPolicy()

	const batchRead = async (
		reqs: Array<{
			host: string
			port: number
			unitId: number
			registerType: "coil" | "discrete" | "holding" | "input"
			address: number
			length: number
			meta?: any
		}>
	) => {
		return { results: [] } as any
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

	const extractDeviceConfig = (device: Device): { host: string; port: number; unitId: number } | null => {
		const config = device.config as ControllerDeviceConfig & Record<string, unknown>
		if (!config?.host || config.port === undefined || config.unitId === undefined) return null
		const isController =
			config.type === "controller" || (device as Device & { type_code?: string }).type_code === "controller"
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
		if (deviceConfigCache.value.has(effectiveDeviceId)) return deviceConfigCache.value.get(effectiveDeviceId)!
		const device = await loadDeviceInfo(effectiveDeviceId)
		if (!device) return null
		return deviceConfigCache.value.get(effectiveDeviceId) || null
	}

	const getRequestKey = (
		deviceConfig: { host: string; port: number; unitId: number },
		registerType: "coil" | "discrete" | "holding" | "input",
		address: number
	) => `${deviceConfig.host}:${deviceConfig.port}:${deviceConfig.unitId}:${registerType}:${address}`

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

	/**
	 * 對齊照明：uiStatus 代表「健康狀態」，不等同於 ON/OFF。
	 * - 只要讀取成功（有拿到 boolean）就視為 normal（不論 true/false）
	 * - 讀取失敗／缺少連線設定才視為 warning
	 */
	const toUiStatusFromReadOk = (readOk: boolean): HvacUiStatus => (readOk ? "normal" : "warning")

	const mapBackendUiStatus = (ui: unknown): HvacUiStatus => {
		const s = String(ui || "").toLowerCase()
		if (s === "normal") return "normal"
		if (s === "alarm") return "alarm"
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
				const hasWritableDo =
					!!loc.modbus && extractWritePoints(loc.modbus as any).length > 0
				disabled[id] = !hasController || !hasWritableDo
			})
		}
		locationDisabledMap.value = disabled
	}

	const refreshLocationStatusFresh = async (
		locationUiKey: string,
		location: HvacLocation,
		deviceConfig: { host: string; port: number; unitId: number }
	) => {
		if (!location.modbus) return
		const readPoint = extractReadPoint(location.modbus as any)
		if (!readPoint) return

		const requestKey = getRequestKey(deviceConfig, readPoint.type, readPoint.address)
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
			const status = ensureLocationStatus(locationUiKey)
			if (rr?.ok && typeof rr.data?.[0] === "boolean") {
				requestCache.set(requestKey, { timestamp: Date.now(), ok: true, value: rr.data[0] })
				status.isOn = rr.data[0]
				status.uiStatus = toUiStatusFromReadOk(true)
				return
			}
			requestCache.set(requestKey, {
				timestamp: Date.now(),
				ok: false,
				error: String(rr?.error || "讀取失敗"),
			})
			status.uiStatus = "warning"
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error)
			requestCache.set(requestKey, { timestamp: Date.now(), ok: false, error: msg })
			ensureLocationStatus(locationUiKey).uiStatus = "warning"
		}
	}

	const loadAllLocationStatuses = async (options?: { loadAllZones?: boolean }) => {
		if (inflightRefresh) return inflightRefresh
		inflightRefresh = (async () => {
			let hasSnapshotFailure = false
			// 優先使用後端 HVAC status snapshot（涵蓋 DI/DO isOn + statusPoints 數值）
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

				for (const item of (items || []) as any[]) {
					const uiKey = locationIdToUiKey.get(String(item.locationId))
					if (!uiKey) continue
					const status = ensureLocationStatus(uiKey)
					status.uiStatus = mapBackendUiStatus(item.uiStatus)
					status.isOn = Boolean(item?.raw?.isOn)
					status.temperatureC = coerceNumber(item?.raw?.temperatureC)
				}
				pollingPolicy.recordSuccess()
				return
			} catch (error) {
				pollingPolicy.recordFailure()
				handleError(error, "載入空調狀態失敗")
				return
			}

			let reqs: Array<{
				host: string
				port: number
				unitId: number
				registerType: "coil" | "discrete" | "holding" | "input"
				address: number
				length: number
				meta?: any
			}> = []
			try {
				const now = Date.now()
				for (const [requestKey, timestamp] of failedDevices.entries()) {
					if (now - timestamp > FAILED_DEVICE_TTL) failedDevices.delete(requestKey)
				}

				const zones = options?.loadAllZones ? hvacZones.value : hvacZones.value
				reqs = []

				const metaRows: Array<{
					locationUiKey: string
					onRegister?: { registerType: "coil" | "discrete"; address: number }
					tempRegister?: { registerType: "holding" | "input"; address: number; length: number }
					deviceConfig: { host: string; port: number; unitId: number }
				}> = []

				for (const zone of zones) {
					zone.locations.forEach((loc, idx) => {
						const locationUiKey = locationToUiKey(zone, loc, idx)
						if (!loc.modbus) return
						metaRows.push({
							locationUiKey,
							deviceConfig: { host: "", port: 0, unitId: 0 } as any,
						} as any)
					})
				}

				// 逐筆取得 device config（避免大量 batch-read 先發後才發現缺 config）
				for (const zone of zones) {
					for (let i = 0; i < zone.locations.length; i++) {
						const loc = zone.locations[i]!
						const locationUiKey = locationToUiKey(zone, loc, i)
						ensureLocationStatus(locationUiKey)

						if (!loc.modbus) continue
						const deviceConfig = await getLocationDeviceConfig(loc)
						if (!deviceConfig) {
							locationDisabledMap.value[locationUiKey] = true
							locationStatuses.value[locationUiKey].uiStatus = "warning"
							continue
						}

						const onPoint = extractReadPoint(loc.modbus as any)
						if (onPoint) {
							const requestKey = getRequestKey(deviceConfig, onPoint.type, onPoint.address)
							if (failedDevices.has(requestKey)) {
								locationStatuses.value[locationUiKey].uiStatus = "warning"
							} else {
							const cached = requestCache.get(requestKey)
							const isCacheFresh = cached && Date.now() - cached.timestamp <= REQUEST_CACHE_TTL
							if (!isCacheFresh) {
								reqs.push({
									host: deviceConfig.host,
									port: deviceConfig.port,
									unitId: deviceConfig.unitId,
									registerType: onPoint.type,
									address: onPoint.address,
									length: 1,
									meta: { requestKey },
								})
							}
							}
						}

						const tempPoint = loc.statusPoints?.temperatureC
						if (tempPoint && (tempPoint.registerType === "holding" || tempPoint.registerType === "input")) {
							const length = tempPoint.length ?? 1
							const requestKey = getRequestKey(deviceConfig, tempPoint.registerType, tempPoint.address)
							if (failedDevices.has(requestKey)) {
								// 讀溫度失敗不影響 ON/OFF 顯示，只跳過本次讀取
							} else {
							const cached = requestCache.get(requestKey)
							const isCacheFresh = cached && Date.now() - cached.timestamp <= REQUEST_CACHE_TTL
							if (!isCacheFresh) {
								reqs.push({
									host: deviceConfig.host,
									port: deviceConfig.port,
									unitId: deviceConfig.unitId,
									registerType: tempPoint.registerType,
									address: tempPoint.address,
									length,
									meta: { requestKey },
								})
							}
							}
						}
					}
				}

				if (reqs.length === 0) return
				const res = await batchRead(reqs)

				for (const r of res.results ?? []) {
					const rr: any = r as any
					const requestKey = rr?.meta?.requestKey as string | undefined
					if (!requestKey) continue
					if (rr?.ok) {
						requestCache.set(requestKey, {
							timestamp: now,
							ok: true,
							value: rr.data?.[0],
						})
						failedDevices.delete(requestKey)
					} else {
						const errorMessage = String(rr?.error || "讀取失敗")
						hasSnapshotFailure = true
						requestCache.set(requestKey, {
							timestamp: now,
							ok: false,
							error: errorMessage,
						})
						if (isSuppressibleModbusError(errorMessage)) {
							failedDevices.set(requestKey, now)
						}
					}
				}
				if (hasSnapshotFailure) {
					pollingPolicy.recordFailure()
				} else {
					pollingPolicy.recordSuccess()
				}

				// 將 cache 回寫到 UI 狀態（用 requestKey 反推）
				for (const zone of hvacZones.value) {
					for (let i = 0; i < zone.locations.length; i++) {
						const loc = zone.locations[i]!
						const locationUiKey = locationToUiKey(zone, loc, i)
						const status = ensureLocationStatus(locationUiKey)
						if (!loc.modbus) continue
						const deviceConfig = await getLocationDeviceConfig(loc)
						if (!deviceConfig) continue

						const onPoint = extractReadPoint(loc.modbus as any)
						if (onPoint) {
							const requestKey = getRequestKey(deviceConfig, onPoint.type, onPoint.address)
							const cached = requestCache.get(requestKey)
							const v = cached?.ok ? cached.value : undefined
							if (typeof v === "boolean") {
								status.isOn = v === true
								status.uiStatus = toUiStatusFromReadOk(true)
							} else {
								status.uiStatus = "warning"
							}
						}

						const tempPoint = loc.statusPoints?.temperatureC
						if (tempPoint && (tempPoint.registerType === "holding" || tempPoint.registerType === "input")) {
							const requestKey = getRequestKey(deviceConfig, tempPoint.registerType, tempPoint.address)
							const cached = requestCache.get(requestKey)
							const v = cached?.ok ? cached.value : undefined
							if (typeof v === "number") {
								status.temperatureC = Number(v)
							}
						}
					}
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				// 批次讀取失敗時，將本輪所有 requestKey 記錄為失敗，降低刷爆
				const now = Date.now()
				for (const req of reqs || []) {
					const requestKey = (req as any)?.meta?.requestKey
					if (!requestKey) continue
					requestCache.set(String(requestKey), { timestamp: now, ok: false, error: errorMessage })
					if (isSuppressibleModbusError(errorMessage)) {
						failedDevices.set(String(requestKey), now)
					}
				}
				hasSnapshotFailure = true
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
				locationToggling.value.delete(locationUiKey)
				return
			}

			const writeAddresses = extractWritePoints(location.modbus as any)
			if (writeAddresses.length === 0) {
				status.isOn = prev
				status.uiStatus = status.uiStatus ?? "warning"
				locationToggling.value.delete(locationUiKey)
				return
			}

			await Promise.all(writeAddresses.map((addr) => writeCoil(addr, nextIsOn, deviceConfig)))

			// 3) 清快取 + 延遲回讀（noCache）
			const readPoint = extractReadPoint(location.modbus as any)
			if (readPoint) requestCache.delete(getRequestKey(deviceConfig, readPoint.type, readPoint.address))
			for (const addr of writeAddresses) requestCache.delete(getRequestKey(deviceConfig, "coil", addr))

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
			locationToggling.value.delete(locationUiKey)
			handleError(error, "空調切換失敗")
		}
	}

	const dotStatusForLocation = (locationUiKey: string): "normal" | "warning" | "alarm" => {
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
		requestCache.clear()
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

