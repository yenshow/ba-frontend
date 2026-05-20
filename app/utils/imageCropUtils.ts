/** 裁切預覽 canvas 基準寬度 */
export const CROP_CANVAS_BASE_WIDTH = 520

/** 各首頁圖片欄位建議裁切比例（寬:高） */
export const HOME_IMAGE_CROP = {
	/** Construction 頁首專案圖（橫幅、配合 h-28 展示區） */
	constructionProjectHeader: 4,
	/** 人員大頭照 */
	facePortrait: 1,
} as const

export const getCropCanvasSize = (aspectRatio?: number, baseWidth = CROP_CANVAS_BASE_WIDTH) => {
	const width = baseWidth
	const ratio = Number(aspectRatio)
	if (!ratio || !Number.isFinite(ratio) || ratio <= 0) {
		return { width, height: width }
	}
	return { width, height: Math.max(120, Math.round(width / ratio)) }
}

export const formatCropAspectLabel = (aspectRatio?: number) => {
	const ratio = Number(aspectRatio)
	if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return "自由比例"
	if (Math.abs(ratio - 16 / 9) < 0.02) return "16:9"
	if (Math.abs(ratio - 4 / 3) < 0.02) return "4:3"
	if (Math.abs(ratio - 3) < 0.02) return "3:1"
	if (Math.abs(ratio - 4) < 0.02) return "4:1"
	if (Math.abs(ratio - 1) < 0.02) return "1:1"
	return `${ratio.toFixed(2).replace(/\.?0+$/, "")}:1`
}
