export const MAX_ELEVATOR_FLOOR_COUNT = 128
export const DEFAULT_ELEVATOR_FLOOR_COUNT = 4
export const MIN_ELEVATOR_OPEN_DURATION = 1
export const MAX_ELEVATOR_OPEN_DURATION = 255
export const DEFAULT_ELEVATOR_OPEN_DURATION = 30

export const defaultElevatorFloorName = (index: number): string => `${index}F`

const clampFloorCount = (count: number) =>
	Math.max(1, Math.min(count, MAX_ELEVATOR_FLOOR_COUNT))

export const normalizeElevatorFloorCount = (value: unknown): number | null => {
	if (value == null || value === "") return null
	const n = Number(value)
	if (!Number.isFinite(n) || n < 1) return null
	return clampFloorCount(Math.trunc(n))
}

/** 調整陣列長度；既有索引保留原值，僅新增索引填入預設名稱 */
export const padFloorNames = (current: string[] | undefined, count: number): string[] => {
	const safeCount = clampFloorCount(count)
	const existing = Array.isArray(current) ? current : []
	return Array.from({ length: safeCount }, (_, i) => {
		if (i < existing.length) return existing[i] ?? ""
		return defaultElevatorFloorName(i + 1)
	})
}

/** 儲存前／失焦時：空白欄位補上預設名稱 */
export const fillEmptyFloorNames = (names: string[], count: number): string[] => {
	const safeCount = clampFloorCount(count)
	return Array.from({ length: safeCount }, (_, i) => {
		const trimmed = names[i]?.trim()
		return trimmed || defaultElevatorFloorName(i + 1)
	})
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

/** 調整陣列長度；既有索引保留原值，僅新增索引填入預設秒數 */
export const padFloorOpenDurations = (
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
