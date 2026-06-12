<template>
	<div
		class="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center"
		role="status"
	>
		<div
			class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-sm"
		>
			<div
				class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
				aria-hidden="true"
			/>
			<p class="text-white/85">{{ message }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		message?: string
	}>(),
	{ message: "同步中，請稍候…" },
)
</script>
