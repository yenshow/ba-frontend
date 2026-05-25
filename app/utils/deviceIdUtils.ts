import type { ModbusStatusPointDef } from "~/types/location"

/** 地點／系統 config 的有效設備 ID：僅正整數；0 與非數字視為未設定 */
export const normalizeOptionalDeviceId = (id: unknown): number | undefined => {
	if (id == null || id === "") return undefined
	const n = typeof id === "number" ? id : Number(id)
	if (!Number.isFinite(n) || n <= 0) return undefined
	return Math.trunc(n)
}

export const addNormalizedDeviceId = (ids: Set<number>, id: unknown) => {
	const normalized = normalizeOptionalDeviceId(id)
	if (normalized) ids.add(normalized)
}

/**
 * modbus 區塊僅保留點位／連線欄位；設備 ID 以地點 `deviceId`（API `config.deviceId` / DB `device_ids`）為 SSOT。
 */
export const stripModbusDeviceId = <T extends { deviceId?: unknown }>(
	modbus: T | null | undefined
): Omit<T, "deviceId"> | undefined => {
	if (modbus == null) return undefined
	const { deviceId: _legacy, ...rest } = modbus
	return Object.keys(rest).length > 0 ? (rest as Omit<T, "deviceId">) : undefined
}

export const normalizeStatusPoints = (
	points?: Record<string, ModbusStatusPointDef | undefined> | null
): Record<string, ModbusStatusPointDef> | undefined => {
	if (!points) return undefined
	const out: Record<string, ModbusStatusPointDef> = {}
	for (const [key, def] of Object.entries(points)) {
		if (!def) continue
		const deviceId = normalizeOptionalDeviceId(def.deviceId)
		const { deviceId: _drop, ...rest } = def
		out[key] = deviceId ? { ...rest, deviceId } : rest
	}
	return Object.keys(out).length > 0 ? out : undefined
}

export type ControllerFieldsSource = {
	deviceId?: unknown
	modbus?: { deviceId?: unknown } | null
	statusPoints?: Record<string, ModbusStatusPointDef | undefined> | null
	location?: { x: number; y: number }
}

/** 讀寫 API 前正規化控制器地點欄位（deviceId SSOT；modbus 不含 deviceId） */
export const normalizeControllerFields = (source: ControllerFieldsSource) => {
	const fields = {
		deviceId: normalizeOptionalDeviceId(source.deviceId),
		modbus: stripModbusDeviceId(source.modbus),
		statusPoints: normalizeStatusPoints(source.statusPoints),
	}
	return source.location !== undefined ? { ...fields, location: source.location } : fields
}

/** 寫入 API 的 system.config（可選強制帶 `statusPoints: {}`） */
export const controllerConfigForApiWrite = (
	source: ControllerFieldsSource,
	extra?: Record<string, unknown>,
	withEmptyStatusPoints = false
) => {
	const base = normalizeControllerFields(source)
	return {
		...base,
		...(withEmptyStatusPoints ? { statusPoints: base.statusPoints ?? {} } : {}),
		...extra,
	}
}
