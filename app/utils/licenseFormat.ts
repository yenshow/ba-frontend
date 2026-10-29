export const toNonNegativeInt = (value: unknown) => {
	const n = Number(value)
	if (!Number.isFinite(n)) return null
	return Math.max(0, Math.floor(n))
}

export const formatMaxDevicesText = (maxRaw: unknown) => {
	const max = toNonNegativeInt(maxRaw)
	return max == null ? "—" : String(max)
}

export const normalizeMaxDevices = (maxRaw: unknown) => {
	const max = toNonNegativeInt(maxRaw)
	return { max, text: max == null ? "—" : String(max) }
}

export type QuotaUnitKind = "devices" | "points" | "elevator" | "none"

export const formatQuotaUsedText = (
	kind: QuotaUnitKind,
	usedRaw: unknown,
	usedPointsRaw?: unknown
) => {
	if (kind === "none") return "—"
	const used = toNonNegativeInt(usedRaw) ?? 0
	if (kind === "points") return `${used} 點`
	if (kind === "elevator") {
		const pts = toNonNegativeInt(usedPointsRaw) ?? 0
		return `${used} 台 / ${pts} 點`
	}
	return `${used} 台`
}

export const formatQuotaMaxText = (
	kind: QuotaUnitKind,
	maxDevicesRaw: unknown,
	maxPointsRaw?: unknown
) => {
	if (kind === "none") return "無額度"
	if (kind === "points") {
		const max = toNonNegativeInt(maxDevicesRaw)
		return max == null ? "不限" : `${max} 點`
	}
	if (kind === "devices") {
		const max = toNonNegativeInt(maxDevicesRaw)
		return max == null ? "不限" : `${max} 台`
	}
	const devices = toNonNegativeInt(maxDevicesRaw)
	const points = toNonNegativeInt(maxPointsRaw)
	const d = devices == null ? "不限" : `${devices} 台`
	const p = points == null ? "不限" : `${points} 點`
	return `${d} / ${p}`
}

export const isQuotaExceeded = (
	kind: QuotaUnitKind,
	usedRaw: unknown,
	maxDevicesRaw: unknown,
	usedPointsRaw?: unknown,
	maxPointsRaw?: unknown
) => {
	if (kind === "none") return false
	const used = toNonNegativeInt(usedRaw) ?? 0
	const maxDevices = toNonNegativeInt(maxDevicesRaw)
	if (kind === "elevator") {
		const usedPoints = toNonNegativeInt(usedPointsRaw) ?? 0
		const maxPoints = toNonNegativeInt(maxPointsRaw)
		const devicesFull = maxDevices != null && used >= maxDevices
		const pointsFull = maxPoints != null && usedPoints >= maxPoints
		return devicesFull || pointsFull
	}
	return maxDevices != null && used >= maxDevices
}

