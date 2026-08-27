import type { SystemUiStatus } from "~/utils/monitoringStatus"

export type ModbusPointType = "DI" | "DO"

// 點位配置介面
export interface ModbusPointConfig {
	id?: string // 唯一 ID（用於 UI）
	address: number // 點位地址
	type: ModbusPointType
	note?: string // 備註

	// 向後兼容：保留 method 欄位（舊格式）
	method?: string
}

export interface CategoryModbusConfig {
	/** 舊版 modbus 內嵌設備 ID；讀寫 API 以地點層級 `deviceId` 為準，modbus 區塊不再含此欄 */
	deviceId?: number
	// 點位配置列表（包含 DI/DO 等所有點位）
	points?: ModbusPointConfig[]
	// 保留舊格式以向後兼容（如果 deviceId 不存在，則使用這些欄位）
	host?: string
	port?: number
	unitId?: number
	address?: number
	length?: number
	// 向後兼容：舊的單一點位格式
	diAddress?: number
	diLength?: number
	doAddress?: number
	doLength?: number
	diAddresses?: number[]
	doAddresses?: number[]
}

export type LightingCategory = {
	id: string
	name: string
	zoneId: string
	location?: { x: number; y: number }
	modbus?: CategoryModbusConfig
}

// ========== 新的區域管理結構 ==========

/**
 * 照明地點（原區域/分類點）
 */
export interface LightingLocation {
	id?: string // 地點 ID (locations.id)
	systemId?: string // 系統 ID (location_systems.id)，用於錯誤追蹤和警報
	/** 同區域內地點排序（小者在前） */
	sortOrder?: number
	name: string // 地點名稱（原分類名稱）
	location?: { x: number; y: number } // 位置座標（百分比，未定位時為 undefined）
	description?: string // 描述
	deviceId?: number // 關聯設備 ID
	modbus?: CategoryModbusConfig // Modbus 配置
}

/**
 * 照明區域（原樓層）
 */
export interface LightingZone {
	id?: string // 區域 ID（新建時可選）
	name: string // 區域名稱（如：1F、2F）
	/** 區域排序（小者在前） */
	sortOrder?: number
	imageUrl?: string // 示意圖 URL
	locations: LightingLocation[] // 地點列表
	description?: string // 區域描述
}

/**
 * 區域管理表單資料（只包含基本資訊，地點編輯在 ZoneManagementDialog 中處理）
 */
export interface LightingZoneFormData {
	name: string
	imageUrl?: string
	description?: string
}

export interface LightingStatusSnapshotItem {
	zoneId: string
	zoneName: string
	locationId: string
	locationName: string
	systemId: string
	deviceId?: number
	uiStatus: SystemUiStatus
	raw: {
		isOn?: boolean
		[key: string]: unknown
	}
	error?: string
}
