export type PeopleCountingDataSource = "yscp" | "access_control" | "isapi_camera"

/** 依後端 ENABLE_YSCP_PEOPLE_COUNTING 正規化資料來源（yscp 關閉時改為 access_control） */
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
