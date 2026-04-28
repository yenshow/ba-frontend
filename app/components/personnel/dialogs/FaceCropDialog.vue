<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2100] flex items-center justify-center"
				@keydown.esc.prevent.stop="handleCancel"
			>
				<div
					class="dialog-panel-bg flex w-full max-w-4xl flex-col gap-4 rounded-3xl p-6 2xl:gap-6 2xl:p-8"
					role="dialog"
					aria-modal="true"
					aria-label="裁切大頭照"
				>
					<header class="flex items-center justify-between">
						<div class="space-y-1">
							<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">上傳圖片</h3>
							<p class="text-sm text-white/80 2xl:text-base">
								圖片用於臉型比對或臉型驗證，建議上傳五官清晰正面照。
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
						<div class="mt-4 flex items-center justify-center">
							<div class="relative w-full max-w-[520px]">
								<canvas
									ref="canvasRef"
									class="w-full select-none bg-black/20"
									:class="{ 'opacity-60': isSaving }"
									:width="canvasSize"
									:height="canvasSize"
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
								<div class="pointer-events-none absolute inset-0" aria-hidden="true">
									<!-- Crop frame -->
									<div class="absolute inset-0 ring-1 ring-white/55"></div>
									<div
										class="absolute inset-0 bg-black/30 [mask-image:radial-gradient(ellipse_40%_50%_at_50%_50%,transparent_60%,black_60%)]"
									></div>
								</div>
							</div>
						</div>

						<div class="mt-4 flex justify-center items-center gap-3">
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
const props = defineProps<{
	modelValue: boolean
	file: File | null
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	confirm: [file: File]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const canvasSize = 520
const outputSize = 320
const isSaving = ref(false)
const errorText = ref<string | null>(null)

const imageEl = ref<HTMLImageElement | null>(null)
const imageUrl = ref<string | null>(null)
const isReady = ref(false)

const zoom = ref(1)
const zoomUi = ref(100)
const panX = ref(0)
const panY = ref(0)

const dragState = reactive({
	dragging: false,
	startX: 0,
	startY: 0,
	startPanX: 0,
	startPanY: 0,
	pointerId: -1,
})

const revokeImageUrl = () => {
	if (!imageUrl.value) return
	try {
		URL.revokeObjectURL(imageUrl.value)
	} catch {
		// ignore
	}
	imageUrl.value = null
}

const draw = () => {
	const canvas = canvasRef.value
	const img = imageEl.value
	if (!canvas || !img) return

	const ctx = canvas.getContext("2d")
	if (!ctx) return

	ctx.clearRect(0, 0, canvas.width, canvas.height)

	const baseScale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
	const scale = baseScale * zoom.value

	const cx = canvas.width / 2 + panX.value
	const cy = canvas.height / 2 + panY.value

	const w = img.naturalWidth * scale
	const h = img.naturalHeight * scale
	ctx.imageSmoothingEnabled = true
	ctx.imageSmoothingQuality = "high"
	ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
}

const clampZoom = (next: number) => {
	if (!Number.isFinite(next)) return zoom.value
	return Math.min(3, Math.max(0.1, next))
}

const applyZoomUi = (uiValue: number) => {
	const nextZoom = clampZoom((Number(uiValue) || 100) / 100)
	zoom.value = nextZoom
	zoomUi.value = Math.round(nextZoom * 100)
	draw()
}

const handleZoomUiInput = () => applyZoomUi(zoomUi.value)

const handleWheel = (e: WheelEvent) => {
	if (!isReady.value) return
	const direction = e.deltaY > 0 ? -1 : 1
	const step = 0.08
	const next = clampZoom(zoom.value + direction * step)
	applyZoomUi(Math.round(next * 100))
}

const handlePointerDown = (e: PointerEvent) => {
	if (!isReady.value) return
	const canvas = canvasRef.value
	if (!canvas) return
	dragState.dragging = true
	dragState.pointerId = e.pointerId
	dragState.startX = e.clientX
	dragState.startY = e.clientY
	dragState.startPanX = panX.value
	dragState.startPanY = panY.value
	try {
		canvas.setPointerCapture(e.pointerId)
	} catch {
		// ignore
	}
}

const handlePointerMove = (e: PointerEvent) => {
	if (!dragState.dragging) return
	if (dragState.pointerId !== e.pointerId) return
	const dx = e.clientX - dragState.startX
	const dy = e.clientY - dragState.startY
	panX.value = dragState.startPanX + dx
	panY.value = dragState.startPanY + dy
	draw()
}

const handlePointerUp = (e: PointerEvent) => {
	if (dragState.pointerId !== e.pointerId) return
	dragState.dragging = false
	dragState.pointerId = -1
}

const handleNudge = (dx: number, dy: number) => {
	if (!isReady.value) return
	panX.value += dx
	panY.value += dy
	draw()
}

const handleReset = async () => {
	if (!isReady.value) return
	errorText.value = null
	zoom.value = 1
	zoomUi.value = 100
	panX.value = 0
	panY.value = 0
	draw()
}

const loadFile = async (file: File) => {
	isReady.value = false
	errorText.value = null
	revokeImageUrl()
	imageEl.value = null
	zoom.value = 1
	zoomUi.value = 100
	panX.value = 0
	panY.value = 0

	const url = URL.createObjectURL(file)
	imageUrl.value = url

	const img = new Image()
	img.decoding = "async"
	img.src = url
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve()
		img.onerror = () => reject(new Error("圖片載入失敗"))
	})

	imageEl.value = img
	isReady.value = true
	draw()
}

