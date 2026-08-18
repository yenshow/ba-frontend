<template>
	<svg
		viewBox="0 0 300 188"
		class="h-full w-full"
		role="img"
		:aria-label="status === 'ringing' ? '室內機廣播中' : '室內機'"
	>
		<rect x="10" y="12" width="280" height="164" rx="14" fill="#0f172a" stroke="#475569" stroke-width="2" />
		<circle cx="150" cy="24" r="4" fill="#1e293b" />
		<circle cx="150" cy="24" r="1.6" fill="#38bdf8" />
		<rect
			x="22"
			y="34"
			width="256"
			height="108"
			rx="6"
			:fill="status === 'ringing' ? '#a5f3fc' : '#e2e8f0'"
		/>
		<rect x="22" y="146" width="256" height="22" rx="3" fill="#94a3b8" />
		<rect x="118" y="154" width="64" height="6" rx="1.5" fill="#475569" />
		<circle cx="258" cy="157" r="2" fill="#334155" />
	</svg>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		status?: "idle" | "ringing"
	}>(),
	{ status: "idle" }
)
</script>
