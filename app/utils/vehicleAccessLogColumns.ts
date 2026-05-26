/**
 * 車輛進出紀錄表格欄位（與後端 log_display_columns 一致）
 */

import type { VehicleDataLog } from "~/types/vehicleAccess"
import { formatDate, formatTime } from "~/utils/dateUtils"

export const VEHICLE_ACCESS_LOG_COLUMN_KEYS = [
	"plate_image",
	"license_plate",
	"lane",
	"owner_name",
	"pass_result",
	"time",
] as const

export type VehicleAccessLogColumnKey = (typeof VEHICLE_ACCESS_LOG_COLUMN_KEYS)[number]

export const VEHICLE_ACCESS_LOG_COLUMN_LABELS: Record<VehicleAccessLogColumnKey, string> = {
	plate_image: "車牌圖片",
	license_plate: "車牌",
	lane: "車道",
	owner_name: "車主名稱",
	pass_result: "放行結果",
	time: "時間",
}

const REQUIRED_LOG_COLUMN_KEYS: VehicleAccessLogColumnKey[] = ["pass_result", "time"]

/** 地點表單可勾選欄位（放行結果、時間固定顯示） */
export const TOGGLEABLE_VEHICLE_LOG_COLUMN_KEYS = VEHICLE_ACCESS_LOG_COLUMN_KEYS.filter(
	(k) => !REQUIRED_LOG_COLUMN_KEYS.includes(k)
)

export const DEFAULT_VEHICLE_LOG_DISPLAY_COLUMNS: VehicleAccessLogColumnKey[] = [
	...VEHICLE_ACCESS_LOG_COLUMN_KEYS,
]

export const normalizeVehicleLogDisplayColumns = (
	raw: string[] | undefined | null
): VehicleAccessLogColumnKey[] => {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [...DEFAULT_VEHICLE_LOG_DISPLAY_COLUMNS]
	}
	const allowed = new Set<string>(VEHICLE_ACCESS_LOG_COLUMN_KEYS)
	const seen = new Set<string>()
	const picked: VehicleAccessLogColumnKey[] = []
	for (const key of raw) {
		const k = String(key).trim()
		if (!allowed.has(k) || seen.has(k)) continue
		seen.add(k)
		picked.push(k as VehicleAccessLogColumnKey)
	}
	if (picked.length === 0) return [...DEFAULT_VEHICLE_LOG_DISPLAY_COLUMNS]
	for (const req of REQUIRED_LOG_COLUMN_KEYS) {
		if (!seen.has(req)) picked.push(req)
	}
	return VEHICLE_ACCESS_LOG_COLUMN_KEYS.filter((k) => picked.includes(k))
}

/** 寫入 API／DB：不含固定的 pass_result、time */
export const toStoredVehicleLogDisplayColumns = (
	normalized: VehicleAccessLogColumnKey[]
): VehicleAccessLogColumnKey[] =>
	normalized.filter((k) => !REQUIRED_LOG_COLUMN_KEYS.includes(k))

const getLaneType = (log: VehicleDataLog): number | null => log.lane_type ?? null

export const getVehiclePassResultLabel = (log: VehicleDataLog): string => {
	if (log.allow_result === 0) return "拒絕"
	if (log.allow_result === 1) {
		const lt = getLaneType(log)
		if (lt === 1) return "進入"
		if (lt === 2) return "離開"
		return "放行"
	}
	return "-"
}

export const getVehiclePassResultTagClass = (log: VehicleDataLog): string => {
	if (log.allow_result === 0) return "bg-red-500/70 text-red-200"
	if (log.allow_result === 1) {
		const lt = getLaneType(log)
		if (lt === 1) return "bg-green-500/30 text-green-200"
		if (lt === 2) return "bg-cyan-500/30 text-cyan-200"
	}
	return "bg-white/20 text-white/80"
}

export const formatVehicleLogLane = (log: VehicleDataLog): string =>
	log.anpr_line?.trim() || log.lane_name?.trim() || "-"

export const formatVehicleLogText = (value: string | null | undefined): string => {
	const s = value != null ? String(value).trim() : ""
	return s || "-"
}
