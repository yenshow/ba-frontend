<template>
	<Teleport to="body">
		<Transition name="lightbox-fade">
			<div
				v-if="imageUrl"
				ref="dialogRef"
				class="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 p-4"
				role="dialog"
				aria-modal="true"
				:aria-label="ariaLabel"
				tabindex="-1"
				@click.self="handleClose"
				@keydown.escape="handleClose"
			>
				<button
					type="button"
					class="absolute right-4 top-4 z-10 rounded-full monitoring-chip-bg p-2 text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
					aria-label="關閉"
					@click="handleClose"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
				<img
					:src="imageUrl"
					:alt="alt"
					class="max-h-[90vh] max-w-full object-contain"
					@click.stop
				/>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue"

const props = withDefaults(
	defineProps<{
		imageUrl: string | null
		alt?: string
		ariaLabel?: string
	}>(),
	{
		alt: "圖片",
		ariaLabel: "圖片放大檢視",
	},
)

const emit = defineEmits<{
	close: []
}>()

const dialogRef = ref<HTMLElement | null>(null)

watch(
	() => props.imageUrl,
	(url) => {
		if (!url) return
		nextTick(() => dialogRef.value?.focus())
	},
)

const handleClose = () => emit("close")
</script>
