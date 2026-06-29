import type {
	DeviceCreatedEvent,
	DeviceUpdatedEvent,
	DeviceDeletedEvent,
	MonitoringDeviceStatusEvent,
	MonitoringDeviceStatusBatchEvent,
} from "~/types/websocket"
import { useAccessGate } from "~/composables/core/useAccessGate"
import { PERM } from "~/config/permissionCodes"
import { useWebSocketMonitor } from "~/composables/websocket/useWebSocketMonitor"

/**
 * 設備 WebSocket 訂閱器
 * 用於監聽設備相關的 WebSocket 事件並即時回調
 */
export const useDeviceWebSocket = () => {
	const { setupListeners, removeListeners, isConnected } = useWebSocketMonitor()
	const { useWsModuleGate } = useAccessGate()
	const canSubscribe = useWsModuleGate(null, { permissionCode: PERM.equipment.module })

	// 事件回調函數（由外部設置）
	let callbacks: {
		onDeviceCreated?: (event: DeviceCreatedEvent) => void
		onDeviceUpdated?: (event: DeviceUpdatedEvent) => void
		onDeviceDeleted?: (event: DeviceDeletedEvent) => void
		onMonitoringStatus?: (event: MonitoringDeviceStatusEvent) => void
		onMonitoringStatusBatch?: (event: MonitoringDeviceStatusBatchEvent) => void
	} = {}

	const setupDeviceListeners = (newCallbacks?: typeof callbacks) => {
		if (newCallbacks) callbacks = newCallbacks

		setupListeners(
			[
			{
				event: "device:created",
				handler: (e: DeviceCreatedEvent) => callbacks.onDeviceCreated?.(e),
				logMessage: (e: DeviceCreatedEvent) => `設備創建: ${e.device.name} (ID: ${e.device.id})`,
			},
			{
				event: "device:updated",
				handler: (e: DeviceUpdatedEvent) => callbacks.onDeviceUpdated?.(e),
				logMessage: (e: DeviceUpdatedEvent) => `設備更新: ${e.device.name} (ID: ${e.device.id})`,
			},
			{
				event: "device:deleted",
				handler: (e: DeviceDeletedEvent) => callbacks.onDeviceDeleted?.(e),
				logMessage: (e: DeviceDeletedEvent) => `設備刪除: ID ${e.deviceId}`,
			},
			{
				event: "monitoring:device:status",
				handler: (e: MonitoringDeviceStatusEvent) => callbacks.onMonitoringStatus?.(e),
				logMessage: (e: MonitoringDeviceStatusEvent) =>
					`設備監控狀態: ${e.system}, ID ${e.sourceId}, ${e.status}`,
			},
			{
				event: "monitoring:device:status:batch",
				handler: (e: MonitoringDeviceStatusBatchEvent) => callbacks.onMonitoringStatusBatch?.(e),
				logMessage: (e: MonitoringDeviceStatusBatchEvent) =>
					`設備批次監控狀態: ${e.system}, ${e.status}, ${e.updates.length} 個設備`,
			},
		],
			{ enabled: canSubscribe },
		)
	}

	const removeDeviceListeners = () => {
		removeListeners([
			"device:created",
			"device:updated",
			"device:deleted",
			"monitoring:device:status",
			"monitoring:device:status:batch",
		])
		callbacks = {}
	}

	return {
		setupDeviceListeners,
		removeDeviceListeners,
		isWebSocketConnected: isConnected,
	}
}

