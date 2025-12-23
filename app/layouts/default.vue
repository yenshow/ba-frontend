<template>
	<div :class="['bg-ba-gradient', { 'bg-ba-gradient-dark': isDark }]" class="min-h-screen">
		<AppHeader />
		<main class="p-4 xl:p-8 2xl:p-12">
			<slot />
		</main>
		<ToastContainer />
	</div>
</template>

<script setup lang="ts">
import AppHeader from "~/components/common/AppHeader.vue";
import ToastContainer from "~/components/common/ToastContainer.vue";

const { isDark } = useTheme();
const { user } = useAuth();
const { startMonitoring, stopMonitoring } = useAlertMonitor();

// 當用戶登入時啟動警示監聽
watch(
	() => user.value,
	(newUser) => {
		if (newUser) {
			// 用戶已登入，啟動監聽
			startMonitoring();
		} else {
			// 用戶未登入，停止監聽
			stopMonitoring();
		}
	},
	{ immediate: true }
);

// 組件卸載時停止監聽
onBeforeUnmount(() => {
	stopMonitoring();
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
