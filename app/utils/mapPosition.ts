export type PercentPosition = { x: number; y: number }

export const isValidPercentPosition = (
	position: PercentPosition | undefined | null
): position is PercentPosition => {
	return (
		position != null &&
		typeof position.x === "number" &&
		typeof position.y === "number" &&
		!Number.isNaN(position.x) &&
		!Number.isNaN(position.y)
	)
}

export const toCssPercentStyle = (
	position: PercentPosition | undefined | null
): { left: string; top: string } | {} => {
	if (!isValidPercentPosition(position)) return {}
	return { left: `${position.x}%`, top: `${position.y}%` }
}

const clampPercent = (n: number) => Math.max(0, Math.min(100, n))

/**
 * 將指標座標轉成平面圖容器內的百分比（與 category-dot-wrapper 的 left/top% 同一座標系）。
 * 使用 getBoundingClientRect，避免 padding／縮放造成落點與顯示偏移。
 */
export const percentPositionFromClientPoint = (
	container: HTMLElement,
	clientX: number,
	clientY: number
): PercentPosition => {
	const rect = container.getBoundingClientRect()
	const w = rect.width || 1
	const h = rect.height || 1
	return {
		x: clampPercent(((clientX - rect.left) / w) * 100),
		y: clampPercent(((clientY - rect.top) / h) * 100),
	}
}

