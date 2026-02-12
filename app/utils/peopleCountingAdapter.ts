/**
 * 人流統計數據轉換與統計工具
 * - 轉換邏輯與後端一致
 * - 進出場計數與後端 countEntryExitFromSorted 同一規則（同人連續同向只計一次，首筆為出場不計）
 */

import type { PeopleCountingLog } from "~/types/peopleCounting"
import { formatDateTime } from "~/utils/dateUtils"

/**
 * 依時間升序計數進場/出場（與後端 countEntryExitFromSorted 一致）
 */
export function countEntryExitForDay(
	dayLogs: PeopleCountingLog[]
): { entry: number; exit: number } {
	const sorted = [...dayLogs].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	)
	const lastByPerson = new Map<string, "entry" | "exit">()
	let entryCount = 0
	let exitCount = 0
	for (const log of sorted) {
		const dir =
			log.eventType === "entry" ? "entry" : log.eventType === "exit" ? "exit" : null
		if (dir !== "entry" && dir !== "exit") continue
		const personKey = String(log.personnelId ?? log.employeeId ?? log.id ?? "")
		const prev = lastByPerson.get(personKey)
		if (prev === undefined && dir === "exit") continue
		if (prev !== dir) {
			if (dir === "entry") entryCount++
			else exitCount++
			lastByPerson.set(personKey, dir)
		}
	}
	return { entry: entryCount, exit: exitCount }
}

/**
 * 當日依時間升序掃描後，最後一筆為「進場」的人員（進場但未出場），回傳其最後一筆 log 供顯示。
 */
export function getEntryOnlyPersonsForDay(
	dayLogs: PeopleCountingLog[]
): PeopleCountingLog[] {
	const sorted = [...dayLogs].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	)
	const lastByPerson = new Map<string, "entry" | "exit">()
	const lastLogByPerson = new Map<string, PeopleCountingLog>()
	for (const log of sorted) {
		const dir =
			log.eventType === "entry" ? "entry" : log.eventType === "exit" ? "exit" : null
		if (dir !== "entry" && dir !== "exit") continue
		const personKey = String(log.personnelId ?? log.employeeId ?? log.id ?? "")
		const prev = lastByPerson.get(personKey)
		if (prev === undefined && dir === "exit") continue
		if (prev !== dir) {
			lastByPerson.set(personKey, dir)
			lastLogByPerson.set(personKey, log)
		}
	}
	return [...lastLogByPerson.entries()]
		.filter(([personKey]) => lastByPerson.get(personKey) === "entry")
		.map(([, log]) => log)
}

/**
 * 從樓層名稱提取區域資訊
 */
export const extractRegionFromZoneName = (zoneName: string): string | null => {
	const regionKeywords = ["北部", "中部", "南部", "東部"]
	for (const keyword of regionKeywords) {
		if (zoneName.includes(keyword)) {
			return keyword
		}
	}
	return null
}

/**
 * 將後端 API 返回的記錄轉換為前端格式
 * 統一處理字段映射和格式轉換
 */
export const convertApiLogToFrontend = (
	log: {
		id: string
		personId: number
		personName: string
		unitId: number | null
		unitName: string
		eventType: "entry" | "exit" | "failed"
		timestamp: string
		deviceScreenshotUrl: string
		deviceName?: string
	},
	locationId: number
): PeopleCountingLog => {
	const personnelId = log.personId !== -1 ? log.personId : undefined

	return {
		id: log.id,
		locationId,
		unitId: log.unitId || 0,
		personnelId,
		deviceId: 0,
		eventType: log.eventType,
		personName: log.personName || undefined,
		deviceScreenshotUrl: log.deviceScreenshotUrl || undefined,
		deviceName: log.deviceName ?? undefined,
		unitName: log.unitName || undefined,
		timestamp: formatDateTime(log.timestamp, true),
	}
}

