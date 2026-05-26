export type PeopleCountingDataSource = "yscp" | "access_control" | "isapi_camera"

const isYscpStored = (raw: PeopleCountingDataSource | string | undefined) =>
	raw === "yscp" || raw === undefined || raw === ""

export const shouldHidePeopleCountingWhenYscpOff = (
	raw: PeopleCountingDataSource | string | undefined,
	yscpEnabled: boolean
) => !yscpEnabled && isYscpStored(raw)

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
		.filter(({ location }) => !shouldHidePeopleCountingWhenYscpOff(location.dataSource, yscpEnabled))

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
