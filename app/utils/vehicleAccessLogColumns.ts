/**
 * 車輛進出紀錄表格欄位（與後端 log_display_columns 一致）
 */

import type { VehicleDataLog } from "~/types/vehicleAccess";
import { formatDate, formatTime } from "~/utils/dateUtils";

export const VEHICLE_ACCESS_LOG_COLUMN_KEYS = [
	"plate_image",
	"license_plate",
	"lane",
	"owner_name",
	"pass_result",
	"time"
] as const;

export type VehicleAccessLogColumnKey = (typeof VEHICLE_ACCESS_LOG_COLUMN_KEYS)[number];

export const VEHICLE_ACCESS_LOG_COLUMN_LABELS: Record<VehicleAccessLogColumnKey, string> = {
	plate_image: "車牌圖片",
	license_plate: "車牌",
	lane: "車道",
	owner_name: "車主名稱",
	pass_result: "放行結果",
	time: "時間"
};

const REQUIRED_LOG_COLUMN_KEYS: VehicleAccessLogColumnKey[] = ["pass_result", "time"];

/** 地點表單可勾選欄位（放行結果、時間固定顯示） */
export const TOGGLEABLE_VEHICLE_LOG_COLUMN_KEYS = VEHICLE_ACCESS_LOG_COLUMN_KEYS.filter(
	k => !REQUIRED_LOG_COLUMN_KEYS.includes(k)
);

export const DEFAULT_VEHICLE_LOG_DISPLAY_COLUMNS: VehicleAccessLogColumnKey[] = [
	...VEHICLE_ACCESS_LOG_COLUMN_KEYS
];

export const normalizeVehicleLogDisplayColumns = (
	raw: string[] | undefined | null
): VehicleAccessLogColumnKey[] => {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [...DEFAULT_VEHICLE_LOG_DISPLAY_COLUMNS];
	}
	const allowed = new Set<string>(VEHICLE_ACCESS_LOG_COLUMN_KEYS);
	const seen = new Set<string>();
	const picked: VehicleAccessLogColumnKey[] = [];
	for (const key of raw) {
		const k = String(key).trim();
		if (!allowed.has(k) || seen.has(k)) continue;
		seen.add(k);
		picked.push(k as VehicleAccessLogColumnKey);
	}
	if (picked.length === 0) return [...DEFAULT_VEHICLE_LOG_DISPLAY_COLUMNS];
	for (const req of REQUIRED_LOG_COLUMN_KEYS) {
		if (!seen.has(req)) picked.push(req);
	}
	return VEHICLE_ACCESS_LOG_COLUMN_KEYS.filter(k => picked.includes(k));
};

/** 寫入 API／DB：不含固定的 pass_result、time */
export const toStoredVehicleLogDisplayColumns = (
	normalized: VehicleAccessLogColumnKey[]
): VehicleAccessLogColumnKey[] => normalized.filter(k => !REQUIRED_LOG_COLUMN_KEYS.includes(k));

export const getVehiclePassResultLabel = (log: VehicleDataLog): string => {
	if (log.allow_result === 1) {
		if (log.lane_type === 1) return "進入";
		if (log.lane_type === 2) return "離開";
		return "放行";
	}
	if (log.allow_result === 0) return "拒絕";
	return "陌生";
};

export const getVehiclePassResultTagClass = (log: VehicleDataLog): string => {
	if (log.allow_result === 1) {
		if (log.lane_type === 1) return "bg-green-500/30 text-green-200";
		if (log.lane_type === 2) return "bg-cyan-500/30 text-cyan-200";
		return "bg-emerald-500/30 text-emerald-100";
	}
	if (log.allow_result === 0) return "bg-rose-500/70 text-rose-100";
	return "bg-amber-400/55 text-white font-semibold ring-1 ring-amber-200/60";
};

export const formatVehicleLogLaneOrEmpty = (log: VehicleDataLog): string =>
	log.lane_name?.trim() || "";

export const formatVehicleLogLane = (log: VehicleDataLog): string =>
	formatVehicleLogLaneOrEmpty(log) || "-";

export const formatVehicleLogText = (value: string | null | undefined): string => {
	const s = value != null ? String(value).trim() : "";
	return s || "-";
};

export const buildVehicleLogDetailRow = (
	log: VehicleDataLog,
	columns: VehicleAccessLogColumnKey[]
): Record<string, string> => {
	const row: Record<string, string> = {};
	for (const col of columns) {
		switch (col) {
			case "plate_image":
				row[VEHICLE_ACCESS_LOG_COLUMN_LABELS.plate_image] = log.plate_license_image_url?.trim()
					? "有"
					: "—";
				break;
			case "license_plate":
				row[VEHICLE_ACCESS_LOG_COLUMN_LABELS.license_plate] = formatVehicleLogText(
					log.license_plate
				);
				break;
			case "lane":
				row[VEHICLE_ACCESS_LOG_COLUMN_LABELS.lane] = formatVehicleLogLane(log);
				break;
			case "owner_name":
				row[VEHICLE_ACCESS_LOG_COLUMN_LABELS.owner_name] = formatVehicleLogText(log.owner_name);
				break;
			case "pass_result":
				row[VEHICLE_ACCESS_LOG_COLUMN_LABELS.pass_result] = getVehiclePassResultLabel(log);
				break;
			case "time":
				row[VEHICLE_ACCESS_LOG_COLUMN_LABELS.time] = log.trigger_time
					? `${formatDate(log.trigger_time)} ${formatTime(log.trigger_time)}`
					: "—";
				break;
		}
	}
	return row;
};
