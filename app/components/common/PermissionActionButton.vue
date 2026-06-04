<template>
	<button
		:type="nativeType"
		:disabled="buttonState.disabled"
		:title="buttonState.title"
		:aria-label="ariaLabel"
		:class="[userClass, buttonState.class, enabledHoverClass && !buttonState.disabled ? enabledHoverClass : '']"
		@click="emit('click')"
	>
		<slot />
	</button>
</template>

<script setup lang="ts">
import { computed, useAttrs, withDefaults } from "vue";
import { usePermissionButtonState } from "~/composables/core/usePermissionUi";

const props = withDefaults(
	defineProps<{
		allowed: boolean;
		ariaLabel: string;
		enabledHoverClass?: string;
		nativeType?: "button" | "submit";
	}>(),
	{ nativeType: "button" },
);

const emit = defineEmits<{ click: [] }>();

const attrs = useAttrs();
const userClass = computed(() => attrs.class);

const buttonState = usePermissionButtonState(() => props.allowed);
</script>
