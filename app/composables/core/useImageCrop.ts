export type ImageCropMask = "rect" | "ellipse"
export type ImageCropInitialFit = "contain" | "cover"

export type UseImageCropOptions = {
	canvasRef: Ref<HTMLCanvasElement | null>
	getCanvasSize: () => { width: number; height: number }
	outputMaxLongEdge: number
	maxOutputBytes?: number
	/** 初始縮放：contain 完整顯示；cover 填滿裁切框（大頭照建議 cover） */
	initialFit?: ImageCropInitialFit
}

export const useImageCrop = (options: UseImageCropOptions) => {
	const {
		canvasRef,
		getCanvasSize,
		outputMaxLongEdge,
		maxOutputBytes,
		initialFit = "contain",
	} = options

	const getBaseScale = (
		canvasW: number,
		canvasH: number,
		imgW: number,
		imgH: number,
	) =>
		initialFit === "cover"
			? Math.max(canvasW / imgW, canvasH / imgH)
			: Math.min(canvasW / imgW, canvasH / imgH)

	const syncCanvasDimensions = () => {
		const canvas = canvasRef.value
		if (!canvas) return
		const { width, height } = getCanvasSize()
		if (canvas.width !== width) canvas.width = width
		if (canvas.height !== height) canvas.height = height
	}

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

	const clampZoom = (next: number) => {
		if (!Number.isFinite(next)) return zoom.value
		return Math.min(3, Math.max(0.1, next))
	}

	const clampPanToCoverCanvas = (scale: number, imgNaturalW: number, imgNaturalH: number) => {
		const canvas = canvasRef.value
		if (!canvas) return
		const w = imgNaturalW * scale
		const h = imgNaturalH * scale
		const maxPanX = Math.max(0, (w - canvas.width) / 2)
		const maxPanY = Math.max(0, (h - canvas.height) / 2)
		panX.value = Math.min(maxPanX, Math.max(-maxPanX, panX.value))
		panY.value = Math.min(maxPanY, Math.max(-maxPanY, panY.value))
	}

	const draw = () => {
		syncCanvasDimensions()
		const canvas = canvasRef.value
		const img = imageEl.value
		if (!canvas || !img) return

		const ctx = canvas.getContext("2d")
		if (!ctx) return

		ctx.clearRect(0, 0, canvas.width, canvas.height)

		const baseScale = getBaseScale(
			canvas.width,
			canvas.height,
			img.naturalWidth,
			img.naturalHeight,
		)
		const scale = baseScale * zoom.value

		clampPanToCoverCanvas(scale, img.naturalWidth, img.naturalHeight)

		const cx = canvas.width / 2 + panX.value
		const cy = canvas.height / 2 + panY.value

		const w = img.naturalWidth * scale
		const h = img.naturalHeight * scale

		ctx.imageSmoothingEnabled = true
		ctx.imageSmoothingQuality = "high"
		ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
	}

	const applyZoomUi = (uiValue: number) => {
		const nextZoom = clampZoom((Number(uiValue) || 100) / 100)
		zoom.value = nextZoom
		zoomUi.value = Math.round(nextZoom * 100)
		draw()
	}

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

	const handleReset = () => {
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
		syncCanvasDimensions()

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

	const createCroppedBlob = async (mime: "image/jpeg" | "image/png"): Promise<Blob> => {
		syncCanvasDimensions()
		const canvas = canvasRef.value
		const img = imageEl.value
		if (!canvas || !img) throw new Error("尚未載入圖片")

		const baseScale = getBaseScale(
			canvas.width,
			canvas.height,
			img.naturalWidth,
			img.naturalHeight,
		)
		const scale = baseScale * zoom.value
		const cx = canvas.width / 2 + panX.value
		const cy = canvas.height / 2 + panY.value
		const w = img.naturalWidth * scale
		const h = img.naturalHeight * scale

		const imgLeft = cx - w / 2
		const imgTop = cy - h / 2

		const maxEdge = Math.max(canvas.width, canvas.height)
		const ratio = outputMaxLongEdge / maxEdge
		const outW = Math.max(1, Math.round(canvas.width * ratio))
		const outH = Math.max(1, Math.round(canvas.height * ratio))

		const out = document.createElement("canvas")
		out.width = outW
		out.height = outH
		const outCtx = out.getContext("2d")
		if (!outCtx) throw new Error("無法建立輸出畫布")

		outCtx.imageSmoothingEnabled = true
		outCtx.imageSmoothingQuality = "high"
		outCtx.fillStyle = "#ffffff"
		outCtx.fillRect(0, 0, outW, outH)

		const sx = (0 - imgLeft) / scale
		const sy = (0 - imgTop) / scale
		const sWidth = canvas.width / scale
		const sHeight = canvas.height / scale
		outCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outW, outH)

		if (mime === "image/png") {
			const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"))
			if (!blob) throw new Error("輸出失敗，請稍後再試")
			return blob
		}

		const qualities = [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56, 0.5, 0.44, 0.38]
		for (const q of qualities) {
			const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", q))
			if (!blob) continue
			if (!maxOutputBytes || blob.size <= maxOutputBytes) return blob
		}

		if (!maxOutputBytes) {
			const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.8))
			if (blob) return blob
			throw new Error("輸出失敗，請稍後再試")
		}

		throw new Error(`圖片壓縮後仍超過 ${Math.round(maxOutputBytes / 1024)}KB，請改用更小或更清晰的照片`)
	}

	return {
		isSaving,
		errorText,
		isReady,
		zoomUi,
		syncCanvasDimensions,
		draw,
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
	}
}

