/**
 * 監控中心區內地點：優先排序＋未選區域收斂。
 * 適用照明／空調（DI/DO）與保全／煙霧／緊急／空氣循環等監看型。
 */

/** 未選取區域時，每區最多顯示的地點卡數 */
export const STATUS_CENTER_COLLAPSED_LIMIT = 2

export type ToggleLocationPriorityInput = {
	/** 異常／警報（非 normal）優先於開關狀態 */
	isAlert: boolean
	/** 開啟（ON）優先於關閉（OFF） */
	isOn: boolean
	/** 同優先級時維持原陣列穩定序 */
	index: number
}

/** DI/DO：異常＞開啟＞關閉 */
export const compareToggleLocationPriority = (
	a: ToggleLocationPriorityInput,
	b: ToggleLocationPriorityInput
): number => {
	if (a.isAlert !== b.isAlert) return a.isAlert ? -1 : 1
	if (a.isOn !== b.isOn) return a.isOn ? -1 : 1
	return a.index - b.index
}

/** 監看型嚴重度（越小越優先）：alarm → warning → activity → normal */
export const monitorUiSeverityRank = (ui: unknown): number => {
	const s = String(ui ?? "")
		.trim()
		.toLowerCase()
	if (s === "alarm") return 0
	if (s === "warning") return 1
	if (s === "activity") return 2
	return 3
}

export type MonitorLocationPriorityInput = {
	severityRank: number
	/** 同嚴重度時開啟優先 */
	isOn?: boolean
	index: number
}

/** 監看型：嚴重度＞開啟＞關閉；無開關時僅嚴重度＋穩定序 */
export const compareMonitorLocationPriority = (
	a: MonitorLocationPriorityInput,
	b: MonitorLocationPriorityInput
): number => {
	if (a.severityRank !== b.severityRank) return a.severityRank - b.severityRank
	const aOn = !!a.isOn
	const bOn = !!b.isOn
	if (aOn !== bOn) return aOn ? -1 : 1
	return a.index - b.index
}

/**
 * 選中展開全部；未選取只取前 limit 筆。
 * 呼叫端應先完成排序。
 */
export const viewCollapsedZoneLocations = <T>(
	rows: readonly T[],
	isExpanded: boolean,
	limit: number = STATUS_CENTER_COLLAPSED_LIMIT
): { visible: T[]; hiddenCount: number } => {
	if (isExpanded) return { visible: [...rows], hiddenCount: 0 }
	const n = Math.max(0, limit)
	return {
		visible: rows.slice(0, n),
		hiddenCount: Math.max(0, rows.length - n),
	}
}
