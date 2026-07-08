/** 檢視分類下拉／跨分類摘要用狀態層級 */
export type MonitorCategoryStatus = "normal" | "warning" | "alarm"

export type MonitorCategoryStatusDot = {
	class: string
	label: string
}

export type MonitorRowFlash = "none" | "slow" | "alarm-fast"

const MONITOR_CATEGORY_STATUS_DOT: Record<
	Exclude<MonitorCategoryStatus, "normal">,
	MonitorCategoryStatusDot
> = {
	alarm: {
		class: "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.65)]",
		label: "此分類有警報",
	},
	warning: {
		class: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.65)]",
		label: "此分類有異常",
	},
}

/** FilterDropdown 觸發按鈕用；normal 或未定義時回傳 null */
export const getMonitorCategoryStatusDot = (
	status: MonitorCategoryStatus | undefined
): MonitorCategoryStatusDot | null => {
	if (!status || status === "normal") return null
	return MONITOR_CATEGORY_STATUS_DOT[status]
}

export const mergeMonitorCategoryStatus = (
	a: MonitorCategoryStatus,
	b: MonitorCategoryStatus
): MonitorCategoryStatus => {
	if (a === "alarm" || b === "alarm") return "alarm"
	if (a === "warning" || b === "warning") return "warning"
	return "normal"
}

export const flashToMonitorCategoryStatus = (
	flash: MonitorRowFlash,
	isAlarm: boolean
): MonitorCategoryStatus => {
	if (isAlarm || flash === "alarm-fast") return "alarm"
	if (flash !== "none") return "warning"
	return "normal"
}

export const buildViewCategoryStatusById = <TZone, TLoc>(params: {
	zones: TZone[]
	categoryIds: string[]
	getZoneLocations: (zone: TZone) => TLoc[]
	locationInCategory: (loc: TLoc, categoryId: string) => boolean
	evaluateLocation: (
		zone: TZone,
		loc: TLoc
	) => { flash: MonitorRowFlash; isAlarm: boolean }
}): Record<string, MonitorCategoryStatus> => {
	const out: Record<string, MonitorCategoryStatus> = {}
	for (const categoryId of params.categoryIds) {
		out[categoryId] = "normal"
	}

	for (const zone of params.zones) {
		for (const loc of params.getZoneLocations(zone)) {
			const evaluated = params.evaluateLocation(zone, loc)
			const status = flashToMonitorCategoryStatus(evaluated.flash, evaluated.isAlarm)
			if (status === "normal") continue

			for (const categoryId of params.categoryIds) {
				if (!params.locationInCategory(loc, categoryId)) continue
				out[categoryId] = mergeMonitorCategoryStatus(out[categoryId] ?? "normal", status)
			}
		}
	}

	return out
}
