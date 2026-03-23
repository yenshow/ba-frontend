/** 解析 #RRGGBB 或 #RGB */
export const parseHexRgb = (hex: string): { r: number; g: number; b: number } => {
	const raw = hex.replace("#", "")
	const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw
	return {
		r: Number.parseInt(full.slice(0, 2), 16),
		g: Number.parseInt(full.slice(2, 4), 16),
		b: Number.parseInt(full.slice(4, 6), 16),
	}
}

export const hexToRgba = (hex: string, alpha: number): string => {
	const { r, g, b } = parseHexRgb(hex)
	return `rgba(${r},${g},${b},${alpha})`
}

/** sRGB 相對亮度（WCAG），用於淺／深底對比 */
export const hexRelativeLuminance = (hex: string): number => {
	const { r, g, b } = parseHexRgb(hex)
	const lin = (c: number) => {
		const x = c / 255
		return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
	}
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
