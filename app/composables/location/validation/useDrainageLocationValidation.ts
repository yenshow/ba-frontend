/**
 * 衛生排水／消防共用：Modbus 地址展開與驗證
 * - 幫浦：`statusPoints.running`
 * - 液位：`coverAlarm`、`highLevel`、`lowLevel`
 */

import type { DrainageLocation } from "~/types/drainage"
import type { ModbusStatusPointDef } from "~/types/location"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"
import { registerTypeToDiDo } from "~/utils/modbusPoints"

export type DrainageModbusTuple = {
	deviceId: number
	type: "DI" | "DO"
	address: number
}

export type DrainageTankPointKey = "coverAlarm" | "highLevel" | "lowLevel"

export const drainageTupleKey = (t: DrainageModbusTuple): string =>
	`${t.deviceId}:${t.type}:${t.address}`

const TANK_KEYS: DrainageTankPointKey[] = ["coverAlarm", "highLevel", "lowLevel"]

const tupleFromPointDef = (
	loc: DrainageLocation,
	pt: (ModbusStatusPointDef & { deviceId?: number }) | undefined
): DrainageModbusTuple | null => {
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

export const tuplesFromDrainageLocation = (loc: DrainageLocation): DrainageModbusTuple[] => {
	const out: DrainageModbusTuple[] = []
	const sp = loc.statusPoints || {}

	if (loc.equipmentKind === "tank") {
		for (const key of TANK_KEYS) {
			const pt = sp[key] as (ModbusStatusPointDef & { deviceId?: number }) | undefined
			const t = tupleFromPointDef(loc, pt)
			if (t) out.push(t)
		}
		return out
	}

	const t = tupleFromPointDef(
		loc,
		sp.running as (ModbusStatusPointDef & { deviceId?: number }) | undefined
	)
	if (t) out.push(t)
	return out
}

export function useDrainageLocationValidation() {
	const { validateModbusAddress } = useModbusValidation()

	return {
		validateModbusAddress,
		tuplesFromDrainageLocation,
		drainageTupleKey,
	}
}
