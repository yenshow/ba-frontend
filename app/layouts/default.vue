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
import { useAuth } from "~/composables/core/useAuth";
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor";
import { useAlertCameraLinkagePopup } from "~/composables/monitoring/useAlertCameraLinkagePopup";
import { useWebSocket } from "~/composables/websocket/useWebSocket";
import { useWebSocketLifecycle } from "~/composables/websocket/useWebSocketLifecycle";
import BottomNavigation from "~/components/common/BottomNavigation.vue";
import SafetyBanner from "~/components/home/SafetyBanner.vue";
import HomeHeader from "~/components/home/HomeHeader.vue";

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

<style scoped>
.bg-ba-gradient {
	background: linear-gradient(155deg, #13a6a9 0%, #002247 100%);
}
</style>
