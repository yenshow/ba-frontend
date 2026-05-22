import type { Alert } from "~/types/alert"
import type { Device, DeviceStatus } from "~/types/device"

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

export interface DeviceStatusChangedEvent {
	deviceId: number
	oldStatus: DeviceStatus
	newStatus: DeviceStatus
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
	/** @deprecated 舊版巢狀 reading，新客戶端請用 recordedAt + data */
	reading?: Record<string, unknown>
}

/**
 * YSCP 事件 payload（依 params.ability 分流：event_veh → vehicle_access，event_acs → acs）
 */
export interface YscpEventPayload {
	type: "vehicle_access" | "acs"
	timestamp: string
}

