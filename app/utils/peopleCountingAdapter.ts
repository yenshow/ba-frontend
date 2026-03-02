/**
 * 人流統計數據轉換與統計工具
 * - 轉換邏輯與後端一致
 * - 進出場計數與後端 countEntryExitFromSorted 同一規則（同人連續同向只計一次，首筆為出場不計）
 */

import type { PeopleCountingLog } from "~/types/peopleCounting";
import { formatDateTime } from "~/utils/dateUtils";

/**
 * 依時間升序計數進場/出場（與後端 countEntryExitFromSorted 一致）
 */
export function countEntryExitForDay(
	dayLogs: PeopleCountingLog[]
): { entry: number; exit: number } {
	const sorted = [...dayLogs].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	);
	const lastByPerson = new Map<string, "entry" | "exit">();
	let entryCount = 0;
	let exitCount = 0;
	for (const log of sorted) {
		const dir =
			log.eventType === "entry" ? "entry" : log.eventType === "exit" ? "exit" : null;
		if (dir !== "entry" && dir !== "exit") continue;
		const personKey = String(log.personnelId ?? log.employeeId ?? log.id ?? "");
		const prev = lastByPerson.get(personKey);
		if (prev === undefined && dir === "exit") continue;
		if (prev !== dir) {
			if (dir === "entry") entryCount++;
			else exitCount++;
			lastByPerson.set(personKey, dir);
		}
	}
	return { entry: entryCount, exit: exitCount };
}

/**
 * 當日依「單位」分組後，每組依時間升序計數進場/出場，回傳各單位進場、出場、在場人數（在場 = 進場 - 出場）
 */
export function getUnitStatsForDay(
	dayLogs: PeopleCountingLog[]
): Array<{ unitName: string; entry: number; exit: number; current: number }> {
	const byUnit = new Map<string, PeopleCountingLog[]>();
	for (const log of dayLogs) {
		const name = log.unit?.name ?? log.unitName ?? "";
		const key = String(name);
		if (!byUnit.has(key)) byUnit.set(key, []);
		byUnit.get(key)!.push(log);
	}
	const result: Array<{ unitName: string; entry: number; exit: number; current: number }> = [];
	for (const [unitName, logs] of byUnit) {
		const { entry, exit } = countEntryExitForDay(logs);
		result.push({
			unitName: unitName || "(未指定單位)",
			entry,
			exit,
			current: Math.max(0, entry - exit),
		});
	}
	return result.sort((a, b) => a.unitName.localeCompare(b.unitName));
}

/**
 * 當日依時間升序掃描後，最後一筆為「進場」的人員（進場但未出場），回傳其最後一筆 log 供顯示。
 */
export function getEntryOnlyPersonsForDay(
	dayLogs: PeopleCountingLog[]
): PeopleCountingLog[] {
	const sorted = [...dayLogs].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	);
	const lastByPerson = new Map<string, "entry" | "exit">();
	const lastLogByPerson = new Map<string, PeopleCountingLog>();
	for (const log of sorted) {
		const dir =
			log.eventType === "entry" ? "entry" : log.eventType === "exit" ? "exit" : null;
		if (dir !== "entry" && dir !== "exit") continue;
		const personKey = String(log.personnelId ?? log.employeeId ?? log.id ?? "");
		const prev = lastByPerson.get(personKey);
		if (prev === undefined && dir === "exit") continue;
		if (prev !== dir) {
			lastByPerson.set(personKey, dir);
			lastLogByPerson.set(personKey, log);
		}
	}
	return [...lastLogByPerson.entries()]
		.filter(([personKey]) => lastByPerson.get(personKey) === "entry")
		.map(([, log]) => log);
}

/**
 * 從樓層名稱提取區域資訊
 */
export const extractRegionFromZoneName = (zoneName: string): string | null => {
	const regionKeywords = ["北部", "中部", "南部", "東部"];
	for (const keyword of regionKeywords) {
		if (zoneName.includes(keyword)) {
			return keyword;
		}
	}
	return null;
};

/**
 * 將後端 API 返回的記錄轉換為前端格式（YSCP / access_control 同一結構）
 */
export const convertApiLogToFrontend = (
	log: {
		id: string;
		personId: number;
		personName: string;
		unitId: number | null;
		unitName: string;
		employeeId?: string | null;
		eventType: "entry" | "exit" | "failed";
		timestamp: string;
		deviceScreenshotUrl: string;
		deviceName?: string;
	},
	locationId: number
): PeopleCountingLog => {
	const personnelId = log.personId !== -1 ? log.personId : undefined;
	return {
		id: log.id,
		locationId,
		unitId: log.unitId || 0,
		personnelId,
		deviceId: 0,
		eventType: log.eventType,
		employeeId: log.employeeId != null && String(log.employeeId).trim() !== "" ? String(log.employeeId).trim() : undefined,
		personName: log.personName || undefined,
		deviceScreenshotUrl: log.deviceScreenshotUrl || undefined,
		deviceName: log.deviceName ?? undefined,
		unitName: log.unitName || undefined,
		timestamp: formatDateTime(log.timestamp, true),
	};
};
