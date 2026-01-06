import {
	type DeviceCreatedEvent,
	type DeviceUpdatedEvent,
	type DeviceDeletedEvent,
	type DeviceStatusChangedEvent,
	type MonitoringDeviceStatusEvent,
	type MonitoringDeviceStatusBatchEvent
} from "../composables/useWebSocket";
import { useWebSocketMonitor } from "../composables/useWebSocketMonitor";
import type { Device, DeviceTypeCode } from "../types/device";

/**
 * 設備監聽器
 * 用於監聽設備相關的 WebSocket 事件並即時更新設備列表
 * 參考後端設計：ba-backend/docs/WEBSOCKET_STRATEGY_AND_IMPLEMENTATION.md
 */
export const useDeviceMonitor = () => {
	const { setupListeners, removeListeners, isConnected } = useWebSocketMonitor();

	// 事件回調函數（由外部設置）
	let callbacks: {
		onDeviceCreated?: (event: DeviceCreatedEvent) => void;
		onDeviceUpdated?: (event: DeviceUpdatedEvent) => void;
		onDeviceDeleted?: (event: DeviceDeletedEvent) => void;
		onDeviceStatusChanged?: (event: DeviceStatusChangedEvent) => void;
		onMonitoringStatus?: (event: MonitoringDeviceStatusEvent) => void;
		onMonitoringStatusBatch?: (event: MonitoringDeviceStatusBatchEvent) => void;
	} = {};

	/**
	 * 設置 WebSocket 事件監聽器
	 * @param newCallbacks - 事件回調函數
	 */
	const setupDeviceListeners = (newCallbacks?: typeof callbacks) => {
		// 設置回調函數
		if (newCallbacks) {
			callbacks = newCallbacks;
		}

		// 使用統一的監聽器管理
		setupListeners([
			{
				event: "device:created",
				handler: (e: DeviceCreatedEvent) => callbacks.onDeviceCreated?.(e),
				logMessage: (e) => `設備創建: ${e.device.name} (ID: ${e.device.id})`
			},
			{
				event: "device:updated",
				handler: (e: DeviceUpdatedEvent) => callbacks.onDeviceUpdated?.(e),
				logMessage: (e) => `設備更新: ${e.device.name} (ID: ${e.device.id})`
			},
			{
				event: "device:deleted",
				handler: (e: DeviceDeletedEvent) => callbacks.onDeviceDeleted?.(e),
				logMessage: (e) => `設備刪除: ID ${e.deviceId}`
			},
			{
				event: "device:status:changed",
				handler: (e: DeviceStatusChangedEvent) => callbacks.onDeviceStatusChanged?.(e),
				logMessage: (e) => `設備狀態變更: ID ${e.deviceId}, ${e.oldStatus} → ${e.newStatus}`
			},
			{
				event: "monitoring:device:status",
				handler: (e: MonitoringDeviceStatusEvent) => callbacks.onMonitoringStatus?.(e),
				logMessage: (e) => `設備監控狀態: ${e.system}, ID ${e.sourceId}, ${e.status}`
			},
			{
				event: "monitoring:device:status:batch",
				handler: (e: MonitoringDeviceStatusBatchEvent) => callbacks.onMonitoringStatusBatch?.(e),
				logMessage: (e) => `設備批次監控狀態: ${e.system}, ${e.status}, ${e.updates.length} 個設備`
			}
		]);
	};

	/**
	 * 移除 WebSocket 事件監聽器
	 */
	const removeDeviceListeners = () => {
		removeListeners([
			"device:created",
			"device:updated",
			"device:deleted",
			"device:status:changed",
			"monitoring:device:status",
			"monitoring:device:status:batch"
		]);
		callbacks = {};
	};

	return {
		setupDeviceListeners,
		removeDeviceListeners,
		isWebSocketConnected: isConnected
	};
};

