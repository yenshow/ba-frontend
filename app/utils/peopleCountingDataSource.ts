import type { PeopleCountingSystemConfig, UnifiedLocation } from "~/types/location"

export type PeopleCountingDataSource = "yscp" | "access_control" | "isapi_camera"

const isYscpStored = (raw: PeopleCountingDataSource | string | undefined) =>
	raw === "yscp" || raw === undefined || raw === ""

export const shouldHidePeopleCountingWhenYscpOff = (
	raw: PeopleCountingDataSource | string | undefined,
	yscpEnabled: boolean
) => !yscpEnabled && isYscpStored(raw)

export const isPeopleCountingLocationVisible = (
	raw: PeopleCountingDataSource | string | undefined,
	yscpEnabled: boolean
) => !shouldHidePeopleCountingWhenYscpOff(raw, yscpEnabled)

/**
 * 統一地點列表：YSCP 關閉時隱藏「僅 YSCP 人流」地點；
 * 若同地點另有環境等其他系統則仍顯示。
 */
export const shouldShowUnifiedLocationWhenYscpOff = (
	loc: Pick<UnifiedLocation, "systems">,
	yscpEnabled: boolean
): boolean => {
	const systems = loc.systems ?? []
	const pc = systems.find((s) => s.systemType === "people_counting")
	if (!pc) return true

	const cfg = pc.config as PeopleCountingSystemConfig | undefined
	if (!shouldHidePeopleCountingWhenYscpOff(cfg?.dataSource, yscpEnabled)) return true

	return systems.some((s) => s.systemType !== "people_counting")
}

export const storedPeopleCountingDataSource = (
	raw: PeopleCountingDataSource | string | undefined
): PeopleCountingDataSource => {
	if (raw === "access_control" || raw === "isapi_camera") return raw
	return "yscp"
}

export const filterPeopleCountingZoneLocations = <T extends { dataSource?: string }>(
	locations: T[],
	yscpEnabled: boolean
) =>
	locations
		.map((location, locationIndex) => ({ location, locationIndex }))
		.filter(({ location }) => isPeopleCountingLocationVisible(location.dataSource, yscpEnabled))

/** 區域儲存：YSCP 關閉時不送出 yscp 地點（避免觸發後端驗證／覆寫） */
export const filterPeopleCountingLocationsForSave = <T extends { dataSource?: string }>(
	locations: T[],
	yscpEnabled: boolean
): T[] =>
	filterPeopleCountingZoneLocations(locations, yscpEnabled).map(({ location }) => location)

export const resolvePeopleCountingDataSource = (
	raw: PeopleCountingDataSource | string | undefined,
	yscpEnabled: boolean
): PeopleCountingDataSource => {
	if (raw === "yscp" && !yscpEnabled) return "access_control"
	if (raw === "access_control" || raw === "isapi_camera" || raw === "yscp") {
		return raw
	}
	return yscpEnabled ? "yscp" : "access_control"
}
