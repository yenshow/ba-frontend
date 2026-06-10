export const MAX_ELEVATOR_FLOOR_COUNT = 128
export const DEFAULT_ELEVATOR_FLOOR_COUNT = 4

export const defaultElevatorFloorName = (index: number): string =>
	`Floor ${String(index).padStart(2, "0")}`

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
