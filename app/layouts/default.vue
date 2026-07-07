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
			@close="cameraPopup.handleClose"
			@prev="cameraPopup.handlePrev"
			@next="cameraPopup.handleNext"
			@reload="cameraPopup.handleReload"
		/>
	</div>
</template>

<script setup lang="ts">
import AppHeader from "~/components/common/AppHeader.vue";
import ToastContainer from "~/components/common/ToastContainer.vue";
import AlertCameraLinkagePopup from "~/components/alerts/AlertCameraLinkagePopup.vue";
import { useAuth } from "~/composables/core/useAuth";
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor";
import { useAlertCameraLinkagePopup } from "~/composables/monitoring/useAlertCameraLinkagePopup";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useWebSocketLifecycle } from "~/composables/websocket/useWebSocketLifecycle";

const { user } = useAuth();
const { startMonitoring, stopMonitoring } = useAlertMonitor();
const { isConnected } = useWebSocket();
const cameraPopup = useAlertCameraLinkagePopup();
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
		} else {
			cameraPopup.stop();
		}
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	stopMonitoring();
	stopWebSocketLifecycle();
	cameraPopup.stop();
});
</script>
