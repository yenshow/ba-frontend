import type { Alert } from "~/types/alert"
import type { Device } from "~/types/device"

/**
 * WebSocket 連接狀態
 */
export type WebSocketStatus = "disconnected" | "connecting" | "connected" | "error"

/**
 * 警報相關事件類型
 */
export interface AlertNewEvent extends Alert {}

export interface AlertUpdatedEvent {
	alert: Alert
	oldStatus: string
	newStatus: string
	timestamp: string
}

export interface AlertCountEvent {
	count: number
	timestamp: string
}

/** 日界線批次結案 active→resolved 後廣播（非逐筆 alert:updated） */
export interface AlertDailyRolloverEvent {
	resolvedCount: number
	occurredAt: string
	timezone: string
	timestamp: string
}

/**
 * 設備相關事件類型
 */
export interface DeviceCreatedEvent {
	device: Device
	userId: number
	timestamp: string
}

export interface DeviceUpdatedEvent {
	device: Device
	changes: Record<string, unknown>
	userId: number
	timestamp: string
}

export interface DeviceDeletedEvent {
	deviceId: number
	userId: number
	timestamp: string
}

export interface MonitoringDeviceStatusEvent {
	system: string
	sourceId: number
	deviceId?: number | null
	status: "online" | "offline"
	timestamp: string
}

export interface MonitoringDeviceStatusBatchEvent {
	system: string
	status: "online" | "offline"
	updates: Array<{ sourceId: number; deviceId?: number | null }>
	timestamp: string
}

/** 監控快照 UI 狀態變更（Push-First；後端 diff 後推送） */
export interface MonitoringSnapshotUpdatedEvent {
	system: string
	items: Array<Record<string, unknown>>
	fetchedAt: string
	timestamp: string
}

export type EnvironmentReadingDeviceStatus = {
	deviceId: number
	status: "online" | "offline"
}

/**
 * 環境監控 WS 契約（方案 B：Monitor 統一推送讀數 + 設備連線）
 */
export interface EnvironmentReadingNewEvent {
	locationId: number
	recordedAt: string
	data: Record<string, number | null | undefined>
	devices: EnvironmentReadingDeviceStatus[]
	/** 事件推送時間（非讀數時間） */
	timestamp: string
}

/**
 * YSCP 事件 payload（依 params.ability 分流：event_veh → vehicle_access，event_acs → acs）
 */
export interface YscpEventPayload {
	type: "vehicle_access" | "acs"
	timestamp: string
}

/** 車輛進出 WS（ISAPI ANPR / stats_reset 等） */
export interface VehicleAccessWsEventPayload {
	type?: string
	locationId?: number
	locationIds?: number[]
	deviceId?: number
	eventTime?: string
	timestamp?: string
	source?: string
}

/** 營運事件寫入後推播（首頁列表可直接 prepend） */
export interface OperationalEventNewEvent {
	id: number
	source: string
	event_kind: string
	summary: string
	occurred_at: string
	timestamp: string
}
