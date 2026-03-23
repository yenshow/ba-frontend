<template>
	<svg
		viewBox="0 0 24 24"
		:class="['flex-shrink-0', $attrs.class]"
		fill="none"
		aria-hidden="true"
	>
		<path
			d="M8 11V8a4 4 0 1 1 8 0v3"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M7 11h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

