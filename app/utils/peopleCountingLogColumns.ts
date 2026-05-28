/**
 * 人流進出紀錄表格欄位（與後端 log_display_columns 一致）
 */

import type { PeopleCountingLog } from "~/types/peopleCounting"
import { formatDateTime } from "~/utils/dateUtils"

export const PEOPLE_COUNTING_LOG_COLUMN_KEYS = [
	"screenshot",
	"unit",
	"device_name",
	"name",
	"verify_method",
	"event",
	"time",
] as const

export type PeopleCountingLogColumnKey = (typeof PEOPLE_COUNTING_LOG_COLUMN_KEYS)[number]

export const PEOPLE_COUNTING_LOG_COLUMN_LABELS: Record<PeopleCountingLogColumnKey, string> = {
	screenshot: "設備截圖",
	unit: "人員群組",
	device_name: "出入口名稱",
	name: "姓名",
	verify_method: "方式",
	event: "事件",
	time: "時間",
}

const REQUIRED_LOG_COLUMN_KEYS: PeopleCountingLogColumnKey[] = ["event", "time"]

/** 地點表單可勾選欄位（事件、時間固定顯示，不提供開關） */
export const TOGGLEABLE_LOG_COLUMN_KEYS = PEOPLE_COUNTING_LOG_COLUMN_KEYS.filter(
	(k) => !REQUIRED_LOG_COLUMN_KEYS.includes(k)
)

export const DEFAULT_LOG_DISPLAY_COLUMNS: PeopleCountingLogColumnKey[] = [
	...PEOPLE_COUNTING_LOG_COLUMN_KEYS,
]

export const normalizeLogDisplayColumns = (
	raw: string[] | undefined | null
): PeopleCountingLogColumnKey[] => {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [...DEFAULT_LOG_DISPLAY_COLUMNS]
	}
	const allowed = new Set<string>(PEOPLE_COUNTING_LOG_COLUMN_KEYS)
	const seen = new Set<string>()
	const picked: PeopleCountingLogColumnKey[] = []
	for (const key of raw) {
		const k = String(key).trim()
		if (!allowed.has(k) || seen.has(k)) continue
		seen.add(k)
		picked.push(k as PeopleCountingLogColumnKey)
	}
	if (picked.length === 0) return [...DEFAULT_LOG_DISPLAY_COLUMNS]
	for (const req of REQUIRED_LOG_COLUMN_KEYS) {
		if (!seen.has(req)) picked.push(req)
	}
	return PEOPLE_COUNTING_LOG_COLUMN_KEYS.filter((k) => picked.includes(k))
}

/** 寫入 API／DB：不含固定的 event、time */
export const toStoredLogDisplayColumns = (
	normalized: PeopleCountingLogColumnKey[]
): PeopleCountingLogColumnKey[] =>
	normalized.filter((k) => !REQUIRED_LOG_COLUMN_KEYS.includes(k))

export const formatLogEventLabel = (log: PeopleCountingLog): string => {
	if (log.eventLabel?.trim()) return log.eventLabel.trim()
	if (log.eventType === "entry") return "進入"
	if (log.eventType === "exit") return "離開"
	return "失敗"
}

export const getLogEventBadgeClass = (log: PeopleCountingLog): string => {
	const label = formatLogEventLabel(log)
	if (label === "飲酒" || label === "醉酒") return "bg-amber-500/40 text-amber-100"
	if (log.eventType === "entry") return "bg-green-500/30 text-green-200"
	if (log.eventType === "exit") return "bg-blue-500/30 text-blue-200"
	return "bg-red-500/70 text-red-200"
}

export const formatLogVerifyMethod = (log: PeopleCountingLog): string => {
	const v = log.verifyMethod?.trim()
	return v || "—"
}

export const formatLogText = (value: string | null | undefined): string => {
	const s = value != null ? String(value).trim() : ""
	return s || "—"
}

export type PeopleCountingLogDetailRow = Record<string, string> & { key: string }

export const buildLogDetailRow = (
	log: PeopleCountingLog,
	columns: PeopleCountingLogColumnKey[]
): PeopleCountingLogDetailRow => {
	const row: PeopleCountingLogDetailRow = { key: `log-${log.id}` }
	for (const col of columns) {
		switch (col) {
			case "screenshot":
				row[PEOPLE_COUNTING_LOG_COLUMN_LABELS.screenshot] = log.deviceScreenshotUrl?.trim()
					? "有"
					: "—"
				break
			case "unit":
				row[PEOPLE_COUNTING_LOG_COLUMN_LABELS.unit] = formatLogText(
					log.unit?.name ?? log.unitName
				)
				break
			case "name":
				row[PEOPLE_COUNTING_LOG_COLUMN_LABELS.name] = formatLogText(log.personName)
				break
			case "device_name":
				row[PEOPLE_COUNTING_LOG_COLUMN_LABELS.device_name] = formatLogText(log.deviceName)
				break
			case "event":
				row[PEOPLE_COUNTING_LOG_COLUMN_LABELS.event] = formatLogEventLabel(log)
				break
			case "verify_method":
				row[PEOPLE_COUNTING_LOG_COLUMN_LABELS.verify_method] = formatLogVerifyMethod(log)
				break
			case "time":
				row[PEOPLE_COUNTING_LOG_COLUMN_LABELS.time] = log.timestamp
					? formatDateTime(log.timestamp, true)
					: "—"
				break
			default:
				break
		}
	}
	return row
}
