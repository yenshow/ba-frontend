export type PeopleCountingDataSource = "yscp" | "access_control" | "isapi_camera"

const isYscpStored = (raw: PeopleCountingDataSource | string | undefined) =>
	raw === "yscp" || raw === undefined || raw === ""

/** YSCP 關閉時是否應略過（監控列表、區域管理、總覽） */
export const shouldHidePeopleCountingWhenYscpOff = (
	raw: PeopleCountingDataSource | string | undefined,
	yscpEnabled: boolean
) => !yscpEnabled && isYscpStored(raw)

/** 區域管理編輯：依 DB 實際值顯示 */
export const storedPeopleCountingDataSource = (
	raw: PeopleCountingDataSource | string | undefined
): PeopleCountingDataSource => {
	if (raw === "access_control" || raw === "isapi_camera") return raw
	return "yscp"
}

/** 區域管理列表（保留原始 locationIndex 供儲存／刪除） */
export const filterPeopleCountingZoneLocations = <T extends { dataSource?: string }>(
	locations: T[],
	yscpEnabled: boolean
) =>
	locations
		.map((location, locationIndex) => ({ location, locationIndex }))
		.filter(({ location }) => !shouldHidePeopleCountingWhenYscpOff(location.dataSource, yscpEnabled))

/** 監控頁／表單驗證：YSCP 關閉時預設 access_control */
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
