<template>
	<div class="bg-ba-gradient min-h-screen">
		<!-- 頂部橫幅（紅色警告區域） -->
		<div
			class="absolute left-0 top-0 -translate-x-[48px] overflow-hidden"
			style="width: calc(100% + 48px)"
		>
			<SafetyBanner />
		</div>

		<!-- 頂部區域（品牌與時間） -->
		<div class="pt-20 2xl:pt-32">
			<HomeHeader />
		</div>
		<main class="p-8 2xl:px-12 2xl:py-8">
			<slot />
		</main>
		<BottomNavigation />
		<ToastContainer />
		<AlertCameraLinkagePopup
			:open="cameraPopup.state.open"
			:items="cameraPopup.state.items"
			:active-index="cameraPopup.state.activeIndex"
			:streams="cameraPopup.state.streams"
			@close="cameraPopup.handleClose"
			@prev="cameraPopup.handlePrev"
			@next="cameraPopup.handleNext"
			@reload="cameraPopup.handleReload"
		/>
	</div>
</template>

<script setup lang="ts">
import ToastContainer from "~/components/common/ToastContainer.vue";
import AlertCameraLinkagePopup from "~/components/alerts/AlertCameraLinkagePopup.vue";
import type { MonitoringDeviceStatusBatchEvent } from "~/types/websocket";
import { useAuth } from "~/composables/core/useAuth";
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor";
import { useAlertCameraLinkagePopup } from "~/composables/monitoring/useAlertCameraLinkagePopup";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import BottomNavigation from "~/components/common/BottomNavigation.vue";
import SafetyBanner from "~/components/home/SafetyBanner.vue";
import HomeHeader from "~/components/home/HomeHeader.vue";

const { user } = useAuth();
const { startMonitoring, stopMonitoring } = useAlertMonitor();
const { isConnected, on, off } = useWebSocket();
const cameraPopup = useAlertCameraLinkagePopup();

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
			cameraPopup.start();
		} else if (!connected) {
			// WebSocket 斷線，移除全局監聽器
			removeGlobalDeviceStatusListener();
			cameraPopup.stop();
		}
	},
	{ immediate: true }
);

// 組件卸載時停止監聽
onBeforeUnmount(() => {
	stopMonitoring();
	removeGlobalDeviceStatusListener();
	cameraPopup.stop();
});
</script>

<style scoped>
.bg-ba-gradient {
	background: linear-gradient(155deg, #13a6a9 0%, #002247 100%);
}
</style>
