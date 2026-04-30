import { computed, ref, watch, type Ref } from "vue"
import type { DrainageStatusPointDef } from "~/types/location"
import type { AirCirculationLocation, AirCirculationZone, AirCirculationUiStatus } from "~/types/air-circulation"
import type { Device, ControllerDeviceConfig } from "~/types/device"
import type { ModbusDeviceConfig } from "~/types/modbus"
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import {
	MODBUS_FAILURE_CACHE_TTL_MS,
	MODBUS_SUCCESS_CACHE_TTL_MS,
	isSuppressibleModbusError,
	useModbusPollingPolicy,
} from "~/composables/monitoring/useModbusPollingPolicy"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useAirCirculationApi } from "~/composables/systems/air-circulation/useAirCirculationApi"
import { extractReadPoint, extractWritePoints, hasControllerConfig } from "~/utils/modbusPoints"
import { normalizeSystemUiStatus } from "~/types/monitoring"

const MODBUS_TIMEOUT = 3000
const REQUEST_CACHE_TTL = MODBUS_SUCCESS_CACHE_TTL_MS
const FAILED_DEVICE_TTL = MODBUS_FAILURE_CACHE_TTL_MS

type RegisterType = "coil" | "discrete" | "holding" | "input"
type DeviceConn = { host: string; port: number; unitId: number }

type AirCirculationStatusItem = {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	uiStatus: AirCirculationUiStatus
	raw: Record<string, unknown>
	error?: string
}

const normalizeRegisterType = (raw: unknown): RegisterType | null => {
	const t = String(raw ?? "")
		.trim()
		.toLowerCase()
	if (t === "di") return "discrete"
	if (t === "do") return "coil"
	if (t === "coil" || t === "discrete" || t === "holding" || t === "input") return t
	return null
}

const buildDeviceKey = (c: DeviceConn) => `${c.host}:${c.port}:${c.unitId}`
const getRequestKey = (device: DeviceConn, kind: RegisterType, address: number, length: number) =>
	`${buildDeviceKey(device)}:${kind}:${address}:${length}`

const deriveUiStatus = (raw: Record<string, unknown>, hadDeviceConfig: boolean, configuredKeys: string[]): AirCirculationUiStatus => {
	if (!hadDeviceConfig) return "warning"
	if (configuredKeys.length === 0) return "warning"

	const anyRead = configuredKeys.some((k) => raw[k] !== undefined && raw[k] !== null)
	if (!anyRead) return "warning"

	// 常見 alarm key（若使用者在 statusPoints 內配置了這些鍵）
	const alarmKeys = ["alarm", "fault", "trip", "runningAlarm", "highAlarm", "lowAlarm"]
	const anyAlarm = alarmKeys.some((k) => raw[k] === true)
	if (anyAlarm) return "alarm"

	return "normal"
}

const booleanizeRegisterValue = (v: unknown): boolean | number | undefined => {
	if (typeof v === "boolean") return v
	if (typeof v === "number" && Number.isFinite(v)) return v
	if (v == null) return undefined
	if (v === "true") return true
	if (v === "false") return false
	return undefined
}

