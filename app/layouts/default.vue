<template>
	<div :class="['bg-ba-gradient', { 'bg-ba-gradient-dark': isDark }]" class="min-h-screen">
		<main>
			<slot />
		</main>
		<ToastContainer />
	</div>
</template>

<script setup lang="ts">
import ToastContainer from "~/components/common/ToastContainer.vue";
import type { MonitoringDeviceStatusBatchEvent } from "~/composables/useWebSocket";

const { isDark } = useTheme();
const { user } = useAuth();
const { startMonitoring, stopMonitoring } = useAlertMonitor();
const { isConnected, on, off } = useWebSocket();

// 全局設備狀態批次更新監聽器（用於所有頁面）
let globalDeviceStatusBatchHandler: ((event: MonitoringDeviceStatusBatchEvent) => void) | null =
	null;

// 設置全局設備狀態監聽器
const setupGlobalDeviceStatusListener = () => {
	if (!process.client || globalDeviceStatusBatchHandler) {
		return;
	}

	// 處理設備狀態批次更新事件（全局）
	globalDeviceStatusBatchHandler = (event: MonitoringDeviceStatusBatchEvent) => {
		if (process.dev) {
			console.log(
				`[GlobalDeviceMonitor] 設備狀態批次更新: ${event.system} 系統, ${event.status} 狀態, ${event.updates.length} 個設備`
			);
		}
		// 可以在這裡添加全局的狀態更新邏輯，例如更新全局設備狀態快取
	};

	// 監聽設備狀態批次更新事件
	on("monitoring:device:status:batch", globalDeviceStatusBatchHandler);

	if (process.dev) {
		console.log("[GlobalDeviceMonitor] 全局設備狀態監聽器已設置");
	}
};

// 移除全局設備狀態監聽器
const removeGlobalDeviceStatusListener = () => {
	if (globalDeviceStatusBatchHandler) {
		off("monitoring:device:status:batch", globalDeviceStatusBatchHandler);
		globalDeviceStatusBatchHandler = null;

		if (process.dev) {
			console.log("[GlobalDeviceMonitor] 全局設備狀態監聽器已移除");
		}
	}
};

// 當用戶登入時啟動警示監聽和設備狀態監聽
watch(
	() => user.value,
	newUser => {
		if (newUser) {
			// 用戶已登入，啟動監聽（useAlertMonitor 會自動建立 WebSocket 連接）
			startMonitoring();
		} else {
			// 用戶未登入，停止監聽
			stopMonitoring();
			removeGlobalDeviceStatusListener();
		}
	},
	{ immediate: true }
);

// 監聽 WebSocket 連接狀態，設置/移除全局設備狀態監聽器
watch(
	isConnected,
	connected => {
		if (connected && user.value) {
			// WebSocket 連接成功且用戶已登入，設置全局監聽器
			setupGlobalDeviceStatusListener();
		} else if (!connected) {
			// WebSocket 斷線，移除全局監聽器
			removeGlobalDeviceStatusListener();
		}
	},
	{ immediate: true }
);

// 組件卸載時停止監聽
onBeforeUnmount(() => {
	stopMonitoring();
	removeGlobalDeviceStatusListener();
});
</script>

<style scoped>
.bg-ba-gradient {
	background: linear-gradient(155deg, #13a6a9 0%, #002247 100%);
}

.bg-ba-gradient-dark {
	background: linear-gradient(155deg, #006473 0%, #000028 100%);
}
</style>
