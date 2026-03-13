<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] bg-black"
				role="dialog"
				aria-modal="true"
				aria-label="全螢幕監控畫面"
				@click.self="handleClose"
			>
				<div class="absolute inset-0 p-2 sm:p-3">
					<SurveillanceCameraGrid
						:cameras="cameras"
						:views="views"
						:layout="layout"
						:is-fullscreen="true"
						class="h-full w-full"
						@remove="$emit('remove', $event)"
					/>
				</div>

				<button
					type="button"
					class="absolute right-3 top-3 z-[1] rounded bg-black/60 px-3 py-2 text-sm text-white/90 backdrop-blur hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white/60"
					aria-label="關閉全螢幕"
					@click="handleClose"
					@keydown.enter.prevent="handleClose"
					@keydown.space.prevent="handleClose"
				>
					關閉
				</button>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import type { GridLayout, MonitorView, SurveillanceCamera } from "~/types/surveillance";
import SurveillanceCameraGrid from "~/components/surveillance/SurveillanceCameraGrid.vue";

interface Props {
	modelValue: boolean;
	cameras: readonly SurveillanceCamera[];
	views: readonly MonitorView[];
	layout: GridLayout;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	remove: [deviceId: number];
}>();

const handleClose = () => emit("update:modelValue", false);

const handleKeyDown = (e: KeyboardEvent) => {
	if (!props.modelValue) return;
	if (e.key !== "Escape") return;
	e.preventDefault();
	handleClose();
};

onMounted(() => {
	if (typeof document === "undefined") return;
	document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
	if (typeof document === "undefined") return;
	document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.18s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}
</style>

