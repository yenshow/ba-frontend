<template>
	<div class="bg-ba-gradient min-h-screen">
		<main class="p-8 2xl:px-12 2xl:py-16">
			<slot />
		</main>
		<BottomNavigation />
	</div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/core/useAuth";
import { useAlertMonitor } from "~/composables/monitoring/useAlertMonitor";
import { useWebSocketLifecycle } from "~/composables/websocket/useWebSocketLifecycle";
import BottomNavigation from "~/components/common/BottomNavigation.vue";

const { user } = useAuth();
const { startMonitoring, stopMonitoring } = useAlertMonitor();
const { start: startWebSocketLifecycle, stop: stopWebSocketLifecycle } = useWebSocketLifecycle();

startWebSocketLifecycle();

watch(
	() => user.value,
	newUser => {
		if (newUser) {
			startMonitoring();
		} else {
			stopMonitoring();
		}
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	stopMonitoring();
	stopWebSocketLifecycle();
});
</script>

<style scoped>
.bg-ba-gradient {
	background: linear-gradient(155deg, #13a6a9 0%, #002247 100%);
}
</style>
