<template>
	<Transition name="fade">
		<div
			v-if="hasChanges"
			class="flex items-center gap-2 rounded-lg border bg-amber-500/20 px-3 py-2 border-amber-500/30"
		>
			<svg class="h-4 w-4 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/>
			</svg>
			<span class="text-sm font-medium text-amber-300">
				{{ message || `有 ${changedFields.length} 個欄位已修改` }}
			</span>
			<button
				v-if="showReset"
				type="button"
				class="ml-auto text-xs text-amber-400 underline transition-colors hover:text-amber-300"
				@click="$emit('reset')"
			>
				重置
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

withDefaults(defineProps<Props>(), {
	showReset: false
});

defineEmits<{
	(e: "reset"): void;
}>();
</script>
