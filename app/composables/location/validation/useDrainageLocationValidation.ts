/**
 * 衛生排水點位：Modbus 地址展開與驗證（與照明相同之地址範圍規則）
 */

import type { DrainageLocation } from "~/types/drainage";
import type { DrainageStatusPointDef } from "~/types/location";
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation";

export type DrainageModbusTuple = {
	deviceId: number;
	type: "DI" | "DO";
	address: number;
};

const registerTypeToDiDo = (pt: DrainageStatusPointDef | undefined): "DI" | "DO" => {
	if (!pt) return "DI";
	const rt = String(pt.registerType || "").toLowerCase();
	if (rt === "coil") return "DO";
	return "DI";
};

export const drainageTupleKey = (t: DrainageModbusTuple): string =>
	`${t.deviceId}:${t.type}:${t.address}`;

/**
 * 將單一排水地點展開為 Modbus 實體點列表（用於同區內重複地址檢查）
 */
export const tuplesFromDrainageLocation = (loc: DrainageLocation): DrainageModbusTuple[] => {
	const out: DrainageModbusTuple[] = [];
	const kind = loc.equipmentKind === "tank" ? "tank" : "pump";

	if (kind === "pump") {
		const deviceId = loc.deviceId;
		if (!deviceId || deviceId <= 0) return out;
		const sp = loc.statusPoints || {};
		const pt = (sp.running || sp.fault) as DrainageStatusPointDef | undefined;
		if (!pt || typeof pt !== "object") return out;
		const addr = Number(pt.address);
		if (!Number.isFinite(addr) || addr < 0) return out;
		out.push({
			deviceId,
			type: registerTypeToDiDo(pt),
			address: addr
		});
		return out;
	}

	const roles = ["highLevel", "lowLevel", "coverAlarm"] as const;
	for (const role of roles) {
		const pt = loc.statusPoints?.[role] as (DrainageStatusPointDef & { deviceId?: number }) | undefined;
		if (!pt || typeof pt !== "object") continue;
		const id =
			pt.deviceId != null && pt.deviceId > 0 ? pt.deviceId : loc.deviceId && loc.deviceId > 0
				? loc.deviceId
				: 0;
		if (!id || id <= 0) continue;
		const addr = Number(pt.address);
		if (!Number.isFinite(addr) || addr < 0) continue;
		out.push({
			deviceId: id,
			type: registerTypeToDiDo(pt),
			address: addr
		});
	}
	return out;
};

export function useDrainageLocationValidation() {
	const { validateModbusAddress } = useModbusValidation();

	return {
		validateModbusAddress,
		tuplesFromDrainageLocation,
		drainageTupleKey
	};
}