export const useAirCirculationModbusIntegration = (zonesRef: Ref<AirCirculationZone[]>) => {
	const airApi = useAirCirculationApi()
	const deviceApi = useDeviceApi()
	const { request } = useApiBase()
	const { handleError } = useErrorHandler()

	const statusItems = ref<AirCirculationStatusItem[]>([])
	const locationDisabledMap = ref<Record<string, boolean>>({})

	const deviceCache = ref<Map<number, Device>>(new Map())
	const deviceConfigCache = ref<Map<number, DeviceConn>>(new Map())

	const requestCache = new Map<string, { timestamp: number; ok: boolean; value?: unknown; error?: string }>()
	const failedDevices = new Map<string, number>()
	let inflightSnapshot: Promise<void> | null = null
	const pollingPolicy = useModbusPollingPolicy()

	const batchRead = async (
		reqs: Array<{
			host: string
			port: number
			unitId: number
			registerType: RegisterType
			address: number
			length: number
			meta?: any
		}>
	) => {
		return { results: [] } as any
	}

	const extractDeviceConfig = (device: Device): DeviceConn | null => {
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
		const ids = new Set<number>()
		for (const zone of zonesRef.value) {
			for (const loc of zone.locations) {
				if (typeof loc.deviceId === "number" && Number.isFinite(loc.deviceId)) ids.add(loc.deviceId)
				const mbId = (loc.modbus as { deviceId?: unknown } | undefined)?.deviceId
				if (typeof mbId === "number" && Number.isFinite(mbId)) ids.add(mbId)
				const points = loc.statusPoints || {}
				Object.values(points).forEach((p) => {
					const pid = (p as DrainageStatusPointDef | undefined)?.deviceId
					if (typeof pid === "number" && Number.isFinite(pid)) ids.add(pid)
				})
			}
		}
		const uncached = Array.from(ids).filter((id) => !deviceCache.value.has(id))
		if (uncached.length === 0) return
		await Promise.allSettled(uncached.map((id) => loadDeviceInfo(id)))
	}

	const resolveDeviceConfig = async (
		loc: AirCirculationLocation,
		pointDef?: DrainageStatusPointDef
	): Promise<DeviceConn | null> => {
		const pointDeviceId =
			pointDef && typeof pointDef.deviceId === "number" && Number.isFinite(pointDef.deviceId)
				? pointDef.deviceId
				: null
		const locDeviceId = typeof loc.deviceId === "number" && Number.isFinite(loc.deviceId) ? loc.deviceId : null
		const modbusDeviceId =
			typeof (loc.modbus as { deviceId?: unknown } | undefined)?.deviceId === "number"
				? ((loc.modbus as { deviceId?: unknown }).deviceId as number)
				: null
		const effectiveDeviceId = pointDeviceId ?? locDeviceId ?? modbusDeviceId
		if (effectiveDeviceId != null) {
			if (deviceConfigCache.value.has(effectiveDeviceId)) return deviceConfigCache.value.get(effectiveDeviceId)!
			await loadDeviceInfo(effectiveDeviceId)
			return deviceConfigCache.value.get(effectiveDeviceId) || null
		}

		const inline = loc.modbus as { host?: unknown; port?: unknown; unitId?: unknown } | undefined
		if (inline?.host && inline?.port !== undefined) {
			const host = String(inline.host).trim()
			const port = Number(inline.port)
			const unitId = Number(inline.unitId ?? 1)
			if (host && Number.isFinite(port) && Number.isFinite(unitId)) return { host, port, unitId }
		}
		return null
	}

	const initializeLocationDisabledMap = () => {
		const disabled: Record<string, boolean> = {}
		for (const zone of zonesRef.value) {
			for (const loc of zone.locations) {
				const hasController = hasControllerConfig({
					deviceId: (loc as any).deviceId,
					modbus: (loc as any).modbus,
				})
				const hasWritableDo = !!loc.modbus && extractWritePoints(loc.modbus as any).length > 0
				disabled[String(loc.id ?? "") || `${zone.id || zone.name}:${loc.name}`] = !hasController || !hasWritableDo
			}
		}
		locationDisabledMap.value = disabled
	}

	const loadStatusSnapshot = async () => {
		if (inflightSnapshot) {
			await inflightSnapshot
			return
		}

		inflightSnapshot = (async () => {
			// 以後端 status snapshot 為主（與 fire/drainage 同步同語意）
			try {
				const result = await airApi.getStatus()
				statusItems.value = (result.items || []) as AirCirculationStatusItem[]
				pollingPolicy.recordSuccess()
				return
			} catch (error) {
				pollingPolicy.recordFailure()
				handleError(error, "載入空氣循環狀態失敗")
				return
			}

			const now = Date.now()
			let hasSnapshotFailure = false
			for (const [key, ts] of failedDevices.entries()) {
				if (now - ts > FAILED_DEVICE_TTL) failedDevices.delete(key)
			}

			const reqs: Array<{
				host: string
				port: number
				unitId: number
				registerType: RegisterType
				address: number
				length: number
				meta: { requestKey: string; locationId: string; pointKey: string; zoneId: string; zoneName: string; locationName: string; systemId: string }
			}> = []

			const baseItemsBySystemId = new Map<string, AirCirculationStatusItem>()
			const missingDeviceBySystemId = new Set<string>()

			for (const zone of zonesRef.value) {
				for (const loc of zone.locations) {
					const systemId = String(loc.systemId || loc.id || "")
					if (!systemId) continue

					if (!baseItemsBySystemId.has(systemId)) {
						baseItemsBySystemId.set(systemId, {
							zoneId: String(zone.id || zone.name || ""),
							zoneName: zone.name,
							locationId: String(loc.id || ""),
							locationName: loc.name,
							systemId,
							uiStatus: "warning",
							raw: {},
						})
					}

					const points = loc.statusPoints || {}
					const keys = Object.keys(points).filter((k) => points[k] && typeof points[k] === "object")
					if (keys.length === 0) continue

					for (const pointKey of keys) {
						const def = points[pointKey] as DrainageStatusPointDef
						const reg = normalizeRegisterType(def.registerType)
						if (!reg) continue
						const address = Number(def.address)
						const length = def.length != null ? Number(def.length) : 1
						if (!Number.isFinite(address) || address < 0 || !Number.isFinite(length) || length <= 0) continue

						const deviceConfig = await resolveDeviceConfig(loc, def)
						if (!deviceConfig) {
							missingDeviceBySystemId.add(systemId)
							continue
						}

						const requestKey = getRequestKey(deviceConfig, reg, address, length)
						if (failedDevices.has(requestKey)) {
							continue
						}
						const cached = requestCache.get(requestKey)
						const isCacheFresh = cached && now - cached.timestamp <= REQUEST_CACHE_TTL
						if (isCacheFresh) {
							const it = baseItemsBySystemId.get(systemId)
							if (it && cached?.ok) it.raw[pointKey] = cached.value
							continue
						}

						reqs.push({
							host: deviceConfig.host,
							port: deviceConfig.port,
							unitId: deviceConfig.unitId,
							registerType: reg,
							address,
							length,
							meta: {
								requestKey,
								locationId: String(loc.id || ""),
								locationName: loc.name,
								pointKey,
								zoneId: String(zone.id || zone.name || ""),
								zoneName: zone.name,
								systemId,
							},
						})
					}
				}
			}

			if (reqs.length > 0) {
				try {
					const res = await batchRead(reqs)
					for (const r of res.results ?? []) {
						const rr: any = r as any
						const meta = rr?.meta || {}
						const requestKey = meta.requestKey as string | undefined
						const systemId = meta.systemId as string | undefined
						const pointKey = meta.pointKey as string | undefined
						if (!requestKey || !systemId || !pointKey) continue

						if (rr.ok) {
							const v0 = rr.data?.[0]
							const v = booleanizeRegisterValue(v0)
							requestCache.set(requestKey, { timestamp: now, ok: true, value: v })
							failedDevices.delete(requestKey)
							const it = baseItemsBySystemId.get(systemId)
							if (it) it.raw[pointKey] = v
						} else {
							const msg = String(rr.error || "讀取失敗")
							hasSnapshotFailure = true
							requestCache.set(requestKey, { timestamp: now, ok: false, error: msg })
							if (isSuppressibleModbusError(msg)) {
								failedDevices.set(requestKey, now)
							}
						}
					}
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error)
					reqs.forEach((p) => requestCache.set(p.meta.requestKey, { timestamp: now, ok: false, error: msg }))
					hasSnapshotFailure = true
				}
			}

			const out: AirCirculationStatusItem[] = []
			for (const it of baseItemsBySystemId.values()) {
				const configuredKeys = Object.keys(it.raw || {})
				const hadDeviceConfig = !missingDeviceBySystemId.has(String(it.systemId))
				const uiStatus = normalizeSystemUiStatus(
					deriveUiStatus(it.raw || {}, hadDeviceConfig, configuredKeys)
				)
				out.push({
					...it,
					uiStatus,
				})
			}

			statusItems.value = out
			if (hasSnapshotFailure) {
				pollingPolicy.recordFailure()
			} else {
				pollingPolicy.recordSuccess()
			}
		})().finally(() => {
			inflightSnapshot = null
		})

		await inflightSnapshot
	}

	const { start: startPolling, stop: stopPolling } = usePolling({
		callback: async () => {
			if (typeof document === "undefined") return
			if (document.visibilityState !== "visible") return
			await loadStatusSnapshot()
		},
		interval: pollingPolicy.pollIntervalMs,
		immediate: true,
		enabled: () => typeof document !== "undefined" && document.visibilityState === "visible",
		onError: (err) => {
			handleError(err, "載入空氣循環狀態失敗")
		},
	})

	const handleVisibilityChange = () => {
		if (typeof document === "undefined") return
		if (document.visibilityState === "visible") {
			void loadStatusSnapshot()
		}
	}

	watch(
		() => zonesRef.value,
		async () => {
			initializeLocationDisabledMap()
			await preloadDeviceInfos()
			void loadStatusSnapshot()
		},
		{ deep: true }
	)

	return {
		statusItems: computed(() => statusItems.value),
		locationDisabledMap,
		preloadDeviceInfos,
		loadStatusSnapshot,
		startAutoRefresh: () => startPolling(),
		stopAutoRefresh: () => {
			stopPolling()
			requestCache.clear()
		},
		handleVisibilityChange,
	}
}

