/**
 * 轉存排程預覽（Asia/Taipei，與後端 exportSchedule.js 對齊）
 */
import {
	formatExportScheduleLabel,
	normalizeDailyPushTime,
	normalizeScheduleDay,
	normalizeScheduleFreq,
	type ScheduleFreq,
} from "~/utils/externalIntegration"

export type ExportSchedulePreviewInput = {
	scheduleFreq?: unknown
	scheduleDay?: unknown
	exportTime?: unknown
	now?: Date
}

type TaipeiYmd = { y: number; m: number; d: number; hour: number; minute: number; second: number }

const pad2 = (n: number) => String(n).padStart(2, "0")

const readTaipeiParts = (date: Date): TaipeiYmd => {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "Asia/Taipei",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date)
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((p) => p.type === type)?.value ?? 0)
	return {
		y: get("year"),
		m: get("month"),
		d: get("day"),
		hour: get("hour"),
		minute: get("minute"),
		second: get("second"),
	}
}

const isoWeekdayFromYmd = (y: number, m: number, d: number): number => {
	const utc = Date.parse(`${y}-${pad2(m)}-${pad2(d)}T12:00:00+08:00`)
	const name = new Intl.DateTimeFormat("en-US", {
		timeZone: "Asia/Taipei",
		weekday: "short",
	}).format(new Date(utc))
	const map: Record<string, number> = {
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6,
		Sun: 7,
	}
	return map[name] ?? 1
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

const clampYmdDay = (y: number, m: number, dayOfMonth: number) => {
	const dim = daysInMonth(y, m)
	return { y, m, d: Math.min(Math.max(1, dayOfMonth), dim) }
}

const addMonthsYmd = (y: number, m: number, d: number, delta: number) => {
	const idx = y * 12 + (m - 1) + delta
	const ny = Math.floor(idx / 12)
	const nm = (idx % 12) + 1
	return clampYmdDay(ny, nm, d)
}

const addDaysYmd = (y: number, m: number, d: number, delta: number) => {
	const t = Date.parse(`${y}-${pad2(m)}-${pad2(d)}T12:00:00+08:00`) + delta * 86400000
	const p = readTaipeiParts(new Date(t))
	return { y: p.y, m: p.m, d: p.d }
}

const ymdToTaipeiMidnightMs = (y: number, m: number, d: number) =>
	Date.parse(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+08:00`)

const ymdHmToTaipeiMs = (y: number, m: number, d: number, hour: number, minute: number) =>
	Date.parse(`${y}-${pad2(m)}-${pad2(d)}T${pad2(hour)}:${pad2(minute)}:00+08:00`)

const parseHHmmParts = (timeHHmm: string) => {
	const [hh, mm] = String(timeHHmm || "00:00")
		.trim()
		.split(":")
		.map((v) => Number(v))
	return {
		hour: Number.isFinite(hh) ? hh : 0,
		minute: Number.isFinite(mm) ? mm : 0,
	}
}

const currentAnchorYmd = (
	today: { y: number; m: number; d: number },
	freq: ScheduleFreq,
	scheduleDay: number,
) => {
	if (freq === "daily") return today
	if (freq === "weekly") {
		const wd = isoWeekdayFromYmd(today.y, today.m, today.d)
		const delta = wd >= scheduleDay ? wd - scheduleDay : wd - scheduleDay + 7
		return addDaysYmd(today.y, today.m, today.d, -delta)
	}
	const thisMonth = clampYmdDay(today.y, today.m, scheduleDay)
	const todayMs = ymdToTaipeiMidnightMs(today.y, today.m, today.d)
	const thisMs = ymdToTaipeiMidnightMs(thisMonth.y, thisMonth.m, thisMonth.d)
	if (todayMs >= thisMs) return thisMonth
	return addMonthsYmd(today.y, today.m, scheduleDay, -1)
}

const previousAnchorYmd = (
	curr: { y: number; m: number; d: number },
	freq: ScheduleFreq,
	scheduleDay: number,
) => {
	if (freq === "daily") return addDaysYmd(curr.y, curr.m, curr.d, -1)
	if (freq === "weekly") return addDaysYmd(curr.y, curr.m, curr.d, -7)
	return addMonthsYmd(curr.y, curr.m, scheduleDay, -1)
}

const formatTaipeiDateTime = (date: Date, withTime: boolean) => {
	const p = readTaipeiParts(date)
	const datePart = `${p.y}-${pad2(p.m)}-${pad2(p.d)}`
	if (!withTime) return `${datePart} 00:00`
	return `${datePart} ${pad2(p.hour)}:${pad2(p.minute)}`
}

export const computeExportNextRunAt = (input: ExportSchedulePreviewInput): Date => {
	const freq = normalizeScheduleFreq(input.scheduleFreq)
	const day = normalizeScheduleDay(freq, input.scheduleDay)
	const time = normalizeDailyPushTime(String(input.exportTime ?? "00:00")) || "00:00"
	const { hour, minute } = parseHHmmParts(time)
	const now = input.now ?? new Date()
	const p = readTaipeiParts(now)
	const today = { y: p.y, m: p.m, d: p.d }
	const nowMs = now.getTime()
	const bufferMs = 1000

	if (freq === "daily") {
		let next = ymdHmToTaipeiMs(today.y, today.m, today.d, hour, minute)
		if (next <= nowMs + bufferMs) {
			const t = addDaysYmd(today.y, today.m, today.d, 1)
			next = ymdHmToTaipeiMs(t.y, t.m, t.d, hour, minute)
		}
		return new Date(next)
	}

	if (freq === "weekly") {
		const target = day ?? 5
		const wd = isoWeekdayFromYmd(today.y, today.m, today.d)
		const delta = (target - wd + 7) % 7
		const candDay = addDaysYmd(today.y, today.m, today.d, delta)
		let next = ymdHmToTaipeiMs(candDay.y, candDay.m, candDay.d, hour, minute)
		if (next <= nowMs + bufferMs) {
			const t = addDaysYmd(candDay.y, candDay.m, candDay.d, 7)
			next = ymdHmToTaipeiMs(t.y, t.m, t.d, hour, minute)
		}
		return new Date(next)
	}

	const targetDay = day ?? 1
	const thisMonth = clampYmdDay(today.y, today.m, targetDay)
	let next = ymdHmToTaipeiMs(thisMonth.y, thisMonth.m, thisMonth.d, hour, minute)
	if (next <= nowMs + bufferMs) {
		const t = addMonthsYmd(today.y, today.m, targetDay, 1)
		next = ymdHmToTaipeiMs(t.y, t.m, t.d, hour, minute)
	}
	return new Date(next)
}

export const resolveExportDataWindow = (
	input: ExportSchedulePreviewInput,
): { start: Date; end: Date } => {
	const freq = normalizeScheduleFreq(input.scheduleFreq)
	const day = normalizeScheduleDay(freq, input.scheduleDay) ?? 1
	const now = input.now ?? new Date()
	const p = readTaipeiParts(now)
	const today = { y: p.y, m: p.m, d: p.d }
	const curr = currentAnchorYmd(today, freq, day)
	const prev = previousAnchorYmd(curr, freq, day)
	return {
		start: new Date(ymdToTaipeiMidnightMs(prev.y, prev.m, prev.d)),
		end: new Date(ymdToTaipeiMidnightMs(curr.y, curr.m, curr.d)),
	}
}

export const formatExportNextRunLabel = (input: ExportSchedulePreviewInput): string =>
	formatTaipeiDateTime(computeExportNextRunAt(input), true)

export const formatExportWindowLabel = (input: ExportSchedulePreviewInput): string => {
	const { start, end } = resolveExportDataWindow(input)
	return `${formatTaipeiDateTime(start, false)} ～ ${formatTaipeiDateTime(end, false)}`
}

/** 列表／表單共用：排程文案＋下次執行＋資料區間 */
export const formatExportSchedulePreview = (input: ExportSchedulePreviewInput) => ({
	schedule: formatExportScheduleLabel(input.scheduleFreq, input.scheduleDay, input.exportTime),
	nextRun: formatExportNextRunLabel(input),
	window: formatExportWindowLabel(input),
})
