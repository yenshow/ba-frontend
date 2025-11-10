<template>
	<div class="min-h-screen bg-ba-gradient">
		<AppHeader />
		<main class="px-4 xl:px-8 2xl:px-12 py-2 xl:py-4 2xl:py-6">
			<slot />
		</main>
	</div>
</template>

<script setup lang="ts">
import AppHeader from "~/components/common/AppHeader.vue";
</script>

<style scoped>
.bg-ba-gradient {
	background: linear-gradient(155deg, #13a6a9 0%, #002247 100%);
}
</style>
