/**
 * 完整報表考勤彙整：每人每日每地點 → 最早進入／最晚離開
 * （與外部對接 daily_first_last「任意事件 min／max」不同）
 */
import {
	countingPersonKey,
	type PeopleCountingLogLike,
} from "~/utils/peopleCountingTransition"

export const ATTENDANCE_EXPORT_HEADERS = [
	"日期",
	"區域-地點",
	"群組",
	"工號",
	"姓名",
	"最早進入時間",
	"最晚離開時間",
	"最早出入口",
	"最晚出入口",
] as const

export type AttendanceExportHeader = (typeof ATTENDANCE_EXPORT_HEADERS)[number]

export type AttendanceLogLike = PeopleCountingLogLike & {
	locationId: number
	personName?: string | null
	deviceName?: string | null
	personnel?: { name?: string | null } | null
}

const isAnonPersonKey = (key: string): boolean => key.startsWith("__anon__")

const logDirection = (log: AttendanceLogLike): "entry" | "exit" | null =>
	log.eventType === "entry" ? "entry" : log.eventType === "exit" ? "exit" : null

const dateKeyFromTimestamp = (timestamp: string): string => {
	const s = String(timestamp || "").trim()
	if (!s) return ""
	const i = s.indexOf(" ")
	if (i !== -1) return s.slice(0, i)
	const t = new Date(s).getTime()
	if (!Number.isFinite(t)) return ""
	const d = new Date(t)
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	return `${y}/${m}/${day}`
}

const sortByTime = (a: AttendanceLogLike, b: AttendanceLogLike): number => {
	const ta = new Date(a.timestamp).getTime()
	const tb = new Date(b.timestamp).getTime()
	const na = Number.isFinite(ta) ? ta : 0
	const nb = Number.isFinite(tb) ? tb : 0
	if (na !== nb) return na - nb
	return String(a.timestamp).localeCompare(String(b.timestamp))
}

const personDisplayName = (log: AttendanceLogLike): string => {
	const fromLog = log.personName != null ? String(log.personName).trim() : ""
	if (fromLog) return fromLog
	const fromPersonnel =
		log.personnel?.name != null ? String(log.personnel.name).trim() : ""
	return fromPersonnel
}

const groupName = (log: AttendanceLogLike): string =>
	String(log.unit?.name ?? log.unitName ?? "").trim()

type Acc = {
	date: string
	locationId: number
	employeeId: string
	personName: string
	group: string
	firstEntry: AttendanceLogLike | null
	lastExit: AttendanceLogLike | null
}

/**
 * 依日期 + 地點 + 人員彙整考勤列；略過匿名／failed。
 */
export const buildDailyAttendanceRows = (
	logs: AttendanceLogLike[],
	getLocationLabel: (locationId: number) => string,
): Array<Record<AttendanceExportHeader, string>> => {
	const groups = new Map<string, Acc>()

	for (const log of logs || []) {
		const dir = logDirection(log)
		if (!dir) continue
		const personKey = countingPersonKey(log)
		if (isAnonPersonKey(personKey)) continue
		const date = dateKeyFromTimestamp(log.timestamp)
		if (!date) continue
		const locationId = Number(log.locationId)
		if (!Number.isFinite(locationId)) continue

		const key = `${date}\0${locationId}\0${personKey}`
		let acc = groups.get(key)
		if (!acc) {
			acc = {
				date,
				locationId,
				employeeId: log.employeeId != null ? String(log.employeeId).trim() : "",
				personName: personDisplayName(log),
				group: groupName(log),
				firstEntry: null,
				lastExit: null,
			}
			groups.set(key, acc)
		} else {
			if (!acc.employeeId && log.employeeId != null) {
				acc.employeeId = String(log.employeeId).trim()
			}
			if (!acc.personName) acc.personName = personDisplayName(log)
			if (!acc.group) acc.group = groupName(log)
		}

		if (dir === "entry") {
			if (!acc.firstEntry || sortByTime(log, acc.firstEntry) < 0) {
				acc.firstEntry = log
			}
		} else if (!acc.lastExit || sortByTime(log, acc.lastExit) > 0) {
			acc.lastExit = log
		}
	}

	const rows = [...groups.values()].map((acc) => {
		const entry = acc.firstEntry
		const exit = acc.lastExit
		return {
			日期: acc.date,
			"區域-地點": getLocationLabel(acc.locationId) || String(acc.locationId),
			群組: acc.group,
			工號: acc.employeeId,
			姓名: acc.personName,
			最早進入時間: entry?.timestamp ? String(entry.timestamp) : "",
			最晚離開時間: exit?.timestamp ? String(exit.timestamp) : "",
			最早出入口: entry?.deviceName != null ? String(entry.deviceName).trim() : "",
			最晚出入口: exit?.deviceName != null ? String(exit.deviceName).trim() : "",
		} satisfies Record<AttendanceExportHeader, string>
	})

	rows.sort((a, b) => {
		const d = a.日期.localeCompare(b.日期)
		if (d !== 0) return d
		const loc = a["區域-地點"].localeCompare(b["區域-地點"])
		if (loc !== 0) return loc
		const emp = a.工號.localeCompare(b.工號)
		if (emp !== 0) return emp
		return a.姓名.localeCompare(b.姓名)
	})

	return rows
}
