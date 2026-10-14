<template>
	<Transition name="fade">
		<div
			v-if="hasChanges"
			class="flex max-w-md items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-2"
			:title="detailTitle"
			role="status"
			:aria-label="displayMessage"
		>
			<svg class="h-4 w-4 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/>
			</svg>
			<span class="truncate text-sm font-medium text-amber-300">
				{{ displayMessage }}
			</span>
			<button
				v-if="showReset"
				type="button"
				class="ml-auto flex-shrink-0 text-xs text-amber-400 underline transition-colors hover:text-amber-300"
				aria-label="捨棄未儲存的變更"
				@click="$emit('reset')"
			>
				捨棄
			</button>
		</div>
	</Transition>
</template>

<script setup lang="ts">
interface Props {
	hasChanges: boolean;
	changedFields: string[];
	message?: string;
	showReset?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	showReset: false
});

defineEmits<{
	(e: "reset"): void;
}>();

const displayMessage = computed(() => {
	if (props.message) return props.message;
	const count = props.changedFields.length;
	if (count === 0) return "有未儲存的變更";
	return `有 ${count} 個欄位尚未儲存`;
});

const detailTitle = computed(() => {
	if (props.changedFields.length === 0) return displayMessage.value;
	return props.changedFields.join("、");
});
</script>
