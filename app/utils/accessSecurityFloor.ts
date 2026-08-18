import { parseFloorLabelToken } from "~/utils/elevatorFloorModel"
import type { AccessSecuritySiteLocation, AccessSecuritySiteZone } from "~/types/accessSecurity"

export const ACCESS_SECURITY_UNCLASSIFIED_FLOOR = "未分類"

const FLOOR_NAME_RE = /^(\d+F|B\d+F?|R\d+F?|RF|G)(?:[-_]?(.*))?$/i

export const normalizeAccessSecurityFloor = (raw: unknown): string => {
	const trimmed = String(raw || "").trim()
	if (!trimmed) return ""
	return trimmed.toUpperCase() === ACCESS_SECURITY_UNCLASSIFIED_FLOOR
		? ACCESS_SECURITY_UNCLASSIFIED_FLOOR
		: trimmed
}

export const parseAccessSecurityUnitName = (
	name: string
): { floor: string; unitName: string } => {
	const trimmed = String(name || "").trim()
	if (!trimmed) {
		return { floor: ACCESS_SECURITY_UNCLASSIFIED_FLOOR, unitName: "" }
	}
	const match = FLOOR_NAME_RE.exec(trimmed)
	if (!match) {
		return { floor: ACCESS_SECURITY_UNCLASSIFIED_FLOOR, unitName: trimmed }
	}
	const floor = String(match[1] || "").trim().toUpperCase()
	const rest = String(match[2] || "").trim()
	return {
		floor: floor || ACCESS_SECURITY_UNCLASSIFIED_FLOOR,
		unitName: rest || trimmed,
	}
}

/** config.floor 優先；否則從儲存名稱解析。戶號會剝離 `{floor}-` 前綴。 */
export const splitAccessSecurityLocationName = (
	storedName: string,
	floorFromConfig?: string | null
): { floor: string; unitName: string } => {
	const parsed = parseAccessSecurityUnitName(storedName)
	const fromConfig = normalizeAccessSecurityFloor(floorFromConfig)
	const floor =
		fromConfig && fromConfig !== ACCESS_SECURITY_UNCLASSIFIED_FLOOR
			? fromConfig
			: parsed.floor
	const sameFloor = parsed.floor.toUpperCase() === floor.toUpperCase()
	return {
		floor,
		unitName: sameFloor ? parsed.unitName : String(storedName || "").trim(),
	}
}

export const formatAccessSecurityDisplayName = (
	floor: string | null | undefined,
	unitName: string
): string => {
	const f = normalizeAccessSecurityFloor(floor)
	const n = String(unitName || "").trim()
	if (!f || f === ACCESS_SECURITY_UNCLASSIFIED_FLOOR) return n
	if (!n) return f
	if (n.toUpperCase().startsWith(f.toUpperCase())) return n
	return `${f}-${n}`
}

const floorRank = (floor: string): [number, number, string] => {
	if (!floor || floor === ACCESS_SECURITY_UNCLASSIFIED_FLOOR) {
		return [3, 0, floor]
	}
	const token = parseFloorLabelToken(floor)
	if (!token) return [2, 0, floor]
	if (token.kind === "B") return [0, -token.num, floor]
	if (token.kind === "F") return [1, token.num, floor]
	return [2, token.num, floor]
}

export const compareAccessSecurityFloors = (a: string, b: string): number => {
	const ra = floorRank(a)
	const rb = floorRank(b)
	if (ra[0] !== rb[0]) return ra[0] - rb[0]
	if (ra[1] !== rb[1]) return ra[1] - rb[1]
	return ra[2].localeCompare(rb[2], "zh-Hant")
}

export const groupAccessSecurityLocationsByFloor = <
	T extends { floor?: string | null },
>(
	locations: T[]
): Array<{ floor: string; locations: T[] }> => {
	const map = new Map<string, T[]>()
	for (const loc of locations) {
		const floor =
			normalizeAccessSecurityFloor(loc.floor) || ACCESS_SECURITY_UNCLASSIFIED_FLOOR
		const list = map.get(floor)
		if (list) list.push(loc)
		else map.set(floor, [loc])
	}
	return [...map.entries()]
		.sort(([a], [b]) => compareAccessSecurityFloors(a, b))
		.map(([floor, grouped]) => ({ floor, locations: grouped }))
}

export const normalizeAccessSecuritySiteLocation = (
	loc: Omit<AccessSecuritySiteLocation, "displayName" | "unitName"> & {
		displayName?: string
		unitName?: string
		floor?: string | null
	}
): AccessSecuritySiteLocation => {
	const { floor, unitName } = splitAccessSecurityLocationName(loc.name, loc.floor)
	return {
		...loc,
		floor,
		unitName,
		displayName: formatAccessSecurityDisplayName(floor, unitName || loc.name),
	}
}

export const normalizeAccessSecuritySiteZones = (
	zones: AccessSecuritySiteZone[]
): AccessSecuritySiteZone[] =>
	(zones || []).map((zone) => ({
		...zone,
		manageDeviceId: zone.manageDeviceId ?? null,
		locations: (zone.locations || []).map((loc) => normalizeAccessSecuritySiteLocation(loc)),
	}))
