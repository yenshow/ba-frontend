/**
 * 人流進出 transition 統計（須與 ba-backend/src/services/entryExit 同步）
 */
import { computeTransitionStats, computeCumulativePresence } from "~/utils/entryExitStats";

export interface PeopleCountingLogLike {
	personnelId?: number | null;
	employeeId?: string | null;
	eventType: string;
	timestamp: string;
	unit?: { name?: string };
	unitName?: string;
}

export const countingPersonKey = (log: PeopleCountingLogLike): string => {
	if (log.personnelId != null) return String(log.personnelId);
	const emp = log.employeeId != null ? String(log.employeeId).trim() : "";
	if (emp !== "") return emp;
	const unit = (log.unit?.name ?? log.unitName ?? "").trim();
	return unit !== "" ? `__anon__:${unit}` : "__anon__";
};

const peopleLogDirection = (log: PeopleCountingLogLike): "entry" | "exit" | null =>
	log.eventType === "entry" ? "entry" : log.eventType === "exit" ? "exit" : null;

export const countEntryExitForDay = (
	dayLogs: PeopleCountingLogLike[]
): { entry: number; exit: number; current: number } => {
	const stats = computeTransitionStats(dayLogs, {
		getKey: countingPersonKey,
		getDirection: peopleLogDirection,
		getTime: log => log.timestamp,
		sortByTime: true
	});
	return {
		entry: stats.entryCount,
		exit: stats.exitCount,
		current: stats.currentCount
	};
};

/** ISAPI 攝影機累計：在場 = max(0, 進 − 出) */
export const cumulativePresenceFromTotals = (entry: number, exit: number) =>
	computeCumulativePresence(entry, exit);

export const getUnitStatsForDay = (
	dayLogs: PeopleCountingLogLike[]
): Array<{ unitName: string; entry: number; exit: number; current: number }> => {
	const byUnit = new Map<string, PeopleCountingLogLike[]>();
	for (const log of dayLogs) {
		const name = log.unit?.name ?? log.unitName ?? "";
		const key = String(name);
		if (!byUnit.has(key)) byUnit.set(key, []);
		byUnit.get(key)!.push(log);
	}
	const result: Array<{ unitName: string; entry: number; exit: number; current: number }> = [];
	for (const [unitKey, logs] of byUnit) {
		const unitName = unitKey.trim();
		if (!unitName) continue;
		const { entry, exit, current } = countEntryExitForDay(logs);
		result.push({ unitName, entry, exit, current });
	}
	return result.sort((a, b) => a.unitName.localeCompare(b.unitName));
};

export const getEntryOnlyPersonsForDay = <T extends PeopleCountingLogLike>(
	dayLogs: T[]
): T[] => {
	const sorted = [...dayLogs].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	);
	const lastByPerson = new Map<string, "entry" | "exit">();
	const lastLogByPerson = new Map<string, T>();
	for (const log of sorted) {
		const dir = peopleLogDirection(log);
		if (dir !== "entry" && dir !== "exit") continue;
		const personKey = countingPersonKey(log);
		if (lastByPerson.get(personKey) === undefined && dir === "exit") continue;
		lastByPerson.set(personKey, dir);
		lastLogByPerson.set(personKey, log);
	}
	return [...lastLogByPerson.entries()]
		.filter(([personKey]) => lastByPerson.get(personKey) === "entry")
		.map(([, log]) => log);
};

