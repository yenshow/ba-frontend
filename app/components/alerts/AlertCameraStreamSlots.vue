<template>
	<div
		:class="[
			'grid h-full min-h-0 w-full flex-1 gap-2',
			isSingleLayout ? 'grid-cols-1 grid-rows-1' : 'grid-cols-2 grid-rows-2',
			paddingClass,
		]"
	>
		<div
			v-for="slot in slots"
			:key="slot.key"
			class="relative min-h-0 overflow-hidden rounded-xl border border-white/10 bg-black"
		>
			<template v-if="slot.stream">
				<div
					class="absolute left-2 top-2 z-10 max-w-[70%] truncate rounded bg-black/60 px-2 py-1 text-xs text-white/90"
				>
					{{ slot.stream.deviceName || `設備 ${slot.stream.deviceId}` }}
				</div>
				<VideoPlayer
					:webrtc-url="slot.stream.webrtcUrl"
					:webrtc-port="slot.stream.webrtcPort"
					:stream-status="slot.stream.streamStatus"
					:external-error="slot.stream.error"
					@reload="emit('reload', slot.stream.deviceId)"
				/>
			</template>
			<div
				v-else
				class="flex h-full w-full items-center justify-center text-sm text-white/40"
				aria-hidden="true"
			>
				空位
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import VideoPlayer from "~/components/surveillance/VideoPlayer.vue"

export type CameraStreamState = {
	deviceId: number
	deviceName: string
	webrtcUrl: string
	webrtcPort?: number
	streamStatus: "running" | "stopped" | "loading" | "error"
	error: string
}

export type CameraStreamSlot = {
	key: string
	stream: CameraStreamState | null
}

interface Props {
	slots: readonly CameraStreamSlot[]
	isSingleLayout: boolean
	/** 彈窗內需留出全螢幕按鈕空間 */
	paddingClass?: string
}

withDefaults(defineProps<Props>(), {
	paddingClass: "",
})

const emit = defineEmits<{
	reload: [deviceId: number]
}>()
</script>
