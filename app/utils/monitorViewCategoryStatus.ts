/** 檢視分類下拉／跨分類摘要用狀態層級 */
export type MonitorCategoryStatus = "normal" | "warning" | "alarm"

export type MonitorRowFlash = "none" | "slow" | "alarm-fast"

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
