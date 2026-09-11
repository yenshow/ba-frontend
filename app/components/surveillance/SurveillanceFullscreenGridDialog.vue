<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] bg-black"
				role="dialog"
				aria-modal="true"
				aria-label="全螢幕監控畫面"
				@pointermove="handlePointerActivity"
				@pointerdown="handlePointerActivity"
			>
				<div class="absolute inset-0 p-0.5">
					<SurveillanceCameraGrid
						:cameras="cameras"
						:views="views"
						:layout="layout"
						:is-fullscreen="true"
						class="h-full w-full"
						@reload="$emit('reload', $event)"
					/>
				</div>

				<button
					type="button"
					:class="[
						'absolute bottom-4 left-1/2 z-[1] -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-sm text-white/90 backdrop-blur transition-opacity hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white/60',
						controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
					]"
					:aria-hidden="!controlsVisible"
					:tabindex="controlsVisible ? 0 : -1"
					aria-label="關閉全螢幕"
					@click="handleClose"
				>
					關閉
				</button>
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
}

const props = defineProps<Props>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	reload: [deviceId: number]
}>()

const CONTROLS_IDLE_MS = 2000
const controlsVisible = ref(true)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const clearHideTimer = () => {
	if (!hideTimer) return
	clearTimeout(hideTimer)
	hideTimer = null
}

const scheduleHideControls = () => {
	clearHideTimer()
	hideTimer = setTimeout(() => {
		controlsVisible.value = false
		hideTimer = null
	}, CONTROLS_IDLE_MS)
}

const handlePointerActivity = () => {
	if (!props.modelValue) return
	controlsVisible.value = true
	scheduleHideControls()
}

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
			controlsVisible.value = true
			scheduleHideControls()
			document.addEventListener("keydown", handleKeyDown)
			return
		}
		clearHideTimer()
		document.removeEventListener("keydown", handleKeyDown)
	},
	{ immediate: true }
)

onBeforeUnmount(() => {
	clearHideTimer()
	if (typeof document !== "undefined") {
		document.removeEventListener("keydown", handleKeyDown)
	}
})
</script>
