<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				:aria-label="title"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-6xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-7xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ title }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
							aria-label="關閉完整報表"
							tabindex="0"
							@click="handleClose"
							@keydown.enter="handleClose"
							@keydown.space.prevent="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar flex-1 min-h-0 overflow-y-auto pr-5 2xl:pr-6">
						<slot></slot>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
defineProps<{
	modelValue: boolean
	title: string
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const handleClose = () => {
	emit("update:modelValue", false)
}

const handleKeyDown = (e: KeyboardEvent) => {
	if (e.key === "Escape") {
		handleClose()
	}
}

onMounted(() => {
	document.addEventListener("keydown", handleKeyDown)
})

onBeforeUnmount(() => {
	document.removeEventListener("keydown", handleKeyDown)
})
</script>

<style scoped>
</style>
