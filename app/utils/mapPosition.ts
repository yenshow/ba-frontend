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

