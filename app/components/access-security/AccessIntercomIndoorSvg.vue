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

		<g transform="translate(67 102)">
			<rect width="28" height="28" rx="6" fill="#22c55e" />
			<path
				transform="translate(5 5) scale(0.75)"
				d="M21.5 15.4v2.4a1.6 1.6 0 0 1-1.7 1.6 15.8 15.8 0 0 1-6.9-2.5 15.6 15.6 0 0 1-4.8-4.8 15.8 15.8 0 0 1-2.5-6.9A1.6 1.6 0 0 1 7.2 3h2.4a1.6 1.6 0 0 1 1.6 1.4c.1.7.3 1.4.5 2.1a1.6 1.6 0 0 1-.4 1.7L10 9.5a12.8 12.8 0 0 0 4.8 4.8l1.3-1.3a1.6 1.6 0 0 1 1.7-.4c.7.2 1.4.4 2.1.5a1.6 1.6 0 0 1 1.6 1.3z"
				fill="#fff"
			/>
		</g>
		<g transform="translate(113 102)">
			<rect width="28" height="28" rx="6" fill="#f59e0b" />
			<path
				d="M6 9h16v11H6z"
				fill="none"
				stroke="#fff"
				stroke-width="1.6"
				stroke-linejoin="round"
			/>
			<path d="M6 9l8 6 8-6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" />
		</g>
		<g transform="translate(159 102)">
			<rect width="28" height="28" rx="6" fill="#3b82f6" />
			<circle cx="14" cy="14" r="5.5" fill="none" stroke="#fff" stroke-width="1.6" />
			<circle cx="14" cy="14" r="2.2" fill="#fff" />
		</g>
		<g transform="translate(205 102)">
			<rect width="28" height="28" rx="6" fill="#8b5cf6" />
			<circle cx="14" cy="14" r="3.4" fill="none" stroke="#fff" stroke-width="1.6" />
			<path
				d="M14 6.4v2.1M14 19.5v2.1M6.4 14h2.1M19.5 14h2.1M8.6 8.6l1.5 1.5M17.9 17.9l1.5 1.5M8.6 19.4l1.5-1.5M17.9 10.1l1.5-1.5"
				fill="none"
				stroke="#fff"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
		</g>

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
