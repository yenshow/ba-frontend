<template>
	<div class="rounded-xl border border-white/20 bg-white/10 p-4">
		<div class="flex items-center justify-between gap-3">
			<div class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl 2xl:tracking-[6px]">
				{{ label }}
			</div>
			<label
				class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent px-3 py-1.5 text-sm font-light text-white transition-all hover:bg-white/10 2xl:text-base cursor-pointer"
				:aria-label="`上傳：${label}`"
				tabindex="0"
				@keydown.enter.prevent.stop="handleOpenFile"
				@keydown.space.prevent.stop="handleOpenFile"
			>
				<input
					ref="fileInputRef"
					type="file"
					class="hidden"
					:accept="accept"
					@change="handleFileChange"
				/>
				上傳
			</label>
		</div>

		<div class="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/10">
			<video
				v-if="resolvedValue && isVideo"
				:src="resolvedValue"
				class="aspect-[16/9] object-contain max-h-[300px] mx-auto"
				controls
				playsinline
				aria-label="影片預覽"
			/>
			<NuxtImg
				v-else-if="resolvedValue"
				:src="resolvedValue"
				:alt="label"
				class="aspect-[16/9] object-contain max-h-[300px] mx-auto"
			/>
			<div v-else class="flex aspect-[16/9] items-center justify-center text-sm text-white/60">
				尚未設定
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useImageCenter } from "~/composables/core/useImageCenter"

interface Props {
	label: string
	value: string
	accept?: string
}

interface Emits {
	(e: "upload", f: File): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { useDisplaySrc } = useImageCenter()
const resolvedValue = useDisplaySrc(() => props.value)
const fileInputRef = ref<HTMLInputElement | null>(null)

const accept = computed(() => props.accept || "image/*")

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv", "ogg"])

const getUrlExt = (url: string) => {
	if (!url) return ""
	const clean = url.split("?")[0].split("#")[0]
	const parts = clean.split(".")
	if (parts.length < 2) return ""
	return String(parts[parts.length - 1]).toLowerCase()
}

const isVideo = computed(() => VIDEO_EXTS.has(getUrlExt(resolvedValue.value || props.value || "")))

const handleOpenFile = () => {
	fileInputRef.value?.click()
}

const handleFileChange = (e: Event) => {
	const input = e.target as HTMLInputElement
	const file = input.files?.[0] ?? null
	if (!file) return
	emit("upload", file)
	input.value = ""
}
</script>
