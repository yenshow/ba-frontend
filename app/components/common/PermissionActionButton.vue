<template>
	<button
		:type="nativeType"
		:disabled="!allowed"
		:title="allowed ? undefined : '權限不足'"
		:aria-label="resolvedAriaLabel"
		:class="[
			'transition-opacity duration-200',
			userClass,
			!allowed && 'cursor-not-allowed opacity-30',
		]"
		@click="emit('click')"
	>
		<slot />
	</button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from "vue";

const props = withDefaults(
	defineProps<{
		allowed: boolean;
		ariaLabel?: string;
		"aria-label"?: string;
		nativeType?: "button" | "submit";
	}>(),
	{ nativeType: "button" },
);

const resolvedAriaLabel = computed(
	() => props.ariaLabel ?? props["aria-label"] ?? "",
);

const emit = defineEmits<{ click: [] }>();

const attrs = useAttrs();
const userClass = computed(() => attrs.class);
</script>
