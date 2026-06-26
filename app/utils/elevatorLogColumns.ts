/**
 * 電梯事件紀錄表格欄位（與後端 log_display_columns 一致）
 * 匯出名稱加 ELEVATOR_ 前綴，避免與 peopleCountingLogColumns 的 Nuxt auto-import 衝突。
 */

import type { ElevatorLog } from "~/types/elevator"
import { formatDateTime } from "~/utils/dateUtils"
import { formatElevatorLogFloorDisplay } from "~/utils/elevatorFloorModel"
import type { ElevatorLogicalFloor } from "~/utils/elevatorFloorModel"

export const ELEVATOR_LOG_COLUMN_KEYS = [
	"device_name",
	"name",
	"event",
	"floor",
	"time",
] as const

export type ElevatorLogColumnKey = (typeof ELEVATOR_LOG_COLUMN_KEYS)[number]

export const ELEVATOR_LOG_COLUMN_LABELS: Record<ElevatorLogColumnKey, string> = {
	device_name: "設備名稱",
	name: "姓名",
	event: "事件",
	floor: "樓層",
	time: "時間",
}

const REQUIRED_LOG_COLUMN_KEYS: ElevatorLogColumnKey[] = ["event", "time"]

export const ELEVATOR_TOGGLEABLE_LOG_COLUMN_KEYS = ELEVATOR_LOG_COLUMN_KEYS.filter(
	(k) => !REQUIRED_LOG_COLUMN_KEYS.includes(k),
)

export const ELEVATOR_DEFAULT_LOG_DISPLAY_COLUMNS: ElevatorLogColumnKey[] = [
	...ELEVATOR_LOG_COLUMN_KEYS,
]

export const normalizeElevatorLogDisplayColumns = (
	raw: string[] | undefined | null,
): ElevatorLogColumnKey[] => {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [...ELEVATOR_DEFAULT_LOG_DISPLAY_COLUMNS]
	}
	const allowed = new Set<string>(ELEVATOR_LOG_COLUMN_KEYS)
	const seen = new Set<string>()
	const picked: ElevatorLogColumnKey[] = []
	for (const key of raw) {
		const k = String(key).trim()
		if (k === "card_no" || !allowed.has(k) || seen.has(k)) continue
		seen.add(k)
		picked.push(k as ElevatorLogColumnKey)
	}
	if (picked.length === 0) return [...ELEVATOR_DEFAULT_LOG_DISPLAY_COLUMNS]
	for (const req of REQUIRED_LOG_COLUMN_KEYS) {
		if (!seen.has(req)) picked.push(req)
	}
	return ELEVATOR_LOG_COLUMN_KEYS.filter((k) => picked.includes(k))
}

export const toStoredElevatorLogDisplayColumns = (
	normalized: ElevatorLogColumnKey[],
): string[] => normalized.filter((k) => !REQUIRED_LOG_COLUMN_KEYS.includes(k))

export const getElevatorLogCellValue = (
	log: ElevatorLog,
	col: ElevatorLogColumnKey,
	options?: { floors?: ElevatorLogicalFloor[] },
): string => {
	switch (col) {
		case "floor": {
			const display = formatElevatorLogFloorDisplay(log.floor, options?.floors ?? [])
			return display || "—"
		}
		case "device_name":
			return log.deviceName?.trim() || "—"
		case "name":
			return log.personName?.trim() || "—"
		case "event":
			return log.event?.trim() || "—"
		case "time":
			return log.time ? formatDateTime(log.time) : "—"
		default:
			return "—"
	}
}
