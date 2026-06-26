/**
 * 車輛進出：放行紀錄 transition 統計（須與 ba-backend/src/services/entryExit 同步）
 */
import { computeTransitionStats } from "~/utils/entryExitStats";

export interface VehiclePassageLogLike {
	allow_result?: number | null;
	lane_id?: number | null;
	lane_type?: number | null;
	license_plate?: string | null;
	trigger_time?: string | null;
}

export const normalizePlate = (plate: string | null | undefined): string =>
	plate != null ? String(plate).trim().toUpperCase() : "";

const parseLaneId = (value: number | null | undefined): number | null => {
	const n = Number(value);
	return value != null && Number.isFinite(n) && n > 0 ? n : null;
};

export type VehicleDirectionFn = (log: VehiclePassageLogLike) => "entry" | "exit" | null;

/** ISAPI／無地點設定：依 lane_type */
const vehicleDirectionByLaneType = (log: VehiclePassageLogLike): "entry" | "exit" | null => {
	if (log.allow_result !== 1) return null;
	const lt = log.lane_type;
	if (lt === 1) return "entry";
	if (lt === 2) return "exit";
	return null;
};

/**
 * YSCP：優先 entryLaneId／exitLaneId，與後端 createVehicleDirectionResolver 對齊
 */
export const createVehicleDirectionResolver = (
	entryLaneId?: number | null,
	exitLaneId?: number | null
): VehicleDirectionFn => {
	const entry = parseLaneId(entryLaneId);
	const exit = parseLaneId(exitLaneId);

	return (log: VehiclePassageLogLike): "entry" | "exit" | null => {
		if (log.allow_result !== 1) return null;
		const laneId = parseLaneId(log.lane_id ?? undefined);
		if (laneId != null) {
			if (entry != null && laneId === entry) return "entry";
			if (exit != null && laneId === exit) return "exit";
		}
		return vehicleDirectionByLaneType(log);
	};
};

export const releasedLogs = <T extends VehiclePassageLogLike>(
	logs: T[],
	getDirection: VehicleDirectionFn = vehicleDirectionByLaneType
) => logs.filter(log => getDirection(log) != null);

export const countReleasedPassages = <T extends VehiclePassageLogLike>(
	logs: T[],
	match: (log: T) => boolean,
	getDirection: VehicleDirectionFn = vehicleDirectionByLaneType
): { entryCount: number; exitCount: number; onSiteCount: number } => {
	const stats = computeTransitionStats(logs.filter(match), {
		getKey: log => normalizePlate(log.license_plate),
		getDirection,
		getTime: log => log.trigger_time ?? 0
	});
	return {
		entryCount: stats.entryCount,
		exitCount: stats.exitCount,
		onSiteCount: stats.currentCount
	};
};

/** 完整報表：全體放行紀錄 transition 統計 */
export const countAllReleasedPassages = <T extends VehiclePassageLogLike>(
	logs: T[],
	getDirection: VehicleDirectionFn = vehicleDirectionByLaneType
) => countReleasedPassages(logs, () => true, getDirection);

/** 完整報表用簡寫欄位 */
export const passageTransitionTotals = <T extends VehiclePassageLogLike>(
	logs: T[],
	getDirection: VehicleDirectionFn = vehicleDirectionByLaneType
) => {
	const { entryCount, exitCount, onSiteCount } = countAllReleasedPassages(logs, getDirection);
	return { entry: entryCount, exit: exitCount, current: onSiteCount };
};

/** 在場車輛最後一筆進場 log id（表格凸顯用） */
export const getOnSitePassageLogIds = <T extends VehiclePassageLogLike & { id: number }>(
	logs: T[],
	getDirection: VehicleDirectionFn = vehicleDirectionByLaneType
): Set<number> => {
	const sorted = [...releasedLogs(logs, getDirection)].sort(
		(a, b) => new Date(a.trigger_time ?? 0).getTime() - new Date(b.trigger_time ?? 0).getTime()
	);
	const lastDirByPlate = new Map<string, "entry" | "exit">();
	const lastLogByPlate = new Map<string, T>();
	for (const log of sorted) {
		const plate = normalizePlate(log.license_plate);
		if (!plate) continue;
		const dir = getDirection(log);
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
	validLogs: T[],
	getDirection: VehicleDirectionFn = vehicleDirectionByLaneType
): VehicleGroupMemberFromLogsResult => {
	const plateNorm = normalizePlate(plate);
	const sorted = [...releasedLogs(validLogs, getDirection)]
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
		getDirection,
		getTime: log => log.trigger_time ?? 0,
		sortByTime: false
	});

	const lastEntry = [...sorted].reverse().find(log => getDirection(log) === "entry");
	if (!lastEntry?.trigger_time) {
		return { isPresent: stats.currentCount > 0 };
	}

	const lastEntryT = new Date(lastEntry.trigger_time).getTime();
	const d = new Date(lastEntry.trigger_time);
	const exitAfter = [...sorted]
		.reverse()
		.find(
			log =>
				getDirection(log) === "exit" &&
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
