<template>
	<div class="bg-ba-gradient min-h-screen">
		<AppHeader />
		<main class="p-4 pb-4 sm:p-6 lg:p-8 2xl:p-12">
			<slot />
		</main>
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
	</div>
</template>

<script setup lang="ts">
import AppHeader from "~/components/common/AppHeader.vue";
import ToastContainer from "~/components/common/ToastContainer.vue";
import AlertCameraLinkagePopup from "~/components/alerts/AlertCameraLinkagePopup.vue";
import AccessEventCameraPopup from "~/components/people-counting/AccessEventCameraPopup.vue";
import { useAuth } from "~/composables/core/useAuth";
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor";
import { useAlertCameraLinkagePopup } from "~/composables/monitoring/useAlertCameraLinkagePopup";
import { useAccessEventCameraPopup } from "~/composables/monitoring/useAccessEventCameraPopup";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useWebSocketLifecycle } from "~/composables/websocket/useWebSocketLifecycle";

const { user } = useAuth();
const { startMonitoring, stopMonitoring } = useAlertMonitor();
const { isConnected } = useWebSocket();
const cameraPopup = useAlertCameraLinkagePopup();
const accessEventCameraPopup = useAccessEventCameraPopup();
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
		} else {
			cameraPopup.stop();
			accessEventCameraPopup.stop();
		}
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	stopMonitoring();
	stopWebSocketLifecycle();
	cameraPopup.stop();
	accessEventCameraPopup.stop();
});
</script>
