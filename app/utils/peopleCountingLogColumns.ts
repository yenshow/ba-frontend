/**
 * 人流進出紀錄表格欄位（與後端 log_display_columns 一致）
 */

import type { PeopleCountingLog } from "~/types/peopleCounting"
import { formatDateTime } from "~/utils/dateUtils"
import { isFaceRecognitionCameraMode } from "~/utils/peopleCountingCameraMode"

export const PEOPLE_COUNTING_LOG_COLUMN_KEYS = [
	"screenshot",
	"unit",
	"device_name",
	"name",
	"verify_method",
	"similarity",
	"event",
	"time",
] as const

export type PeopleCountingLogColumnKey = (typeof PEOPLE_COUNTING_LOG_COLUMN_KEYS)[number]

/** UI 表格欄位（unit 在畫面上為 unit_group） */
export const PEOPLE_COUNTING_RECORD_COLUMN_KEYS = [
	"screenshot",
	"unit_group",
	"name",
	"device_name",
	"verify_method",
	"similarity",
	"event",
	"time",
] as const

export type PeopleCountingRecordColumnKey =
	(typeof PEOPLE_COUNTING_RECORD_COLUMN_KEYS)[number]

const LOG_COLUMN_TO_RECORD_KEY: Record<
	PeopleCountingLogColumnKey,
	PeopleCountingRecordColumnKey
> = {
	screenshot: "screenshot",
	unit: "unit_group",
	device_name: "device_name",
	name: "name",
	verify_method: "verify_method",
	similarity: "similarity",
	event: "event",
	time: "time",
}

export const PEOPLE_COUNTING_LOG_COLUMN_LABELS: Record<PeopleCountingLogColumnKey, string> = {
	screenshot: "設備截圖",
	unit: "人員群組",
	device_name: "出入口名稱",
	name: "姓名",
	verify_method: "方式",
	similarity: "準確度",
	event: "事件",
	time: "時間",
}

const REQUIRED_LOG_COLUMN_KEYS: PeopleCountingLogColumnKey[] = ["event", "time"]

/** 非人臉模式預設不顯示準確度 */
export const DEFAULT_LOG_COLUMNS_WITHOUT_SIMILARITY = PEOPLE_COUNTING_LOG_COLUMN_KEYS.filter(
	(k): k is PeopleCountingLogColumnKey => k !== "similarity"
)

/** 地點表單可勾選欄位（事件、時間固定顯示，不提供開關） */
export const TOGGLEABLE_LOG_COLUMN_KEYS = PEOPLE_COUNTING_LOG_COLUMN_KEYS.filter(
	(k) => !REQUIRED_LOG_COLUMN_KEYS.includes(k)
)

export const DEFAULT_LOG_DISPLAY_COLUMNS: PeopleCountingLogColumnKey[] = [
	...PEOPLE_COUNTING_LOG_COLUMN_KEYS,
]

export const mapLogColumnsToRecordColumns = (
	columns: PeopleCountingLogColumnKey[]
): PeopleCountingRecordColumnKey[] => columns.map((k) => LOG_COLUMN_TO_RECORD_KEY[k])

/** 由 log 欄位設定衍生 UI 表格預設欄位 */
export const DEFAULT_RECORD_COLUMNS = mapLogColumnsToRecordColumns([
	...DEFAULT_LOG_DISPLAY_COLUMNS,
])

export const DEFAULT_RECORD_COLUMNS_WITHOUT_SIMILARITY = mapLogColumnsToRecordColumns([
	...DEFAULT_LOG_COLUMNS_WITHOUT_SIMILARITY,
])

export const buildRecordColumnLabels = (
	unitAsRegion: boolean
): Record<PeopleCountingRecordColumnKey, string> => ({
	screenshot: PEOPLE_COUNTING_LOG_COLUMN_LABELS.screenshot,
	unit_group: unitAsRegion ? "分區" : PEOPLE_COUNTING_LOG_COLUMN_LABELS.unit,
	name: PEOPLE_COUNTING_LOG_COLUMN_LABELS.name,
	device_name: PEOPLE_COUNTING_LOG_COLUMN_LABELS.device_name,
	verify_method: PEOPLE_COUNTING_LOG_COLUMN_LABELS.verify_method,
	similarity: PEOPLE_COUNTING_LOG_COLUMN_LABELS.similarity,
	event: PEOPLE_COUNTING_LOG_COLUMN_LABELS.event,
	time: PEOPLE_COUNTING_LOG_COLUMN_LABELS.time,
})

export const resolvePeopleCountingRecordColumns = (options: {
	displayColumns?: PeopleCountingLogColumnKey[] | string[] | null
	dataSource?: "yscp" | "access_control" | "isapi_camera"
	cameraMode?: string | null
}): PeopleCountingRecordColumnKey[] => {
	const isFace =
		options.dataSource === "isapi_camera" &&
		isFaceRecognitionCameraMode(options.cameraMode)
	const isCameraRegion = options.dataSource === "isapi_camera" && !isFace
	const hasCustomDisplay =
		Array.isArray(options.displayColumns) && options.displayColumns.length > 0

	if ((isFace || isCameraRegion) && hasCustomDisplay) {
		const mapped = mapLogColumnsToRecordColumns(
			normalizeLogDisplayColumns(options.displayColumns)
		)
		const visible = mapped.filter((k) => k !== "event" && k !== "time")
		if (visible.length === 0) {
			return ["screenshot", "name", "event", "time"]
		}
		return mapped
	}

	if (isFace) return DEFAULT_RECORD_COLUMNS
	return DEFAULT_RECORD_COLUMNS_WITHOUT_SIMILARITY
}

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

export const formatLogSimilarity = (log: PeopleCountingLog): string => {
	const s = log.similarity
	if (s == null || !Number.isFinite(Number(s))) return "—"
	return `${Number(s)}%`
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
			case "similarity":
				row[PEOPLE_COUNTING_LOG_COLUMN_LABELS.similarity] = formatLogSimilarity(log)
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
