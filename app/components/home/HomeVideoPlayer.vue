<template>
	<div class="flex justify-center">
		<div class="group relative aspect-video w-full max-w-[710px]">
			<iframe
				v-if="isYouTube"
				class="h-full w-full rounded-lg"
				:src="youtubeEmbedSrc"
				title="YouTube video player"
				frameborder="0"
				allow="
					accelerometer;
					autoplay;
					clipboard-write;
					encrypted-media;
					gyroscope;
					picture-in-picture;
					web-share;
				"
				referrerpolicy="strict-origin-when-cross-origin"
				allowfullscreen
			/>
			<video
				v-else-if="videoDisplaySrc"
				ref="videoRef"
				class="h-full w-full rounded-lg object-contain"
				:src="videoDisplaySrc"
				controls
				autoplay
				muted
				loop
				playsinline
				@ended="handleVideoEnded"
			/>
			<div
				v-else
				class="flex h-full w-full items-center justify-center rounded-lg border-2 border-white/20 bg-white/5 text-white/60"
			>
				請新增影片網址或上傳影片
			</div>

			<PermissionActionButton
				:allowed="canWrite"
				aria-label="編輯影片"
				class="absolute right-0 top-0 z-10 rounded-full bg-black/30 px-3 py-1 text-sm text-white opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 enabled:hover:bg-black/50 group-hover:opacity-100 2xl:text-base"
				@click="isEditOpen = true"
			>
				編輯
			</PermissionActionButton>
		</div>

		<EditMockDialog
			v-model="isEditOpen"
			title="編輯影片"
			:value="videoSrcRaw"
			input-mode="video"
			placeholder="例如：https://www.youtube.com/embed/xxx"
			:hint="VIDEO_UPLOAD_HINT"
			@save="saveVideoSrc"
			@reset="resetVideoSrc"
			@upload="handleUploadVideo"
		/>
	</div>
</template>

<script setup lang="ts">
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import EditMockDialog from "~/components/common/EditMockDialog.vue"
import { useAppSettingUpload, VIDEO_UPLOAD_HINT } from "~/composables/core/useAppSettings"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { useHomeRbac } from "~/composables/core/useAccessGate"

const {
	raw: videoSrcRaw,
	save: saveVideoSrc,
	reset: resetVideoSrc,
	isEditOpen,
	handleUpload: handleUploadVideo,
} = useAppSettingUpload({
	key: "home_video_src",
	uploadPrefix: "home-video",
	defaultExt: "mp4",
})

const { canWrite } = useHomeRbac()
const videoRef = ref<HTMLVideoElement | null>(null)
const { useDisplaySrc } = useImageCenter()
const videoDisplaySrc = useDisplaySrc(() => videoSrcRaw.value ?? "")

const handleVideoEnded = () => {
	const el = videoRef.value
	if (el) {
		el.currentTime = 0
		el.play().catch(() => {})
	}
}

const isYouTube = computed(() => {
	const src = videoSrcRaw.value?.trim() ?? ""
	return src.includes("youtube.com") || src.includes("youtu.be")
})

const youtubeEmbedSrc = computed(() => {
	const raw = videoSrcRaw.value?.trim() ?? ""
	if (!raw) return ""

	let videoId = ""

	const embedMatch = raw.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/)
	if (embedMatch) {
		videoId = embedMatch[1]
		const url = new URL(raw)
		url.searchParams.set("autoplay", "1")
		url.searchParams.set("mute", "1")
		url.searchParams.set("loop", "1")
		url.searchParams.set("playlist", videoId)
		return url.toString()
	}

	const watchMatch = raw.match(/[?&]v=([a-zA-Z0-9_-]+)/)
	if (watchMatch) {
		videoId = watchMatch[1]
	}
	const shortMatch = raw.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
	if (shortMatch) {
		videoId = shortMatch[1]
	}

	if (!videoId) return raw

	return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`
})
</script>