const createCroppedJpeg = async (): Promise<Blob> => {
	const canvas = canvasRef.value
	const img = imageEl.value
	if (!canvas || !img) throw new Error("尚未載入圖片")

	const baseScale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
	const scale = baseScale * zoom.value
	const cx = canvas.width / 2 + panX.value
	const cy = canvas.height / 2 + panY.value
	const w = img.naturalWidth * scale
	const h = img.naturalHeight * scale

	const imgLeft = cx - w / 2
	const imgTop = cy - h / 2

	const out = document.createElement("canvas")
	out.width = outputSize
	out.height = outputSize
	const outCtx = out.getContext("2d")
	if (!outCtx) throw new Error("無法建立輸出畫布")

	outCtx.imageSmoothingEnabled = true
	outCtx.imageSmoothingQuality = "high"

	// Map output canvas to preview canvas coordinates (square crop = entire preview canvas)
	const sx = (0 - imgLeft) / scale
	const sy = (0 - imgTop) / scale
	const sWidth = canvas.width / scale
	const sHeight = canvas.height / scale

	outCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outputSize, outputSize)

	const qualities = [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56, 0.5]
	for (const q of qualities) {
		const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", q))
		if (!blob) continue
		if (blob.size <= 200 * 1024) return blob
	}

	// Still too large: reduce output size once, then retry
	out.width = 256
	out.height = 256
	const ctx2 = out.getContext("2d")
	if (!ctx2) throw new Error("無法建立輸出畫布")
	ctx2.imageSmoothingEnabled = true
	ctx2.imageSmoothingQuality = "high"
	ctx2.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 256, 256)

	for (const q of qualities.slice(2)) {
		const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", q))
		if (!blob) continue
		if (blob.size <= 200 * 1024) return blob
	}

	throw new Error("圖片壓縮後仍超過 200KB，請改用更小或更清晰的照片")
}

const handleCancel = () => emit("update:modelValue", false)

const handleConfirm = async () => {
	if (!props.file) return
	if (!isReady.value) return
	if (isSaving.value) return

	isSaving.value = true
	errorText.value = null
	try {
		const blob = await createCroppedJpeg()
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
		isReady.value = false
		imageEl.value = null
		revokeImageUrl()
	}
)

watch(
	() => props.file,
	(file) => {
		if (!props.modelValue) return
		if (!file) return
		void loadFile(file).catch(() => {
			// 若載入失敗，直接回到上一層讓使用者重新選擇
			isReady.value = false
		})
	},
	{ immediate: true }
)
</script>
