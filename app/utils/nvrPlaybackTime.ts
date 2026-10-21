/** Asia/Taipei 日期與回放時間軸輔助 */

const DAY_MS = 24 * 60 * 60 * 1000

const taipeiYmdParts = (date: Date) => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Taipei",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date)
	const get = (type: string) => parts.find((p) => p.type === type)?.value || "00"
	return { year: get("year"), month: get("month"), day: get("day") }
}

export const formatTaipeiYmd = (date = new Date()): string => {
	const p = taipeiYmdParts(date)
	return `${p.year}-${p.month}-${p.day}`
}

export const shiftTaipeiYmd = (ymd: string, deltaDays: number): string => {
	const mid = new Date(`${ymd}T12:00:00+08:00`)
	if (!Number.isFinite(mid.getTime())) return ymd
	return formatTaipeiYmd(new Date(mid.getTime() + deltaDays * DAY_MS))
}

export const taipeiDayStartMs = (ymd: string): number => {
	const t = new Date(`${ymd}T00:00:00+08:00`).getTime()
	return Number.isFinite(t) ? t : 0
}

export const taipeiDayEndMs = (ymd: string): number => {
	const t = new Date(`${ymd}T23:59:59.999+08:00`).getTime()
	return Number.isFinite(t) ? t : 0
}

/** NVR 時刻：無時區或 `Z` 視為台北牆鐘；已有偏移則依 ISO 解析 */
export const parseIsoMs = (value?: string | null): number | null => {
	if (!value) return null
	const raw = String(value).trim()
	const m = raw.match(
		/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z)?$/i
	)
	const normalized = m ? `${m[1]}T${m[2]}+08:00` : raw
	const t = new Date(normalized).getTime()
	return Number.isFinite(t) ? t : null
}

export const pad2 = (n: number) => String(n).padStart(2, "0")

export const formatPlayheadClock = (offsetMs: number): string => {
	const clamped = Math.max(0, Math.min(DAY_MS - 1, Math.floor(offsetMs)))
	const totalSec = Math.floor(clamped / 1000)
	const hour = Math.floor(totalSec / 3600)
	const minute = Math.floor((totalSec % 3600) / 60)
	const second = totalSec % 60
	return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
}

/** 軸上刻度：24h→1 小時、12h→30 分、6h→15 分 */
export const playbackTickMs = (zoomHours: 24 | 12 | 6): number => {
	if (zoomHours === 24) return 60 * 60 * 1000
	if (zoomHours === 12) return 30 * 60 * 1000
	return 15 * 60 * 1000
}

export const formatAxisClock = (offsetMs: number): string => {
	const clamped = Math.max(0, Math.min(DAY_MS, Math.floor(offsetMs)))
	const totalMin = Math.floor(clamped / 60000)
	const hour = Math.floor(totalMin / 60) % 24
	const minute = totalMin % 60
	if (minute === 0) return pad2(hour)
	return `${pad2(hour)}:${pad2(minute)}`
}

export const DAY_DURATION_MS = DAY_MS

export const parsePlayheadClock = (
	label: string
): { hour: number; minute: number; second: number } => {
	const m = String(label || "").match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/)
	if (!m) return { hour: 0, minute: 0, second: 0 }
	return {
		hour: Math.min(23, Number(m[1])),
		minute: Math.min(59, Number(m[2])),
		second: Math.min(59, Number(m[3])),
	}
}

export const clockOffsetMs = (hour: number, minute: number, second: number): number => {
	const h = Math.max(0, Math.min(23, Math.floor(hour)))
	const m = Math.max(0, Math.min(59, Math.floor(minute)))
	const s = Math.max(0, Math.min(59, Math.floor(second)))
	return Math.min(DAY_MS - 1, ((h * 60 + m) * 60 + s) * 1000)
}

const formatHikvisionTaipeiCompact = (value: Date | string): string => {
	const date = value instanceof Date ? value : new Date(value)
	if (!Number.isFinite(date.getTime())) return ""
	const p = taipeiYmdParts(date)
	const timeParts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Taipei",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).formatToParts(date)
	const get = (type: string) => timeParts.find((part) => part.type === type)?.value || "00"
	return `${p.year}${p.month}${p.day}T${get("hour")}${get("minute")}${get("second")}Z`
}

export const rewritePlaybackUriTimes = (
	uri: string,
	start: Date | string,
	end: Date | string
): string => {
	const startAt = formatHikvisionTaipeiCompact(start)
	const endAt = formatHikvisionTaipeiCompact(end)
	if (!startAt || !endAt) return uri
	let next = String(uri || "")
	if (/starttime=/i.test(next)) {
		next = next.replace(/starttime=[^&]*/i, `starttime=${startAt}`)
	} else {
		next += (next.includes("?") ? "&" : "?") + `starttime=${startAt}`
	}
	if (/endtime=/i.test(next)) {
		next = next.replace(/endtime=[^&]*/i, `endtime=${endAt}`)
	} else {
		next += `&endtime=${endAt}`
	}
	return next
}

export const daysInTaipeiMonth = (year: number, month: number): number => {
	const nextYear = month === 12 ? year + 1 : year
	const nextMonth = month === 12 ? 1 : month + 1
	const start = new Date(`${year}-${pad2(month)}-01T12:00:00+08:00`).getTime()
	const end = new Date(`${nextYear}-${pad2(nextMonth)}-01T12:00:00+08:00`).getTime()
	return Math.round((end - start) / DAY_MS)
}

export const taipeiWeekdaySun0 = (ymd: string): number => {
	const mid = new Date(`${ymd}T12:00:00+08:00`)
	if (!Number.isFinite(mid.getTime())) return 0
	const weekday = new Intl.DateTimeFormat("en-US", {
		timeZone: "Asia/Taipei",
		weekday: "short",
	}).format(mid)
	const map: Record<string, number> = {
		Sun: 0,
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6,
	}
	return map[weekday] ?? 0
}

export const parseYmdParts = (
	ymd: string
): { year: number; month: number; day: number } | null => {
	const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (!m) return null
	return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}
