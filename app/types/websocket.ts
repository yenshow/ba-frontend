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

/**
 * 環境監控相關事件類型
 */
export interface EnvironmentReadingNewEvent {
	locationId: number
	reading: {
		pm25?: number | null
		pm10?: number | null
		tvoc?: number | null
		hcho?: number | null
		humidity?: number | null
		temperature?: number | null
		co2?: number | null
		noise?: number | null
		wind?: number | null
		[key: string]: number | null | undefined
	}
	timestamp: string
}

/**
 * YSCP 事件 payload（依 params.ability 分流：event_veh → vehicle_access，event_acs → acs）
 */
export interface YscpEventPayload {
	type: "vehicle_access" | "acs"
	timestamp: string
}

