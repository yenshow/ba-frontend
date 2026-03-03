/**
 * 車輛進出共用工具（車牌正規化、進場未出場標記）
 */

import type { VehicleDataLog } from "~/types/vehicleAccess";

/** 車牌正規化（比對用：去空白、統一大小寫） */
export const normalizePlate = (plate: string | null | undefined): string =>
	plate != null ? String(plate).trim().toUpperCase() : "";

/**
 * 依過車記錄計算「進場未出場」的 log id 集合（每車最後一筆若為進場則納入；用於表格背景凸顯）
 */
export const getEntryOnlyLogIds = (logs: VehicleDataLog[]): Set<number> => {
	const validLogs = logs.filter(
		l => l.allow_result === 1 && (l.lane_type === 1 || l.lane_type === 2)
	);
	const byPlate = new Map<string, VehicleDataLog[]>();
	for (const log of validLogs) {
		const plate = normalizePlate(log.license_plate);
		if (!plate) continue;
		if (!byPlate.has(plate)) byPlate.set(plate, []);
		byPlate.get(plate)!.push(log);
	}
	const ids = new Set<number>();
	for (const [, logList] of byPlate) {
		const sorted = [...logList].sort(
			(a, b) =>
				new Date(b.trigger_time ?? 0).getTime() - new Date(a.trigger_time ?? 0).getTime()
		);
		const last = sorted[0];
		if (last?.lane_type === 1) ids.add(last.id);
	}
	return ids;
};
