<template>
	<label
		class="relative inline-flex select-none items-center"
		:class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
	>
		<input
			type="checkbox"
			:checked="locked"
			class="peer sr-only"
			:disabled="disabled"
			:aria-label="`${label} ${locked ? '常開' : '常關'}`"
			@change="emit('change', $event)"
		/>
		<div
			:class="[
				'relative h-7 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/30 transition-colors duration-200 peer-checked:bg-[#5eb8e8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white 2xl:h-8 2xl:w-16',
				disabled ? 'opacity-50' : '',
			]"
		>
			<span
				class="pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold text-white transition-opacity duration-200 2xl:text-[12px]"
				:class="locked ? 'opacity-100' : 'opacity-0'"
			>
				常開
			</span>
			<span
				class="pointer-events-none absolute right-1.5 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold text-white transition-opacity duration-200 2xl:text-[12px]"
				:class="locked ? 'opacity-0' : 'opacity-100'"
			>
				常關
			</span>
			<span
				class="pointer-events-none absolute top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out 2xl:h-6 2xl:w-6"
				:class="
					locked
						? 'left-[calc(100%-1.25rem-0.125rem)] 2xl:left-[calc(100%-1.375rem-0.125rem)]'
						: 'left-0.5'
				"
			/>
		</div>
	</label>
</template>

<script setup lang="ts">
defineProps<{
	label: string
	locked: boolean
	disabled?: boolean
}>()

const emit = defineEmits<{
	(e: "change", event: Event): void
}>()
</script>
