<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3100] flex items-center justify-center"
				role="dialog"
				aria-modal="true"
				:aria-label="title"
				@keydown.esc.prevent.stop="handleCancel"
			>
				<div
					class="dialog-panel-bg flex w-full max-w-4xl flex-col gap-4 rounded-3xl p-6 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between">
						<div class="space-y-1">
							<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
								{{ title }}
							</h3>
							<p v-if="description" class="text-sm text-white/80 2xl:text-base">
								{{ description }}
							</p>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleCancel"
						>
							&times;
						</button>
					</header>

					<div class="rounded-2xl border border-white/15 bg-white/5 p-4">
						<div class="mt-2 flex items-center justify-center">
							<div
								class="crop-checkerboard relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-lg shadow-[inset_0_0_0_3px_rgba(56,189,248,0.95)]"
							>
								<canvas
									ref="canvasRef"
									class="aspect-square h-auto w-full select-none bg-transparent"
									:class="{ 'opacity-60': isSaving }"
									:width="canvasWidth"
									:height="canvasHeight"
									aria-label="裁切區域"
									tabindex="0"
									@pointerdown="handlePointerDown"
									@pointermove="handlePointerMove"
									@pointerup="handlePointerUp"
									@pointercancel="handlePointerUp"
									@wheel.prevent="handleWheel"
									@keydown.up.prevent="handleNudge(0, -6)"
									@keydown.down.prevent="handleNudge(0, 6)"
									@keydown.left.prevent="handleNudge(-6, 0)"
									@keydown.right.prevent="handleNudge(6, 0)"
								/>
								<div
									v-if="guideOverlay === 'face'"
									class="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-4 text-sky-200/85"
									aria-hidden="true"
								>
									<svg
										class="absolute inset-[10%] h-[80%] w-[80%] text-sky-300/40"
										viewBox="0 0 100 100"
										preserveAspectRatio="xMidYMid meet"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<ellipse cx="50" cy="40" rx="21" ry="25" stroke="currentColor" stroke-width="1.6" />
										<path
											d="M24 78 Q50 58 76 78"
											stroke="currentColor"
											stroke-width="1.6"
											stroke-linecap="round"
										/>
									</svg>
									<span class="relative z-[1] rounded bg-zinc-950/70 px-2 py-0.5 text-[10px] 2xl:text-xs">
										人臉大小參考（非裁切邊界）
									</span>
								</div>
								<div
									v-else-if="mask === 'ellipse'"
									class="pointer-events-none absolute inset-0"
									aria-hidden="true"
								>
									<div class="absolute inset-0 ring-2 ring-white/55" />
									<div
										class="absolute inset-0 bg-black/30 [mask-image:radial-gradient(ellipse_40%_50%_at_50%_50%,transparent_99%,black_100%)] [-webkit-mask-image:radial-gradient(ellipse_40%_50%_at_50%_50%,transparent_99%,black_100%)]"
									/>
								</div>
							</div>
						</div>
						<p
							v-if="cropHint"
							class="mt-3 text-center text-xs text-white/65 2xl:text-sm"
						>
							{{ cropHint }}
						</p>

						<div class="mt-4 flex items-center justify-center gap-3">
							<label class="flex items-center gap-3">
								<span class="shrink-0 text-sm text-white/70 2xl:text-base">縮放</span>
								<input
									v-model.number="zoomUi"
									type="range"
									min="10"
									max="300"
									step="1"
									class="w-full md:w-[260px]"
									:disabled="!isReady || isSaving"
									aria-label="縮放"
									@input="handleZoomUiInput"
								/>
							</label>
							<button
								type="button"
								class="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
								:disabled="!isReady || isSaving"
								@click="handleReset"
							>
								重設
							</button>
						</div>
					</div>

					<footer class="mt-2 flex flex-wrap items-center gap-3 2xl:gap-4">
						<button type="button" class="btn-secondary" :disabled="isSaving" @click="handleCancel">
							取消
						</button>
						<p
							v-if="errorText"
							class="min-w-[220px] flex-1 self-center text-xs text-rose-200/90 2xl:text-sm"
							role="alert"
							aria-live="polite"
						>
							{{ errorText }}
						</p>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:disabled="!isReady || isSaving"
							@click="handleConfirm"
						>
							{{ isSaving ? "儲存中..." : "儲存" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { useImageCrop, type ImageCropInitialFit, type ImageCropMask } from "~/composables/core/useImageCrop"

export type ImageCropGuideOverlay = "none" | "face"

const props = withDefaults(
	defineProps<{
		modelValue: boolean
		file: File | null
		title?: string
		description?: string
		canvasWidth: number
		canvasHeight: number
		mask?: ImageCropMask
		guideOverlay?: ImageCropGuideOverlay
		cropHint?: string
		initialFit?: ImageCropInitialFit
		maxOutputBytes?: number
		outputMaxLongEdge?: number
	}>(),
	{
		title: "裁切圖片",
		description: "",
		mask: "rect",
		guideOverlay: "none",
		cropHint: "",
		initialFit: "contain",
		maxOutputBytes: undefined,
		outputMaxLongEdge: 1280,
	}
)

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	confirm: [file: File]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const {
	isSaving,
	errorText,
	isReady,
	zoomUi,
	applyZoomUi,
	handleWheel,
	handlePointerDown,
	handlePointerMove,
	handlePointerUp,
	handleNudge,
	handleReset,
	loadFile,
	createCroppedBlob,
	revokeImageUrl,
} = useImageCrop({
	canvasRef,
	getCanvasSize: () => ({ width: props.canvasWidth, height: props.canvasHeight }),
	outputMaxLongEdge: props.outputMaxLongEdge ?? 1280,
	maxOutputBytes: props.maxOutputBytes,
	initialFit: props.initialFit,
})

const handleZoomUiInput = () => applyZoomUi(zoomUi.value)

const handleCancel = () => emit("update:modelValue", false)

const handleConfirm = async () => {
	if (!props.file) return
	if (!isReady.value) return
	if (isSaving.value) return

	isSaving.value = true
	errorText.value = null
	try {
		const blob = await createCroppedBlob("image/jpeg")
		const nextFile = new File([blob], props.file.name.replace(/\.(png|webp|jpeg|jpg)$/i, ".jpg"), {
			type: "image/jpeg",
		})
		emit("confirm", nextFile)
		emit("update:modelValue", false)
	} catch (err) {
		const msg = err instanceof Error ? err.message : "儲存失敗，請稍後再試"
		errorText.value = msg
	} finally {
		isSaving.value = false
	}
}

watch(
	() => props.modelValue,
	(v) => {
		if (v) return
		errorText.value = null
		revokeImageUrl()
	}
)

watch(
	() => props.file,
	(file) => {
		if (!props.modelValue) return
		if (!file) return
		void loadFile(file).catch(() => {
			// ignore
		})
	},
	{ immediate: true }
)
</script>

<style scoped>
.crop-checkerboard {
	background-color: rgb(9 9 11);
	background-image:
		linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.08) 75%),
		linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.08) 75%);
	background-size: 16px 16px;
	background-position:
		0 0,
		8px 8px;
}
</style>
