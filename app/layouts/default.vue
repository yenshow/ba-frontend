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
		<main class="p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-28 2xl:px-12 2xl:py-8">
			<slot />
		</main>
		<BottomNavigation />
		<ToastContainer />
		<AlertCameraLinkagePopup
			:open="cameraPopup.state.open"
			:items="cameraPopup.state.items"
			:active-index="cameraPopup.state.activeIndex"
			:streams="cameraPopup.state.streams"
			:location-context="cameraPopup.state.locationContext"
			@close="cameraPopup.handleClose"
			@prev="cameraPopup.handlePrev"
			@next="cameraPopup.handleNext"
			@reload-stream="cameraPopup.handleReloadStream"
		/>
		<AccessEventCameraPopup
			:open="accessEventCameraPopup.state.open"
			:item="accessEventCameraPopup.state.item"
			:streams="accessEventCameraPopup.state.streams"
			:auto-close-ms="accessEventCameraPopup.state.autoCloseMs"
			:auto-close-epoch="accessEventCameraPopup.state.autoCloseEpoch"
			:is-fullscreen="accessEventCameraPopup.state.isFullscreen"
			@close="accessEventCameraPopup.handleClose"
			@reload-stream="accessEventCameraPopup.handleReloadStream"
			@update:fullscreen="accessEventCameraPopup.setFullscreen"
		/>
		<AccessEventCameraPopup
			:open="vehicleBarrierCameraPopup.state.open"
			:item="vehicleBarrierCameraPopup.state.item"
			:streams="vehicleBarrierCameraPopup.state.streams"
			:auto-close-ms="vehicleBarrierCameraPopup.state.autoCloseMs"
			:auto-close-epoch="vehicleBarrierCameraPopup.state.autoCloseEpoch"
			:is-fullscreen="vehicleBarrierCameraPopup.state.isFullscreen"
			title-prefix="車輛調閱"
			navigate-path="/access-control/vehicle-access"
			aria-label="車輛事件調閱，點擊前往車輛管理"
			fallback-place-label="車輛事件"
			@close="vehicleBarrierCameraPopup.handleClose"
			@reload-stream="vehicleBarrierCameraPopup.handleReloadStream"
			@update:fullscreen="vehicleBarrierCameraPopup.setFullscreen"
		/>
	</div>
</template>

<script setup lang="ts">
import ToastContainer from "~/components/common/ToastContainer.vue";
import AlertCameraLinkagePopup from "~/components/alerts/AlertCameraLinkagePopup.vue";
import AccessEventCameraPopup from "~/components/people-counting/AccessEventCameraPopup.vue";
import { useAuth } from "~/composables/core/useAuth";
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor";
import { useAlertCameraLinkagePopup } from "~/composables/monitoring/useAlertCameraLinkagePopup";
import { useAccessEventCameraPopup } from "~/composables/monitoring/useAccessEventCameraPopup";
import { useVehicleBarrierCameraPopup } from "~/composables/monitoring/useVehicleBarrierCameraPopup";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useWebSocketLifecycle } from "~/composables/websocket/useWebSocketLifecycle";
import BottomNavigation from "~/components/common/BottomNavigation.vue";
import SafetyBanner from "~/components/home/SafetyBanner.vue";
import HomeHeader from "~/components/home/HomeHeader.vue";

const { user } = useAuth();
const { startMonitoring, stopMonitoring } = useAlertMonitor();
const { isConnected } = useWebSocket();
const cameraPopup = useAlertCameraLinkagePopup();
const accessEventCameraPopup = useAccessEventCameraPopup();
const vehicleBarrierCameraPopup = useVehicleBarrierCameraPopup();
const { start: startWebSocketLifecycle, stop: stopWebSocketLifecycle } = useWebSocketLifecycle();

startWebSocketLifecycle();

watch(
	[() => user.value, isConnected],
	([newUser, connected]) => {
		if (newUser) {
			startMonitoring();
		} else {
			stopMonitoring();
		}
		if (newUser && connected) {
			cameraPopup.start();
			accessEventCameraPopup.start();
			vehicleBarrierCameraPopup.start();
		} else {
			cameraPopup.stop();
			accessEventCameraPopup.stop();
			vehicleBarrierCameraPopup.stop();
		}
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	stopMonitoring();
	stopWebSocketLifecycle();
	cameraPopup.stop();
	accessEventCameraPopup.stop();
	vehicleBarrierCameraPopup.stop();
});
</script>
