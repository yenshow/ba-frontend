<template>
	<button
		v-if="allowed"
		type="button"
		:disabled="disabled"
		:class="[
			size === 'sm' ? 'p-1' : 'p-2',
			'text-rose-400 transition-colors hover:text-rose-300',
			'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-rose-400',
			buttonClass,
		]"
		:title="title"
		:aria-label="ariaLabel ?? title"
		@click="$emit('click', $event)"
	>
		<svg
			:class="size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
			/>
		</svg>
	</button>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		/** 具備刪除權限時才渲染；無權限則不顯示 */
		allowed?: boolean;
		/** 有權限但暫時不可操作 */
		disabled?: boolean;
		title: string;
		ariaLabel?: string;
		buttonClass?: string;
		size?: "sm" | "md";
	}>(),
	{ allowed: true, disabled: false, buttonClass: "", size: "md" },
);

defineEmits<{ click: [event: MouseEvent] }>();
</script>
