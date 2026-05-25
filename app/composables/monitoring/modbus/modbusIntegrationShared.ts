import { ref } from "vue"
import type { Device, ControllerDeviceConfig } from "~/types/device"
import type { ModbusStatusPointDef } from "~/types/location"
import type { SystemUiStatus } from "~/utils/monitoringStatus"
import { getZoneUiKey, type ZoneUiKeyable } from "~/utils/locationUiId"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

export type ModbusDeviceConn = { host: string; port: number; unitId: number }

export type ModbusIntegrationZoneLocation = {
	deviceId?: number
	modbus?: { deviceId?: unknown } | null
	statusPoints?: Record<string, ModbusStatusPointDef | undefined> | null
}

export type ModbusIntegrationZone = {
	locations: ModbusIntegrationZoneLocation[]
}

export type ToggleSnapshotZoneFilterOptions = {
	loadAllZones?: boolean
}

export type ToggleModbusSnapshotApplyResult = "applied" | "hold" | "skip"

export const collectDeviceIdsFromZones = (zones: ModbusIntegrationZone[]): number[] => {
	const ids = new Set<number>()
	for (const zone of zones) {
		for (const loc of zone.locations) {
			if (typeof loc.deviceId === "number" && Number.isFinite(loc.deviceId)) ids.add(loc.deviceId)
			const mbId = loc.modbus?.deviceId
			if (typeof mbId === "number" && Number.isFinite(mbId)) ids.add(mbId)
			const points = loc.statusPoints || {}
			Object.values(points).forEach((p) => {
				const pid = p?.deviceId
				if (typeof pid === "number" && Number.isFinite(pid)) ids.add(pid)
			})
		}
	}
	return Array.from(ids)
}

export const extractControllerDeviceConfig = (device: Device): ModbusDeviceConn | null => {
	const config = device.config as ControllerDeviceConfig & Record<string, unknown>
	if (!config?.host || config.port === undefined || config.unitId === undefined) return null
	const isController =
		config.type === "controller" ||
		(device as Device & { type_code?: string }).type_code === "controller"
	if (!isController) return null
	return { host: String(config.host), port: Number(config.port), unitId: Number(config.unitId) }
}

export const useModbusIntegrationDeviceCache = () => {
	const deviceApi = useDeviceApi()
	const { handleError } = useErrorHandler()
	const deviceCache = ref<Map<number, Device>>(new Map())
	const deviceConfigCache = ref<Map<number, ModbusDeviceConn>>(new Map())

	const loadDeviceInfo = async (deviceId: number): Promise<Device | null> => {
		if (deviceCache.value.has(deviceId)) return deviceCache.value.get(deviceId)!
		try {
			const result = await deviceApi.getDevice(deviceId)
			const device = result.device
			deviceCache.value.set(deviceId, device)
			const cfg = extractControllerDeviceConfig(device)
			if (cfg) deviceConfigCache.value.set(deviceId, cfg)
			return device
		} catch (error) {
			handleError(error, `載入設備 ${deviceId} 失敗`)
			return null
		}
	}

	const preloadDeviceInfos = async (
		zones: ModbusIntegrationZone[],
		collectIds: (z: ModbusIntegrationZone[]) => number[] = collectDeviceIdsFromZones
	) => {
		const uncached = collectIds(zones).filter((id) => !deviceCache.value.has(id))
		if (uncached.length === 0) return
		await Promise.allSettled(uncached.map((id) => loadDeviceInfo(id)))
	}

	return { deviceConfigCache, loadDeviceInfo, preloadDeviceInfos }
}

export const resolveToggleSnapshotZoneIds = <TZone extends ZoneUiKeyable>(
	zones: TZone[],
	selectedZone: string,
	options?: ToggleSnapshotZoneFilterOptions
): string[] | undefined => {
	if (options?.loadAllZones) return undefined
	const sel = String(selectedZone ?? "").trim()
	if (!sel) return undefined

	const matchedIds = zones
		.filter((zone) => getZoneUiKey(zone) === sel)
		.map((zone) => zone.id)
		.filter((id): id is string => id != null && String(id).trim() !== "")
		.map((id) => String(id))

	if (matchedIds.length > 0) return matchedIds
	return [sel]
}

export const mapToggleBackendUiStatus = (ui: unknown): SystemUiStatus => {
	const s = String(ui || "").toLowerCase()
	if (s === "normal") return "normal"
	return "warning"
}

export const coerceToggleSnapshotNumber = (v: unknown): number | null => {
	if (typeof v === "number" && Number.isFinite(v)) return v
	if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
	return null
}

export type ToggleSnapshotHoldApplyArgs<TStatus> = {
	status: TStatus
	uiKey: string
	now: number
	holdUntil: number
	clearHold: (uiKey: string) => void
	getBoolean: (status: TStatus) => boolean
	setBoolean: (status: TStatus, value: boolean) => void
	nextBoolean: boolean
}

export const applyToggleSnapshotWithBooleanHold = <TStatus>(
	args: ToggleSnapshotHoldApplyArgs<TStatus>
): ToggleModbusSnapshotApplyResult => {
	const { status, uiKey, now, holdUntil, clearHold, getBoolean, setBoolean, nextBoolean } = args
	if (holdUntil > now) {
		if (getBoolean(status) !== nextBoolean) return "hold"
		clearHold(uiKey)
	} else if (holdUntil > 0) {
		clearHold(uiKey)
	}
	setBoolean(status, nextBoolean)
	return "applied"
}
