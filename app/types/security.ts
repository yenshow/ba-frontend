import type { CategoryModbusConfig } from "~/types/lighting"
import type { ModbusStatusPointDef } from "~/types/location"
import {
	isSnapshotAlarm,
	normalizeSystemUiStatus,
	type SystemUiStatus,
} from "~/utils/monitoringStatus"

export interface SecurityStatusItem {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	equipmentKind: string
	viewCategory: string
	uiStatus: SystemUiStatus
	raw?: Record<string, boolean | undefined>
	error?: string
}

/** 與後端對齊：`uiStatus` 已含連線／讀值／時間排程語意；勿用 raw.running===false 推論為正常。 */
export const deriveSecurityUiStatus = (
	item: SecurityStatusItem | null | undefined
): SecurityStatusItem["uiStatus"] => {
	if (!item) return "warning"
	const normalized = normalizeSystemUiStatus(item.uiStatus)
	if (normalized === "activity") return "activity"
	if (isSnapshotAlarm(item)) return "alarm"
	return normalized
}

/** 保全活動資料來源（表單先選，再顯示對應綁定） */
export type SecurityDataSource = "di" | "access_control" | "both"

export interface SecurityLocation {
	id?: string
	systemId?: string
	name: string
	sortOrder?: number
	createdAt?: string
	location?: { x: number; y: number }
	description?: string
	/** 資料來源：di／access_control／both */
	dataSource?: SecurityDataSource
	deviceId?: number
	modbus?: CategoryModbusConfig
	equipmentKind?: string
	viewCategory?: string
	statusPoints?: Record<string, ModbusStatusPointDef>
	/** 門禁機／讀卡機 device id 列表 */
	accessDeviceIds?: number[]
}

export interface SecurityZone {
	id?: string
	name: string
	imageUrl?: string
	sortOrder?: number
	locations: SecurityLocation[]
	description?: string
}
