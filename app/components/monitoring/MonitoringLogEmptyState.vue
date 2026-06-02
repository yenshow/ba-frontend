<template>
	<div class="flex max-w-sm flex-col items-center gap-4 text-center">
		<div
			class="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/15 2xl:h-20 2xl:w-20"
			aria-hidden="true"
		>
			<svg
				class="h-9 w-9 text-white/55 2xl:h-11 2xl:w-11"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.75"
					d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
				/>
			</svg>
		</div>
		<p class="text-base leading-relaxed text-white/65 2xl:text-lg">{{ message }}</p>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	message: string
}>()
</script>
