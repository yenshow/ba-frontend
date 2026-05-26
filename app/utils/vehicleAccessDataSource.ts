export type VehicleAccessDataSource = "yscp" | "isapi_camera";

const isYscpStored = (raw: VehicleAccessDataSource | string | undefined) =>
	raw !== "isapi_camera";

export const shouldHideVehicleAccessWhenYscpOff = (
	raw: VehicleAccessDataSource | string | undefined,
	yscpEnabled: boolean
) => !yscpEnabled && isYscpStored(raw);

export const storedVehicleAccessDataSource = (
	raw: VehicleAccessDataSource | string | undefined
): VehicleAccessDataSource => (raw === "isapi_camera" ? "isapi_camera" : "yscp");

export const filterVehicleAccessZoneLocations = <T extends { dataSource?: string }>(
	locations: T[],
	yscpEnabled: boolean
) =>
	locations
		.map((location, locationIndex) => ({ location, locationIndex }))
		.filter(({ location }) => !shouldHideVehicleAccessWhenYscpOff(location.dataSource, yscpEnabled));

/** 區域儲存：YSCP 關閉時不送出 yscp 地點（避免觸發後端驗證／覆寫） */
export const filterVehicleAccessLocationsForSave = <T extends { dataSource?: string }>(
	locations: T[],
	yscpEnabled: boolean
): T[] =>
	locations.filter(loc => !shouldHideVehicleAccessWhenYscpOff(loc.dataSource, yscpEnabled));

export const resolveVehicleAccessDataSource = (
	raw: VehicleAccessDataSource | string | undefined,
	yscpEnabled: boolean
): VehicleAccessDataSource => {
	if (raw === "yscp" && !yscpEnabled) return "isapi_camera";
	if (raw === "isapi_camera" || raw === "yscp") return raw;
	return yscpEnabled ? "yscp" : "isapi_camera";
};
