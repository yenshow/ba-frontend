export type VehicleAccessDataSource = "yscp" | "isapi_camera";

const isYscpStored = (raw: VehicleAccessDataSource | string | undefined) =>
	raw !== "isapi_camera";

/** YSCP 關閉時是否應略過（監控列表、區域管理、總覽） */
export const shouldHideVehicleAccessWhenYscpOff = (
	raw: VehicleAccessDataSource | string | undefined,
	yscpEnabled: boolean
) => !yscpEnabled && isYscpStored(raw);

/** 區域管理編輯：依 DB 實際值顯示 */
export const storedVehicleAccessDataSource = (
	raw: VehicleAccessDataSource | string | undefined
): VehicleAccessDataSource => (raw === "isapi_camera" ? "isapi_camera" : "yscp");

/** 區域管理列表（保留原始 locationIndex） */
export const filterVehicleAccessZoneLocations = <T extends { dataSource?: string }>(
	locations: T[],
	yscpEnabled: boolean
) =>
	locations
		.map((location, locationIndex) => ({ location, locationIndex }))
		.filter(({ location }) => !shouldHideVehicleAccessWhenYscpOff(location.dataSource, yscpEnabled));

/** 監控頁／表單驗證：YSCP 關閉時預設 isapi_camera */
export const resolveVehicleAccessDataSource = (
	raw: VehicleAccessDataSource | string | undefined,
	yscpEnabled: boolean
): VehicleAccessDataSource => {
	if (raw === "yscp" && !yscpEnabled) return "isapi_camera";
	if (raw === "isapi_camera" || raw === "yscp") return raw;
	return yscpEnabled ? "yscp" : "isapi_camera";
};
