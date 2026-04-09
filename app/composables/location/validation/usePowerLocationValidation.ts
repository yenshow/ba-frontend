/**
 * 電力點位：Modbus 地址展開與驗證（與排水相同之地址範圍規則）
 */

import type { PowerLocation } from "~/types/power"
import type { DrainageStatusPointDef } from "~/types/location"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"

export type PowerModbusTuple = {
	deviceId: number
	type: "DI" | "DO"
	address: number
}

const registerTypeToDiDo = (pt: DrainageStatusPointDef | undefined): "DI" | "DO" => {
	if (!pt) return "DI"
	const rt = String(pt.registerType || "").toLowerCase()
	if (rt === "coil") return "DO"
	return "DI"
}

export const powerTupleKey = (t: PowerModbusTuple): string => `${t.deviceId}:${t.type}:${t.address}`

export const tuplesFromPowerLocation = (loc: PowerLocation): PowerModbusTuple[] => {
	const out: PowerModbusTuple[] = []
	const kind = loc.equipmentKind === "oil_level" ? "oil_level" : "generator"

	if (kind === "oil_level") {
		const pt = loc.statusPoints?.oilLevelAlarm as DrainageStatusPointDef | undefined
		const id = loc.deviceId
		if (!id || id <= 0) return out
		if (!pt || typeof pt !== "object") return out
		const addr = Number(pt.address)
		if (!Number.isFinite(addr) || addr < 0) return out
		out.push({ deviceId: id, type: registerTypeToDiDo(pt), address: addr })
		return out
	}

	const roles = ["fault", "highOil", "lowOil"] as const
	for (const role of roles) {
		const pt = loc.statusPoints?.[role] as (DrainageStatusPointDef & { deviceId?: number }) | undefined
		if (!pt || typeof pt !== "object") continue
		const id =
			pt.deviceId != null && pt.deviceId > 0 ? pt.deviceId : loc.deviceId && loc.deviceId > 0 ? loc.deviceId : 0
		if (!id || id <= 0) continue
		const addr = Number(pt.address)
		if (!Number.isFinite(addr) || addr < 0) continue
		out.push({ deviceId: id, type: registerTypeToDiDo(pt), address: addr })
	}
	return out
}

export function usePowerLocationValidation() {
	const { validateModbusAddress } = useModbusValidation()
	return {
		validateModbusAddress,
		tuplesFromPowerLocation,
		powerTupleKey,
	}
}

