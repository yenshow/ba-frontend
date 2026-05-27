/**
 * 車輛進出：放行紀錄 transition 統計（須與 ba-backend/src/services/entryExit 同步）
 */
import { computeTransitionStats } from "~/utils/entryExitStats";

export interface VehiclePassageLogLike {
	allow_result?: number | null;
	lane_type?: number | null;
	license_plate?: string | null;
	trigger_time?: string | null;
}

export const normalizePlate = (plate: string | null | undefined): string =>
	plate != null ? String(plate).trim().toUpperCase() : "";

const vehicleDirection = (log: VehiclePassageLogLike): "entry" | "exit" | null => {
	if (log.allow_result !== 1) return null;
	const lt = log.lane_type;
	if (lt === 1) return "entry";
	if (lt === 2) return "exit";
	return null;
};

export const releasedLogs = <T extends VehiclePassageLogLike>(logs: T[]) =>
	logs.filter(log => vehicleDirection(log) != null);

export const countReleasedPassages = <T extends VehiclePassageLogLike>(
	logs: T[],
	match: (log: T) => boolean
): { entryCount: number; exitCount: number; onSiteCount: number } => {
	const stats = computeTransitionStats(releasedLogs(logs).filter(match), {
		getKey: log => normalizePlate(log.license_plate),
		getDirection: vehicleDirection,
		getTime: log => log.trigger_time ?? 0
	});
	return {
		entryCount: stats.entryCount,
		exitCount: stats.exitCount,
		onSiteCount: stats.currentCount
	};
};

/** 完整報表：全體放行紀錄 transition 統計 */
export const countAllReleasedPassages = <T extends VehiclePassageLogLike>(logs: T[]) =>
	countReleasedPassages(logs, () => true);

/** 完整報表用簡寫欄位 */
export const passageTransitionTotals = <T extends VehiclePassageLogLike>(logs: T[]) => {
	const { entryCount, exitCount, onSiteCount } = countAllReleasedPassages(logs);
	return { entry: entryCount, exit: exitCount, current: onSiteCount };
};

/** 在場車輛最後一筆進場 log id（表格凸顯用） */
export const getOnSitePassageLogIds = <T extends VehiclePassageLogLike & { id: number }>(
	logs: T[]
): Set<number> => {
	const sorted = [...releasedLogs(logs)].sort(
		(a, b) => new Date(a.trigger_time ?? 0).getTime() - new Date(b.trigger_time ?? 0).getTime()
	);
	const lastDirByPlate = new Map<string, "entry" | "exit">();
	const lastLogByPlate = new Map<string, T>();
	for (const log of sorted) {
		const plate = normalizePlate(log.license_plate);
		if (!plate) continue;
		const dir = vehicleDirection(log);
		if (!dir) continue;
		if (lastDirByPlate.get(plate) === undefined && dir === "exit") continue;
		lastDirByPlate.set(plate, dir);
		lastLogByPlate.set(plate, log);
	}
	const ids = new Set<number>();
	for (const [plate, dir] of lastDirByPlate) {
		if (dir === "entry") {
			const last = lastLogByPlate.get(plate);
			if (last) ids.add(last.id);
		}
	}
	return ids;
};

const TIME_FMT: Intl.DateTimeFormatOptions = {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false
};

export interface VehicleGroupMemberFromLogsResult {
	lastEntryDate?: string;
	entryTime?: string;
	exitTime?: string;
	isPresent: boolean;
}

export const buildGroupMemberPresenceFromLogs = <T extends VehiclePassageLogLike>(
	plate: string,
	validLogs: T[]
): VehicleGroupMemberFromLogsResult => {
	const plateNorm = normalizePlate(plate);
	const sorted = [...releasedLogs(validLogs)]
		.filter(log => normalizePlate(log.license_plate) === plateNorm)
		.sort(
			(a, b) =>
				new Date(a.trigger_time ?? 0).getTime() - new Date(b.trigger_time ?? 0).getTime()
		);

	if (sorted.length === 0) {
		return { isPresent: false };
	}

	const stats = computeTransitionStats(sorted, {
		getKey: () => plateNorm,
		getDirection: vehicleDirection,
		getTime: log => log.trigger_time ?? 0,
		sortByTime: false
	});

	const lastEntry = [...sorted].reverse().find(log => log.lane_type === 1);
	if (!lastEntry?.trigger_time) {
		return { isPresent: stats.currentCount > 0 };
	}

	const lastEntryT = new Date(lastEntry.trigger_time).getTime();
	const d = new Date(lastEntry.trigger_time);
	const exitAfter = [...sorted]
		.reverse()
		.find(
			log =>
				log.lane_type === 2 &&
				new Date(log.trigger_time ?? 0).getTime() > lastEntryT
		);

	return {
		lastEntryDate: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`,
		entryTime: new Date(lastEntry.trigger_time).toLocaleTimeString("zh-TW", TIME_FMT),
		exitTime: exitAfter?.trigger_time
			? new Date(exitAfter.trigger_time).toLocaleTimeString("zh-TW", TIME_FMT)
			: undefined,
		isPresent: stats.currentCount > 0
	};
};

