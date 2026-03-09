<template>
	<div class="video-player-container relative h-full w-full overflow-hidden">
		<img
			v-if="previewUrl"
			:src="previewUrl"
			alt="攝影機預覽"
			class="mjpeg-frame h-full w-full object-contain bg-black"
			@error="onImgError"
		/>
		<div
			v-else
			class="flex h-full w-full items-center justify-center bg-black text-white/70"
		>
			<p class="text-sm 2xl:text-base">無預覽 URL</p>
		</div>
		<div
			v-if="error"
			class="absolute inset-0 flex items-center justify-center bg-black/80 p-4"
		>
			<p class="text-center text-sm text-red-400 2xl:text-base">{{ error }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	/** MJPEG 預覽 URL（由 GET /api/devices/:id/preview-url 取得） */
	previewUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
	previewUrl: ""
});

const error = ref<string>("");

const onImgError = () => {
	error.value = "預覽載入失敗，請檢查設備連線或權限";
};
</script>

<style scoped>
/* 提升 MJPEG 至獨立合成層，減少主執行緒重繪、緩解卡頓 */
.video-player-container {
	transform: translateZ(0);
}
.mjpeg-frame {
	transform: translateZ(0);
	backface-visibility: hidden;
}
</style>
