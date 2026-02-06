<template>
	<div
		class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-white/20 bg-white/10 p-4"
	>
		<div class="text-base font-medium text-white 2xl:text-lg">{{ plateLicense || "－" }}</div>
		<div class="relative h-32 w-48 overflow-hidden rounded bg-white/5 2xl:h-40 2xl:w-56">
			<!-- 載入中 -->
			<Transition name="fade">
				<div
					v-if="isLoading"
					key="loading"
					class="absolute inset-0 flex items-center justify-center bg-white/5"
				>
					<div
						class="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
					></div>
				</div>
			</Transition>
			<!-- 圖片 -->
			<Transition name="fade">
				<img
					v-if="resolvedImageUrl && !isLoading && !imageError"
					key="image"
					:src="resolvedImageUrl"
					:alt="`車牌 ${plateLicense} 圖片`"
					class="absolute inset-0 h-full w-full object-contain"
					loading="lazy"
					@error="handleImageError"
				/>
			</Transition>
			<!-- 佔位符 -->
			<Transition name="fade">
				<div
					v-if="(!resolvedImageUrl || imageError) && !isLoading"
					key="placeholder"
					class="absolute inset-0 flex items-center justify-center text-white/50"
				>
					<svg class="h-12 w-12 2xl:h-16 2xl:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</div>
			</Transition>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useExternalDataApi } from "~/composables/systems/useExternalDataApi";
import { convertBase64ToImageUrl } from "~/utils/imageUtils";

interface Props {
	plateLicense: string;
	/** 原始圖片 URL／URI（vsm:// 等需經 API 解析，與人流統計相同） */
	rawImageUrl?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
	rawImageUrl: null
});

const { getPictureByUri } = useExternalDataApi();
const resolvedImageUrl = ref<string>("");
const isLoading = ref(false);
const imageError = ref(false);

const isDirectUrl = (url: string): boolean =>
	url.startsWith("http://") || url.startsWith("https://");

const loadImage = async () => {
	const url = props.rawImageUrl?.trim();
	resolvedImageUrl.value = "";
	imageError.value = false;
	if (!url) return;

	if (isDirectUrl(url)) {
		resolvedImageUrl.value = url;
		return;
	}

	// 非 http(s) 的 URI（如 vsm://）經 API 解析，與人流統計相同
	isLoading.value = true;
	try {
		const result = await getPictureByUri(url);
		if (result.success && result.data?.image) {
			resolvedImageUrl.value = convertBase64ToImageUrl(result.data.image);
		}
	} catch {
		imageError.value = true;
	} finally {
		isLoading.value = false;
	}
};

const handleImageError = () => {
	imageError.value = true;
};

watch(
	() => props.rawImageUrl,
	() => loadImage(),
	{ immediate: true }
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
