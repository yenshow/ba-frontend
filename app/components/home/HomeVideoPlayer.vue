<template>
	<div class="group flex justify-center">
		<div class="relative aspect-video w-full max-w-[710px]">
			<!-- YouTube 嵌入 -->
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
			<!-- 直接影片連結或上傳檔案 -->
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
			<!-- 無設定時佔位 -->
			<div
				v-else
				class="flex h-full w-full items-center justify-center rounded-lg border-2 border-white/20 bg-white/5 text-white/60"
			>
				請新增影片連結或上傳影片
			</div>

			<PermissionActionButton
					:allowed="canWrite"
					aria-label="編輯影片"
					class="absolute right-0 top-0 z-10 rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur transition hover:bg-black/50 2xl:text-base"
					enabled-hover-class="hover:bg-black/50"
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
import EditMockDialog from "~/components/common/EditMockDialog.vue";
import { useAppSettings, VIDEO_UPLOAD_HINT } from "~/composables/core/useAppSettings";
import { useImageCenter } from "~/composables/core/useImageCenter";
import { createSafeFileName } from "~/utils/fileUtils";
import { useAuth } from "~/composables/core/useAuth";
import { useHomeRbac } from "~/composables/core/useModuleRbac";

const {
	value: videoSrcRaw,
	save: saveVideoSrc,
	reset: resetVideoSrc,
	uploadFile: uploadVideo
} = useAppSettings({
	key: "home_video_src",
	defaultValue: ""
});

const { canWrite } = useHomeRbac();

const isEditOpen = ref(false);
const videoRef = ref<HTMLVideoElement | null>(null);
const { useDisplaySrc } = useImageCenter();
const videoDisplaySrc = useDisplaySrc(() => videoSrcRaw.value ?? "");

/** 影片結束時重播（搭配 loop，確保自動重播） */
const handleVideoEnded = () => {
	const el = videoRef.value;
	if (el) {
		el.currentTime = 0;
		el.play().catch(() => {});
	}
};

/** 是否為 YouTube 連結（嵌入或觀看網址） */
const isYouTube = computed(() => {
	const src = videoSrcRaw.value?.trim() ?? "";
	return src.includes("youtube.com") || src.includes("youtu.be");
});

/**
 * 從儲存值取得 YouTube 嵌入網址（支援 watch / youtu.be，並加上 autoplay&loop）
 */
const youtubeEmbedSrc = computed(() => {
	const raw = videoSrcRaw.value?.trim() ?? "";
	if (!raw) return "";

	let videoId = "";

	// 已是 embed 網址
	const embedMatch = raw.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
	if (embedMatch) {
		videoId = embedMatch[1];
		// 保留既有 query，補上 autoplay&mute&loop&playlist
		const url = new URL(raw);
		url.searchParams.set("autoplay", "1");
		url.searchParams.set("mute", "1");
		url.searchParams.set("loop", "1");
		url.searchParams.set("playlist", videoId);
		return url.toString();
	}

	// watch 網址
	const watchMatch = raw.match(/[?&]v=([a-zA-Z0-9_-]+)/);
	if (watchMatch) {
		videoId = watchMatch[1];
	}
	// youtu.be 短網址
	const shortMatch = raw.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
	if (shortMatch) {
		videoId = shortMatch[1];
	}

	if (!videoId) return raw;

	return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
});

const handleUploadVideo = async (file: File) => {
	try {
		const safeFile = createSafeFileName("home-video", file, "mp4");
		await uploadVideo(safeFile);
		isEditOpen.value = false;
	} catch (error) {
		console.error("Upload video failed:", error);
	}
};
</script>
