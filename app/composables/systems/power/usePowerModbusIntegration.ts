import { computed, ref, watch, type Ref } from "vue"
import type { DrainageStatusPointDef } from "~/types/location"
import type { PowerLocation, PowerStatusItem, PowerZone } from "~/types/power"
import type { Device, ControllerDeviceConfig } from "~/types/device"
import type { ModbusDeviceConfig } from "~/types/modbus"
import { useApiBase } from "~/composables/core/useApiBase"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePolling } from "~/composables/monitoring/usePolling"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"

const MODBUS_TIMEOUT = 3000
const REQUEST_CACHE_TTL = 4500
const FAILED_DEVICE_TTL = 30000
const HOT_REFRESH_TTL_MS = 15000

type RegisterType = "coil" | "discrete" | "holding" | "input"

type DeviceConn = { host: string; port: number; unitId: number }

type ModbusReadKind = RegisterType

type BatchRequest = {
	systemId: string
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	equipmentKind: PowerStatusItem["equipmentKind"]
	viewCategory: string
	bitKey: string
	pointDef: DrainageStatusPointDef
	deviceConfig: DeviceConn
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

const getRequestKey = (device: DeviceConn, kind: ModbusReadKind, address: number, length: number) =>
	`${buildDeviceKey(device)}:${kind}:${address}:${length}`

const booleanizeRegisterValue = (v: unknown): boolean | undefined => {
	if (typeof v === "boolean") return v
	if (typeof v === "number" && Number.isFinite(v)) return v !== 0
	if (v == null) return undefined
	return Boolean(v)
}

const deriveUiStatusForPowerItem = (item: PowerStatusItem): PowerStatusItem["uiStatus"] => {
	const raw = item.raw || {}
	const pointKeys = Object.keys(raw)
	if (pointKeys.length === 0) return "unknown"

	const anyRead = pointKeys.some((k) => raw[k] !== undefined && raw[k] !== null)
	if (!anyRead) return "warning"

	const kind = item.equipmentKind === "oil_level" ? "oil_level" : "generator"
	if (kind === "oil_level") {
		if (raw.oilLevelAlarm === true) return "alarm"
		return "normal"
	}

	if (raw.fault === true || raw.highOil === true || raw.lowOil === true) return "alarm"
	return "normal"
}

export const usePowerModbusIntegration = (powerZones: Ref<PowerZone[]>) => {
	const deviceApi = useDeviceApi()
	const { request } = useApiBase()
	const { handleError } = useErrorHandler()

	const statusItems = ref<PowerStatusItem[]>([])

	const deviceCache = ref<Map<number, Device>>(new Map())
	const deviceConfigCache = ref<Map<number, DeviceConn>>(new Map())

	const requestCache = new Map<
		string,
		{ timestamp: number; ok: boolean; value?: boolean; error?: string }
	>()
	const failedDevices = new Map<string, number>()
	let inflightSnapshot: Promise<void> | null = null
	const systemHotUntil = new Map<string, number>()
	const lastRawBySystemId = new Map<string, Record<string, unknown>>()

	const isSystemHot = (systemId: string, now: number) => {
		const until = systemHotUntil.get(systemId)
		return until != null && until > now
	}

	const bumpSystemHot = (systemId: string, now: number, ttlMs: number) => {
		const next = now + Math.max(0, ttlMs)
		const prev = systemHotUntil.get(systemId) || 0
		systemHotUntil.set(systemId, Math.max(prev, next))
	}

	const extractDeviceConfig = (device: Device): DeviceConn | null => {
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
		powerZones.value.forEach((zone) => {
			zone.locations.forEach((loc) => {
				if (typeof loc.deviceId === "number" && Number.isFinite(loc.deviceId)) ids.add(loc.deviceId)
				const modbusDeviceId = (loc.modbus as { deviceId?: unknown } | undefined)?.deviceId
				if (typeof modbusDeviceId === "number" && Number.isFinite(modbusDeviceId))
					ids.add(modbusDeviceId)
				const points = loc.statusPoints || {}
				Object.values(points).forEach((p) => {
					if (!p) return
					if (typeof p.deviceId === "number" && Number.isFinite(p.deviceId)) ids.add(p.deviceId)
				})
			})
		})

		const uncached = Array.from(ids).filter((id) => !deviceCache.value.has(id))
		if (uncached.length === 0) return
		await Promise.allSettled(uncached.map((id) => loadDeviceInfo(id)))
	}

	const resolveDeviceConfig = async (
		loc: PowerLocation,
		pointDef: DrainageStatusPointDef
	): Promise<DeviceConn | null> => {
		const pointDeviceId =
			typeof pointDef.deviceId === "number" && Number.isFinite(pointDef.deviceId)
				? pointDef.deviceId
				: null
		const locDeviceId =
			typeof loc.deviceId === "number" && Number.isFinite(loc.deviceId) ? loc.deviceId : null
		const modbusDeviceId =
			typeof (loc.modbus as { deviceId?: unknown } | undefined)?.deviceId === "number"
				? ((loc.modbus as { deviceId?: unknown }).deviceId as number)
				: null

		const effectiveDeviceId = pointDeviceId ?? locDeviceId ?? modbusDeviceId
		if (effectiveDeviceId != null) {
			if (deviceConfigCache.value.has(effectiveDeviceId))
				return deviceConfigCache.value.get(effectiveDeviceId)!
			await loadDeviceInfo(effectiveDeviceId)
			return deviceConfigCache.value.get(effectiveDeviceId) || null
		}

		const inline = loc.modbus as { host?: unknown; port?: unknown; unitId?: unknown } | undefined
		if (inline?.host && inline?.port !== undefined) {
			const host = String(inline.host).trim()
			const port = Number(inline.port)
			const unitId = Number(inline.unitId ?? 1)
			if (host && Number.isFinite(port) && Number.isFinite(unitId)) {
				return { host, port, unitId }
			}
		}

		return null
	}

	const batchRead = async (
		reqs: Array<{
			host: string
			port: number
			unitId: number
			registerType: ModbusReadKind
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
						registerType: ModbusReadKind
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

	const collectRequestsFromZones = async (): Promise<BatchRequest[]> => {
		const reqs: BatchRequest[] = []
		for (const zone of powerZones.value || []) {
			for (const loc of zone.locations || []) {
				if (!loc.systemId) continue
				const points = loc.statusPoints || {}
				for (const bitKey of Object.keys(points)) {
					const pointDef = points[bitKey]
					if (!pointDef) continue
					const reg = normalizeRegisterType(pointDef.registerType)
					if (!reg) continue
					const deviceConfig = await resolveDeviceConfig(loc, pointDef)
					const defaultKind = loc.equipmentKind || "generator"
					const defaultVc = String(loc.viewCategory || "generator")
					if (!deviceConfig) {
						reqs.push({
							systemId: String(loc.systemId),
							zoneId: String(zone.id || zone.name || ""),
							zoneName: zone.name,
							locationId: String(loc.id || ""),
							locationName: loc.name,
							equipmentKind: defaultKind,
							viewCategory: defaultVc,
							bitKey,
							pointDef: { ...pointDef, registerType: reg },
							deviceConfig: null as any,
						})
						continue
					}
					reqs.push({
						systemId: String(loc.systemId),
						zoneId: String(zone.id || zone.name || ""),
						zoneName: zone.name,
						locationId: String(loc.id || ""),
						locationName: loc.name,
						equipmentKind: defaultKind,
						viewCategory: defaultVc,
						bitKey,
						pointDef: { ...pointDef, registerType: reg },
						deviceConfig,
					})
				}
			}
		}
		return reqs
	}

	const loadStatusSnapshot = async () => {
		if (inflightSnapshot) {
			await inflightSnapshot
			return
		}

		inflightSnapshot = (async () => {
			const now = Date.now()

			for (const [key, ts] of failedDevices.entries()) {
				if (now - ts > FAILED_DEVICE_TTL) failedDevices.delete(key)
			}
			for (const [systemId, until] of systemHotUntil.entries()) {
				if (until <= now) systemHotUntil.delete(systemId)
			}

			const requests = await collectRequestsFromZones()
			if (requests.length === 0) {
				statusItems.value = []
				return
			}

			const baseItemsBySystemId = new Map<string, PowerStatusItem>()
			for (const r of requests) {
				if (!baseItemsBySystemId.has(r.systemId)) {
					baseItemsBySystemId.set(r.systemId, {
						zoneId: r.zoneId,
						zoneName: r.zoneName,
						locationId: r.locationId,
						locationName: r.locationName,
						systemId: r.systemId,
						equipmentKind: r.equipmentKind,
						viewCategory: r.viewCategory,
						uiStatus: "unknown",
						raw: {},
					})
				}
			}

			const grouped = new Map<string, BatchRequest[]>()
			const deviceConfigMissingBySystemId = new Set<string>()
			for (const r of requests) {
				if (!r.deviceConfig) {
					deviceConfigMissingBySystemId.add(r.systemId)
					continue
				}
				const kind = normalizeRegisterType(r.pointDef.registerType) as ModbusReadKind
				const address = Number(r.pointDef.address)
				const length = r.pointDef.length != null ? Number(r.pointDef.length) : 1
				const key = getRequestKey(r.deviceConfig, kind, address, length)
				if (!grouped.has(key)) grouped.set(key, [])
				grouped.get(key)!.push(r)
			}

			const batchPayload: Array<{
				host: string
				port: number
				unitId: number
				registerType: ModbusReadKind
				address: number
				length: number
				meta: { requestKey: string; noCache?: boolean }
			}> = []

			for (const [requestKey, groupRequests] of grouped.entries()) {
				const first = groupRequests[0]
				if (!first?.deviceConfig) continue

				if (failedDevices.has(requestKey)) {
					groupRequests.forEach((r) => {
						const it = baseItemsBySystemId.get(r.systemId)
						if (!it) return
						it.raw = it.raw || {}
						it.raw[r.bitKey] = undefined
						it.uiStatus = "warning"
						it.error = it.error || "設備離線或讀取失敗（暫停重試）"
					})
					continue
				}

				const noCache = isSystemHot(first.systemId, now)

				const cached = noCache ? null : requestCache.get(requestKey)
				if (cached && now - cached.timestamp < REQUEST_CACHE_TTL) {
					if (cached.ok) {
						groupRequests.forEach((gr) => {
							const it = baseItemsBySystemId.get(gr.systemId)
							if (!it) return
							it.raw = it.raw || {}
							it.raw[gr.bitKey] = cached.value
						})
					} else {
						groupRequests.forEach((gr) => {
							const it = baseItemsBySystemId.get(gr.systemId)
							if (!it) return
							it.raw = it.raw || {}
							it.raw[gr.bitKey] = undefined
							it.uiStatus = "warning"
							it.error = it.error || cached.error || "無法讀取電力設備資料"
						})
					}
					continue
				}

				const kind = first.pointDef.registerType as ModbusReadKind
				const address = Number(first.pointDef.address)
				const length = first.pointDef.length != null ? Number(first.pointDef.length) : 1

				batchPayload.push({
					host: first.deviceConfig.host,
					port: first.deviceConfig.port,
					unitId: first.deviceConfig.unitId,
					registerType: kind,
					address,
					length,
					meta: { requestKey, ...(noCache ? { noCache: true } : {}) },
				})
			}

			if (batchPayload.length > 0) {
				try {
					const res = await batchRead(batchPayload)
					const resultList = res.results || []
					const byKey = new Map<string, (typeof resultList)[number]>()
					resultList.forEach((r) => {
						const k = (r as any)?.meta?.requestKey
						if (k) byKey.set(String(k), r)
					})

					for (const [requestKey, groupRequests] of grouped.entries()) {
						const r = byKey.get(requestKey)
						if (!r) continue

						if ((r as any).ok) {
							const v = booleanizeRegisterValue((r as any).data?.[0])
							requestCache.set(requestKey, { timestamp: now, ok: true, value: v })
							groupRequests.forEach((gr) => {
								const it = baseItemsBySystemId.get(gr.systemId)
								if (!it) return
								it.raw = it.raw || {}
								it.raw[gr.bitKey] = v
							})
							failedDevices.delete(requestKey)
							continue
						}

						const msg = String((r as any).error || "無法讀取電力設備資料")
						requestCache.set(requestKey, { timestamp: now, ok: false, error: msg })
						if (
							msg.includes("503") ||
							msg.includes("Service Unavailable") ||
							msg.includes("連接") ||
							msg.includes("超時")
						) {
							failedDevices.set(requestKey, now)
						}
						groupRequests.forEach((gr) => {
							const it = baseItemsBySystemId.get(gr.systemId)
							if (!it) return
							it.raw = it.raw || {}
							it.raw[gr.bitKey] = undefined
							it.uiStatus = "warning"
							it.error = it.error || msg
						})
					}
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error)
					for (const p of batchPayload) {
						requestCache.set(p.meta.requestKey, { timestamp: now, ok: false, error: msg })
					}
					for (const [requestKey, groupRequests] of grouped.entries()) {
						if (
							msg.includes("503") ||
							msg.includes("Service Unavailable") ||
							msg.includes("連接") ||
							msg.includes("超時")
						) {
							failedDevices.set(requestKey, now)
						}
						groupRequests.forEach((gr) => {
							const it = baseItemsBySystemId.get(gr.systemId)
							if (!it) return
							it.raw = it.raw || {}
							it.raw[gr.bitKey] = undefined
							it.uiStatus = "warning"
							it.error = it.error || msg || "無法讀取電力設備資料"
						})
					}
				}
			}

			const out: PowerStatusItem[] = Array.from(baseItemsBySystemId.values()).map((it) => {
				const hasDeviceConfig = !deviceConfigMissingBySystemId.has(String(it.systemId))
				if (!hasDeviceConfig) {
					return {
						...it,
						uiStatus: "warning",
						error: it.error || "無可用控制器連線設定（deviceId 或 modbus.host/port）",
					}
				}
				const computedStatus = deriveUiStatusForPowerItem(it)
				return { ...it, uiStatus: computedStatus }
			})

			statusItems.value = out

			for (const it of out) {
				const systemId = String(it.systemId)
				const raw = (it.raw || {}) as Record<string, unknown>

				const last = lastRawBySystemId.get(systemId) || {}
				let changed = false
				for (const k of Object.keys(raw)) {
					const a = raw[k]
					const b = last[k]
					if (a !== b) {
						changed = true
						break
					}
				}
				lastRawBySystemId.set(systemId, raw)

				if (it.uiStatus === "alarm" || it.uiStatus === "warning") {
					bumpSystemHot(systemId, now, HOT_REFRESH_TTL_MS)
					continue
				}
				if (changed) {
					bumpSystemHot(systemId, now, 6000)
				}
			}

			for (const [key, value] of requestCache.entries()) {
				if (now - value.timestamp > REQUEST_CACHE_TTL * 2) requestCache.delete(key)
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
		interval: 5000,
		immediate: true,
		enabled: () => typeof document !== "undefined" && document.visibilityState === "visible",
		onError: (err) => {
			handleError(err, "載入電力狀態失敗")
		},
	})

	const handleVisibilityChange = () => {
		if (typeof document === "undefined") return
		if (document.visibilityState === "visible") {
			void loadStatusSnapshot()
		}
	}

	watch(
		() => powerZones.value,
		async () => {
			const activeSystemIds = new Set<string>()
			for (const z of powerZones.value || []) {
				for (const l of z.locations || []) {
					if (l.systemId) activeSystemIds.add(String(l.systemId))
				}
			}
			for (const k of systemHotUntil.keys()) {
				if (!activeSystemIds.has(String(k))) systemHotUntil.delete(String(k))
			}
			for (const k of lastRawBySystemId.keys()) {
				if (!activeSystemIds.has(String(k))) lastRawBySystemId.delete(String(k))
			}

			await preloadDeviceInfos()
			void loadStatusSnapshot()
		},
		{ deep: true }
	)

	return {
		statusItems: computed(() => statusItems.value),
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
