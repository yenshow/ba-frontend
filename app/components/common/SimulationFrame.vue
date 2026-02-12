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
							class="cursor-pointer rounded border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-white/50"
							aria-label="關閉完整報表"
							tabindex="0"
							@click="handleClose"
							@keydown.enter="handleClose"
							@keydown.space.prevent="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto pr-5 2xl:pr-6">
						<slot></slot>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
defineProps<{
	modelValue: boolean;
	title: string;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
}>();

const handleClose = () => {
	emit("update:modelValue", false);
};

const handleKeyDown = (e: KeyboardEvent) => {
	if (e.key === "Escape") {
		handleClose();
	}
};

onMounted(() => {
	document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
	document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
.dialog-panel-bg {
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
	color: #f5f9ff;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}
</style>
