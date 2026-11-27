/**
 * 排班班別色碼（與後端 Excel 範本 rollCallAssignmentImportService 對齊）
 */
export type RollCallShiftColor = { bg: string; text: string }

/** 依規則順序循環；Excel 使用同組 hex（含 #） */
export const ROLL_CALL_SHIFT_PALETTE: RollCallShiftColor[] = [
	{ bg: "#DBEAFE", text: "#1E3A5F" },
	{ bg: "#D1FAE5", text: "#14532D" },
	{ bg: "#FEF3C7", text: "#78350F" },
	{ bg: "#E0E7FF", text: "#312E81" },
	{ bg: "#FCE7F3", text: "#831843" },
	{ bg: "#CFFAFE", text: "#164E63" },
	{ bg: "#EDE9FE", text: "#4C1D95" },
	{ bg: "#FFEDD5", text: "#7C2D12" }
]

export const ROLL_CALL_OFF_COLOR: RollCallShiftColor = {
	bg: "#E5E7EB",
	text: "#4B5563"
}

export const shiftColorAtIndex = (index: number): RollCallShiftColor => {
	const palette = ROLL_CALL_SHIFT_PALETTE
	if (palette.length === 0) return ROLL_CALL_OFF_COLOR
	const i = ((index % palette.length) + palette.length) % palette.length
	return palette[i]!
}

export const shiftColorForRuleId = (
	ruleId: number | null | undefined,
	ruleIdsInOrder: number[]
): RollCallShiftColor => {
	if (ruleId == null || !Number.isFinite(ruleId)) return ROLL_CALL_OFF_COLOR
	const index = ruleIdsInOrder.indexOf(Number(ruleId))
	if (index < 0) return ROLL_CALL_OFF_COLOR
	return shiftColorAtIndex(index)
}
