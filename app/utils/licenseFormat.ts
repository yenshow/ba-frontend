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

