export const MAX_ELEVATOR_FLOOR_COUNT = 128
export const DEFAULT_ELEVATOR_FLOOR_COUNT = 4
export const DEFAULT_ELEVATOR_FLOOR_START = 1
export const MIN_ELEVATOR_FLOOR_NUMBER = -9
export const MAX_ELEVATOR_FLOOR_NUMBER = 999
export const MIN_ELEVATOR_OPEN_DURATION = 1
export const MAX_ELEVATOR_OPEN_DURATION = 255
export const DEFAULT_ELEVATOR_OPEN_DURATION = 5

export type ElevatorFloorRange = {
	floorStart: number
	floorEnd: number
	floorCount: number
}

const clampFloorCount = (count: number) =>
	Math.max(1, Math.min(count, MAX_ELEVATOR_FLOOR_COUNT))

export const formatElevatorFloorNumber = (floorNumber: number): string => {
	if (floorNumber > 0) return `${floorNumber}F`
	if (floorNumber < 0) return `B${Math.abs(floorNumber)}`
	return "0F"
}

/** 設備門序預設名稱（第 1 門 1F、第 2 門 2F…） */
export const defaultElevatorSlotName = (slotIndex: number): string =>
	`${slotIndex + 1}F`

/** 陣列索引（0-based）→ 建築樓層號碼（# 標籤） */
export const elevatorFloorNumberAtSlot = (slotIndex: number, floorStart: number): number =>
	floorStart + slotIndex

const prevSlotForBuildingFloor = (slot: number, nextStart: number, prevStart: number) =>
	elevatorFloorNumberAtSlot(slot, nextStart) - prevStart

const isLegacyAutoElevatorFloorName = (
	name: string,
	slotIndex: number,
	rangeStart: number,
): boolean => {
	const trimmed = name.trim()
	if (trimmed === defaultElevatorSlotName(slotIndex)) return true
	return trimmed === formatElevatorFloorNumber(elevatorFloorNumberAtSlot(slotIndex, rangeStart))
}

export const resolveElevatorFloorLabel = (index: number, floorNames?: string[]): string =>
	floorNames?.[index - 1]?.trim() || defaultElevatorSlotName(index - 1)

export const normalizeElevatorFloorNumber = (value: unknown): number | null => {
	if (value == null || value === "") return null
	const n = Number(value)
	if (!Number.isFinite(n) || !Number.isInteger(n)) return null
	if (n < MIN_ELEVATOR_FLOOR_NUMBER || n > MAX_ELEVATOR_FLOOR_NUMBER) return null
	return n
}

export const deriveElevatorFloorCount = (floorStart: number, floorEnd: number): number | null => {
	if (!Number.isFinite(floorStart) || !Number.isFinite(floorEnd)) return null
	if (floorEnd < floorStart) return null
	const count = floorEnd - floorStart + 1
	if (count < 1 || count > MAX_ELEVATOR_FLOOR_COUNT) return null
	return count
}

const normalizeElevatorFloorCount = (value: unknown): number | null => {
	if (value == null || value === "") return null
	const n = Number(value)
	if (!Number.isFinite(n) || n < 1) return null
	return clampFloorCount(Math.trunc(n))
}

export const resolveElevatorFloorRange = (config: {
	floorCount?: unknown
	floorStart?: unknown
	floorEnd?: unknown
}): ElevatorFloorRange | null => {
	const normalizedStart = normalizeElevatorFloorNumber(config.floorStart)
	const normalizedEnd = normalizeElevatorFloorNumber(config.floorEnd)

	if (normalizedStart != null && normalizedEnd != null) {
		const derivedCount = deriveElevatorFloorCount(normalizedStart, normalizedEnd)
		if (derivedCount == null) return null
		return {
			floorStart: normalizedStart,
			floorEnd: normalizedEnd,
			floorCount: derivedCount,
		}
	}

	const floorCount = normalizeElevatorFloorCount(config.floorCount)
	if (floorCount == null) return null

	const floorStart = normalizedStart ?? DEFAULT_ELEVATOR_FLOOR_START
	const floorEnd = normalizedEnd ?? floorStart + floorCount - 1
	return { floorStart, floorEnd, floorCount }
}

