/**
 * 人流 API 轉換；進出統計見 utils/peopleCountingTransition.ts
 */

import type { PeopleCountingLog, PeopleCountingPersonnel } from "~/types/peopleCounting";
import { formatDateTime } from "~/utils/dateUtils";

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

/** GET /people-counting/units/:id/personnel 單筆人員列 */
export type UnitPersonnelApiRow = {
	id: number;
	employeeId: string;
	name: string;
	photoUrl?: string;
	isInside?: boolean;
	lastEntryTime: string | null;
	lastExitTime: string | null;
	lastEntryDate: string | null;
	entryTime: string | null;
	exitTime: string | null;
	isTodayEntry?: boolean;
};

/** 單位人員 API → 前端 PeopleCountingPersonnel */
export const mapUnitPersonnelFromApi = (
	person: UnitPersonnelApiRow,
	unitId: number
): PeopleCountingPersonnel => ({
	id: person.id,
	unitId,
	employeeId: person.employeeId,
	name: person.name,
	photoUrl: person.photoUrl || undefined,
	lastEntryTime: person.lastEntryTime ? formatDateTime(person.lastEntryTime) : undefined,
	lastExitTime: person.lastExitTime ? formatDateTime(person.lastExitTime) : undefined,
	lastEntryDate: person.lastEntryDate || undefined,
	entryTime: person.entryTime || undefined,
	exitTime: person.exitTime || undefined,
	isPresent: !!person.isInside,
	isTodayEntry: person.isTodayEntry ?? false
});

export const convertApiLogToFrontend = (
	log: {
		id: string;
		personId: number;
		personName: string;
		unitId: number | null;
		unitName: string;
		employeeId?: string | null;
		eventType: "entry" | "exit" | "failed";
		eventLabel?: string | null;
		verifyMethod?: string | null;
		similarity?: number | null;
		timestamp: string;
		deviceScreenshotUrl: string;
		deviceName?: string;
		count?: number;
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
		eventLabel: log.eventLabel?.trim() || undefined,
		verifyMethod:
			log.verifyMethod != null && String(log.verifyMethod).trim() !== ""
				? String(log.verifyMethod).trim()
				: undefined,
		similarity:
			log.similarity != null && Number.isFinite(Number(log.similarity))
				? Number(log.similarity)
				: undefined,
		count: typeof log.count === "number" && Number.isFinite(log.count) ? log.count : undefined,
		employeeId:
			log.employeeId != null && String(log.employeeId).trim() !== ""
				? String(log.employeeId).trim()
				: undefined,
		personName: log.personName || undefined,
		deviceScreenshotUrl: log.deviceScreenshotUrl || undefined,
		deviceName: log.deviceName ?? undefined,
		unitName: log.unitName || undefined,
		timestamp: formatDateTime(log.timestamp, true)
	};
};
