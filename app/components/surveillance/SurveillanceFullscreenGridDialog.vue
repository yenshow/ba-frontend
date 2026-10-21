<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] flex flex-col bg-black"
				role="dialog"
				aria-modal="true"
				aria-label="全螢幕監控畫面"
			>
				<div class="flex shrink-0 items-center justify-end bg-black/80 px-4 py-3">
					<button
						type="button"
						class="rounded bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20"
						aria-label="關閉全螢幕"
						@click="handleClose"
					>
						關閉
					</button>
				</div>

				<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
					<SurveillanceCameraGrid
						:cameras="cameras"
						:views="views"
						:layout="layout"
						:is-fullscreen="true"
						:is-playback="isPlayback"
						:is-playing="isPlaying"
						:selected-view-key="selectedViewKey"
						:covering-view-keys="coveringViewKeys"
						class="min-h-0 w-full flex-1"
						@reload="$emit('reload', $event)"
						@select="$emit('select', $event)"
						@need-play="$emit('needPlay')"
					/>
				</div>

				<div v-if="$slots.timeline" class="shrink-0">
					<slot name="timeline" />
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { GridLayout, MonitorView, SurveillanceCamera } from "~/types/surveillance"
import SurveillanceCameraGrid from "~/components/surveillance/SurveillanceCameraGrid.vue"

interface Props {
	modelValue: boolean
	cameras: readonly SurveillanceCamera[]
	views: readonly MonitorView[]
	layout: GridLayout
	isPlayback?: boolean
	isPlaying?: boolean
	selectedViewKey?: string | null
	coveringViewKeys?: readonly string[]
}

const props = withDefaults(defineProps<Props>(), {
	isPlayback: false,
	isPlaying: false,
	selectedViewKey: null,
	coveringViewKeys: () => [],
})

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	reload: [viewKey: string]
	select: [viewKey: string]
	needPlay: []
}>()

const handleClose = () => emit("update:modelValue", false)

const handleKeyDown = (e: KeyboardEvent) => {
	if (!props.modelValue || e.key !== "Escape") return
	e.preventDefault()
	handleClose()
}

watch(
	() => props.modelValue,
	(open) => {
		if (typeof document === "undefined") return
		if (open) {
			document.addEventListener("keydown", handleKeyDown)
			return
		}
		document.removeEventListener("keydown", handleKeyDown)
	},
	{ immediate: true }
)

onBeforeUnmount(() => {
	if (typeof document !== "undefined") {
		document.removeEventListener("keydown", handleKeyDown)
	}
})
</script>