export const validateElevatorFloorRange = (start: unknown, end: unknown): string | null => {
	const normalizedStart = normalizeElevatorFloorNumber(start)
	const normalizedEnd = normalizeElevatorFloorNumber(end)
	if (normalizedStart == null || normalizedEnd == null) {
		return "請輸入有效的起始與結束樓層"
	}
	if (normalizedEnd < normalizedStart) return "結束樓層不可小於起始樓層"
	if (deriveElevatorFloorCount(normalizedStart, normalizedEnd) == null) {
		return `樓層數量須為 1–${MAX_ELEVATOR_FLOOR_COUNT} 層`
	}
	return null
}

export const normalizeElevatorOpenDuration = (value: unknown): number | null => {
	if (value == null || value === "") return null
	const n = Number(value)
	if (!Number.isFinite(n)) return null
	const duration = Math.trunc(n)
	if (duration < MIN_ELEVATOR_OPEN_DURATION || duration > MAX_ELEVATOR_OPEN_DURATION) {
		return null
	}
	return duration
}

export const buildDefaultFloorConfig = (count: number) => {
	const safeCount = clampFloorCount(count)
	return {
		floorNames: Array.from({ length: safeCount }, (_, slot) => defaultElevatorSlotName(slot)),
		floorOpenDurations: Array.from({ length: safeCount }, () => DEFAULT_ELEVATOR_OPEN_DURATION),
	}
}

/** 樓層範圍變更：依建築樓層號對齊名稱與繼電器時間 */
export const remapFloorConfigForRange = (
	current: { floorNames?: string[]; floorOpenDurations?: number[] },
	prevStart: number,
	prevCount: number,
	nextStart: number,
	nextCount: number,
) => {
	const names = Array.isArray(current.floorNames) ? current.floorNames : []
	const durations = Array.isArray(current.floorOpenDurations) ? current.floorOpenDurations : []
	const safeCount = clampFloorCount(nextCount)
	const floorNames: string[] = []
	const floorOpenDurations: number[] = []

	for (let slot = 0; slot < safeCount; slot++) {
		const prevSlot = prevSlotForBuildingFloor(slot, nextStart, prevStart)
		let preservedName = ""
		let duration = DEFAULT_ELEVATOR_OPEN_DURATION

		if (prevSlot >= 0 && prevSlot < prevCount) {
			const oldName = names[prevSlot]?.trim() ?? ""
			if (oldName && !isLegacyAutoElevatorFloorName(oldName, prevSlot, prevStart)) {
				preservedName = oldName
			}
			duration = normalizeElevatorOpenDuration(durations[prevSlot]) ?? duration
		}

		floorNames.push(preservedName || defaultElevatorSlotName(slot))
		floorOpenDurations.push(duration)
	}

	return { floorNames, floorOpenDurations }
}

/** 儲存前／失焦時：空白欄位補上設備門序預設名稱 */
export const fillEmptyFloorNames = (names: string[], count: number): string[] => {
	const safeCount = clampFloorCount(count)
	return Array.from({ length: safeCount }, (_, slot) => {
		const trimmed = names[slot]?.trim()
		return trimmed || defaultElevatorSlotName(slot)
	})
}

/** 正規化繼電器時間陣列長度 */
export const normalizeFloorOpenDurationsList = (
	current: number[] | undefined,
	count: number,
): number[] => {
	const safeCount = clampFloorCount(count)
	const existing = Array.isArray(current) ? current : []
	return Array.from({ length: safeCount }, (_, i) => {
		const normalized = normalizeElevatorOpenDuration(existing[i])
		return normalized ?? DEFAULT_ELEVATOR_OPEN_DURATION
	})
}

/** 呼梯面板固定可視列數（4 欄 × 5 列） */
export const ELEVATOR_PANEL_COLUMNS = 4
export const ELEVATOR_PANEL_VISIBLE_ROWS = 5

/**
 * 電梯面板樓層顯示順序：高樓層在上，每列由左至右遞增。
 * 例（20 層）：17F–20F / 13F–16F / … / 1F–4F
 */
export const buildElevatorPanelFloorOrder = (count: number): number[] => {
	if (count < 1) return []
	const indices: number[] = []
	const rows = Math.ceil(count / ELEVATOR_PANEL_COLUMNS)
	for (let r = 0; r < rows; r++) {
		const rowEnd = count - r * ELEVATOR_PANEL_COLUMNS
		const rowStart = Math.max(1, rowEnd - ELEVATOR_PANEL_COLUMNS + 1)
		for (let i = rowStart; i <= rowEnd; i++) {
			indices.push(i)
		}
	}
	return indices
}
