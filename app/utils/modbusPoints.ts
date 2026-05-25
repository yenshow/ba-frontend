import { normalizeOptionalDeviceId } from "~/utils/deviceIdUtils"

/**
 * 系統無關的 Modbus 點位工具（DI/DO 為主，供多系統共用）
 *
 * - 不依賴任何特定系統型別（Lighting/HVAC/Air/Emergency...）
 * - 兼容現有 `modbus` config 可能出現的欄位命名（points/diAddress/doAddress/addresses...）
 */

export type ModbusRegisterType = "coil" | "discrete" | "holding" | "input"

export type ModbusPointKind = "DI" | "DO"

/** 表單顯示用 DI／DO，對應 Modbus discrete／coil */
export type DiDo = "DI" | "DO"

export const mapDiDoToRegisterType = (t: DiDo): ModbusRegisterType =>
	t === "DO" ? "coil" : "discrete"

export const registerTypeToDiDo = (def: { registerType?: unknown } | undefined): DiDo => {
	if (!def) return "DI"
	const rt = String(def.registerType || "").toLowerCase()
	if (rt === "coil") return "DO"
	return "DI"
}

export type ModbusPointLike = {
	type?: string
	method?: string
	address?: number
	length?: number
}

export type ModbusConfigLike = {
	host?: string
	port?: number
	unitId?: number

	deviceId?: number

	// points schema（常見）
	points?: ModbusPointLike[]

	// legacy / compact schema（常見）
	diAddresses?: number[]
	doAddresses?: number[]

	diAddress?: number
	diLength?: number
	doAddress?: number
	doLength?: number

	// fallback（舊系統可能使用）
	address?: number
	length?: number
}

export type ControllerConfigLike = {
	deviceId?: number | string | null
	modbus?: ModbusConfigLike | null
}

export interface ModbusHealth {
	isOpen: boolean
	host: string
	port: number
	unitId: number
	lastConnectedAt: string | null
}

export interface ModbusDeviceConfig {
	host: string
	port: number
	unitId: number
}

export interface ModbusDataResponse<T = number | boolean> {
	address: number
	length: number
	data: T[]
	device?: ModbusDeviceConfig
}

export const hasInlineModbusDeviceConfig = (
	modbus: ModbusConfigLike | null | undefined
): boolean => {
	if (!modbus) return false
	return Boolean(modbus.host && modbus.port != null && modbus.unitId !== undefined)
}

export const hasControllerConfig = (cfg: ControllerConfigLike | null | undefined): boolean => {
	if (!cfg) return false
	if (normalizeOptionalDeviceId(cfg.deviceId)) return true
	if (!cfg.modbus) return false
	return hasInlineModbusDeviceConfig(cfg.modbus)
}

export const needsModbusConnection = (
	location: { modbus?: unknown } | null | undefined
): boolean => {
	return Boolean(location && (location as any).modbus)
}

export const filterDoPoints = (points: ModbusPointLike[] | undefined) => {
	if (!points || points.length === 0) return []
	return points.filter((p) => {
		if (p.type === "DO" || p.type === "do") return true
		if (p.method === "writeCoil" || p.method === "writeCoils" || p.method === "getCoils")
			return true
		return false
	})
}

export const filterDiPoints = (points: ModbusPointLike[] | undefined) => {
	if (!points || points.length === 0) return []
	return points.filter((p) => {
		if (p.type === "DI" || p.type === "di") return true
		if (p.method === "getDiscreteInputs") return true
		return false
	})
}

export const extractDiAddresses = (modbus: ModbusConfigLike): number[] => {
	if (Array.isArray(modbus.diAddresses) && modbus.diAddresses.length > 0) {
		return modbus.diAddresses
	}
	if (modbus.diAddress !== undefined) {
		const start = modbus.diAddress
		const length = modbus.diLength ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	return []
}

export const extractDoAddresses = (modbus: ModbusConfigLike): number[] => {
	if (Array.isArray(modbus.doAddresses) && modbus.doAddresses.length > 0) {
		return modbus.doAddresses
	}
	if (modbus.doAddress !== undefined) {
		const start = modbus.doAddress
		const length = modbus.doLength ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	if (modbus.address !== undefined) {
		const start = modbus.address
		const length = modbus.length ?? 1
		return Array.from({ length }, (_, i) => start + i)
	}
	return []
}

export const extractReadPoint = (
	modbus: ModbusConfigLike
): { address: number; type: "coil" | "discrete" } | null => {
	if (modbus.points && modbus.points.length > 0) {
		const diPoints = filterDiPoints(modbus.points)
		if (diPoints.length > 0 && typeof diPoints[0].address === "number") {
			return { address: diPoints[0].address, type: "discrete" }
		}
		const doPoints = filterDoPoints(modbus.points)
		if (doPoints.length > 0 && typeof doPoints[0].address === "number") {
			return { address: doPoints[0].address, type: "coil" }
		}
	} else {
		const diAddresses = extractDiAddresses(modbus)
		if (diAddresses.length > 0) return { address: Math.min(...diAddresses), type: "discrete" }
		const doAddresses = extractDoAddresses(modbus)
		if (doAddresses.length > 0) return { address: Math.min(...doAddresses), type: "coil" }
	}
	return null
}

export const extractWritePoints = (modbus: ModbusConfigLike): number[] => {
	if (modbus.points && modbus.points.length > 0) {
		const doPoints = filterDoPoints(modbus.points)
		return doPoints.map((p) => p.address).filter((x): x is number => typeof x === "number")
	}
	return extractDoAddresses(modbus)
}
