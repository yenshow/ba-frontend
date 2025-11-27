<template>
	<div>
		<NuxtRouteAnnouncer />
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</div>
</template>

<script setup lang="ts">
// 認證初始化已移至 plugins/auth.client.ts
// 這裡不需要再次初始化
</script>
