import type { SecurityDataSource, SecurityLocation } from "~/types/security"

export const SECURITY_DATA_SOURCE = {
	DI: "di",
	ACCESS_CONTROL: "access_control",
	BOTH: "both",
} as const satisfies Record<string, SecurityDataSource>

export const SECURITY_DATA_SOURCE_LABELS: Record<SecurityDataSource, string> = {
	di: "DI（門磁／紅外）",
	access_control: "門禁機／讀卡機",
	both: "DI＋門禁／讀卡",
}

const hasDiBinding = (loc: Pick<SecurityLocation, "deviceId" | "statusPoints">): boolean => {
	const deviceId = Number(loc.deviceId)
	if (Number.isFinite(deviceId) && deviceId > 0) return true
	return !!(loc.statusPoints && Object.keys(loc.statusPoints).length > 0)
}

const hasAccessBinding = (loc: Pick<SecurityLocation, "accessDeviceIds">): boolean =>
	Array.isArray(loc.accessDeviceIds) &&
	loc.accessDeviceIds.map(Number).some((n) => Number.isFinite(n) && n > 0)

/** 正規化／由既有綁定推斷資料來源 */
export const resolveSecurityDataSource = (
	loc: Pick<SecurityLocation, "dataSource" | "deviceId" | "statusPoints" | "accessDeviceIds">
): SecurityDataSource => {
	const raw = String(loc.dataSource || "").trim()
	if (raw === SECURITY_DATA_SOURCE.DI) return "di"
	if (raw === SECURITY_DATA_SOURCE.ACCESS_CONTROL) return "access_control"
	if (raw === SECURITY_DATA_SOURCE.BOTH) return "both"

	const di = hasDiBinding(loc)
	const access = hasAccessBinding(loc)
	if (di && access) return "both"
	if (access) return "access_control"
	return "di"
}

export const securityDataSourceUsesDi = (source: SecurityDataSource): boolean =>
	source === "di" || source === "both"

export const securityDataSourceUsesAccess = (source: SecurityDataSource): boolean =>
	source === "access_control" || source === "both"
