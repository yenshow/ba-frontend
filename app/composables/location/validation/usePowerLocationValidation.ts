/**
 * 電力點位：Modbus 展開與驗證
 * - 發電機：`fault`、`highOil`、`lowOil`
 * - 獨立油位：`running`
 */

import type { PowerLocation } from "~/types/power"
import type { ModbusStatusPointDef } from "~/types/location"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"
import { registerTypeToDiDo } from "~/utils/modbusPoints"

export type PowerModbusTuple = {
	deviceId: number
	type: "DI" | "DO"
	address: number
}

export type PowerGeneratorPointKey = "fault" | "highOil" | "lowOil"

export const powerTupleKey = (t: PowerModbusTuple): string => `${t.deviceId}:${t.type}:${t.address}`

const GEN_KEYS: PowerGeneratorPointKey[] = ["fault", "highOil", "lowOil"]

const tupleFromPointDef = (
	loc: PowerLocation,
	pt: (ModbusStatusPointDef & { deviceId?: number }) | undefined
): PowerModbusTuple | null => {
	if (!pt || typeof pt !== "object") return null
	const id =
		pt.deviceId != null && pt.deviceId > 0
			? pt.deviceId
			: loc.deviceId && loc.deviceId > 0
				? loc.deviceId
				: 0
	if (!id || id <= 0) return null
	const addr = Number(pt.address)
	if (!Number.isFinite(addr) || addr < 0) return null
	return {
		deviceId: id,
		type: registerTypeToDiDo(pt),
		address: addr,
	}
}

export const tuplesFromPowerLocation = (loc: PowerLocation): PowerModbusTuple[] => {
	const out: PowerModbusTuple[] = []
	const sp = loc.statusPoints || {}

	if (loc.equipmentKind === "oil_level") {
		const t = tupleFromPointDef(
			loc,
			sp.running as (ModbusStatusPointDef & { deviceId?: number }) | undefined
		)
		if (t) out.push(t)
		return out
	}

	for (const key of GEN_KEYS) {
		const pt = sp[key] as (ModbusStatusPointDef & { deviceId?: number }) | undefined
		const t = tupleFromPointDef(loc, pt)
		if (t) out.push(t)
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
