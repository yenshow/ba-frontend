<template>
	<div class="min-h-screen bg-ba-gradient">
		<AppHeader />
		<main class="p-4 xl:p-8 2xl:p-12">
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
