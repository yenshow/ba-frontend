<template>
	<div class="rounded-xl border border-white/20 bg-white/10 p-4">
		<div class="flex items-center justify-between gap-3">
			<div class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl 2xl:tracking-[6px]">
				{{ label }}
			</div>
			<label
				class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent px-3 py-1.5 text-sm font-light text-white transition-all hover:bg-white/10 2xl:text-base cursor-pointer"
				aria-label="上傳圖片"
				tabindex="0"
				@keydown.enter.prevent.stop="handleOpenFile"
				@keydown.space.prevent.stop="handleOpenFile"
			>
				<input
					ref="fileInputRef"
					type="file"
					class="hidden"
					accept="image/*"
					@change="handleFileChange"
				/>
				上傳
			</label>
		</div>

		<div class="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/10">
			<img
				v-if="resolvedValue"
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
import { resolveUploadUrl } from "~/utils/apiUtils"

interface Props {
	label: string
	value: string
}

interface Emits {
	(e: "upload", f: File): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { apiBase } = useRuntimeConfig().public as { apiBase: string }
const fileInputRef = ref<HTMLInputElement | null>(null)

const resolvedValue = computed(() => resolveUploadUrl(props.value, apiBase))

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
