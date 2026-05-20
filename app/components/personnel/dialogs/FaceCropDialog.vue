<template>
	<ImageCropDialog
		:model-value="modelValue"
		:file="file"
		title="上傳圖片"
		description="圖片用於臉型比對或臉型驗證，建議上傳五官清晰正面照。"
		:canvas-width="520"
		:canvas-height="520"
		mask="ellipse"
		:max-output-bytes="200 * 1024"
		:output-max-long-edge="320"
		@update:model-value="emit('update:modelValue', $event)"
		@confirm="handleConfirm"
	/>
</template>

<script setup lang="ts">
import ImageCropDialog from "~/components/common/ImageCropDialog.vue"

const props = defineProps<{
	modelValue: boolean
	file: File | null
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	confirm: [file: File]
}>()

const handleConfirm = (file: File) => emit("confirm", file)
</script>
