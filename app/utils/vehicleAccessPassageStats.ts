/**
 * 車輛進出：放行紀錄統計與群組成員進出時間（主畫面／群組面板共用）
 */
import type { VehicleDataLog } from "~/types/vehicleAccess";
import type { VehicleGroupMemberItem } from "~/types/vehicleAccess";
import { normalizePlate } from "~/utils/vehicleAccessUtils";

const TIME_FMT: Intl.DateTimeFormatOptions = {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false
};

/** 統計放行且 lane_type 1/2 的進出次數 */
export const countReleasedPassages = (
	logs: VehicleDataLog[],
	match: (log: VehicleDataLog) => boolean
): { entryCount: number; exitCount: number; onSiteCount: number } => {
	let entryCount = 0;
	let exitCount = 0;
	for (const log of logs) {
		if (log.allow_result !== 1) continue;
		const lt = log.lane_type;
		if (lt !== 1 && lt !== 2) continue;
		if (!match(log)) continue;
		if (lt === 1) entryCount += 1;
		else exitCount += 1;
	}
	return { entryCount, exitCount, onSiteCount: Math.max(0, entryCount - exitCount) };
};

/** 由當日放行紀錄推算單一車牌之進出狀態（群組彈窗名單） */
export const buildGroupMemberFromLogs = (
	plate: string,
	ownerName: string | null,
	personId: number,
	validLogs: VehicleDataLog[]
): VehicleGroupMemberItem => {
	const plateNorm = normalizePlate(plate);
	const plateLogs = validLogs
		.filter(log => normalizePlate(log.license_plate) === plateNorm)
		.map(log => ({ log, t: new Date(log.trigger_time ?? 0).getTime() }))
		.sort((a, b) => b.t - a.t);

	const lastEntry = plateLogs.find(({ log }) => log.lane_type === 1);
	if (!lastEntry) {
		return {
			id: personId,
			plate_license: plate,
			owner_name: ownerName,
			isPresent: false
		};
	}

	const d = new Date(lastEntry.log.trigger_time ?? "");
	const lastEntryDate = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
	const entryTime = lastEntry.log.trigger_time
		? new Date(lastEntry.log.trigger_time).toLocaleTimeString("zh-TW", TIME_FMT)
		: null;
	const exitAfter = plateLogs.find(
		({ log, t }) => log.lane_type === 2 && t > lastEntry.t
	);

	return {
		id: personId,
		plate_license: plate,
		owner_name: ownerName,
		lastEntryDate,
		entryTime: entryTime ?? undefined,
		exitTime: exitAfter?.log.trigger_time
			? new Date(exitAfter.log.trigger_time).toLocaleTimeString("zh-TW", TIME_FMT)
			: undefined,
		isPresent: !exitAfter
	};
};
