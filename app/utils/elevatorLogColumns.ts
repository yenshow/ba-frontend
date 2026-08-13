/**
 * 電梯完整報表事件表格欄位定義
 */

import type { ElevatorLog } from "~/types/elevator"
import { formatDateTime } from "~/utils/dateUtils"
import { formatElevatorLogFloorDisplay } from "~/utils/elevatorFloorModel"
import type { ElevatorLogicalFloor } from "~/utils/elevatorFloorModel"

export const ELEVATOR_LOG_COLUMN_KEYS = ["device_name", "name", "event", "floor", "time"] as const

export type ElevatorLogColumnKey = (typeof ELEVATOR_LOG_COLUMN_KEYS)[number]

export const ELEVATOR_LOG_COLUMN_LABELS: Record<ElevatorLogColumnKey, string> = {
	device_name: "設備名稱",
	name: "姓名",
	event: "事件",
	floor: "樓層",
	time: "時間",
}

export const ELEVATOR_DEFAULT_LOG_DISPLAY_COLUMNS: ElevatorLogColumnKey[] = [
	...ELEVATOR_LOG_COLUMN_KEYS,
]

export const getElevatorLogCellValue = (
	log: ElevatorLog,
	col: ElevatorLogColumnKey,
	options?: { floors?: ElevatorLogicalFloor[] }
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
