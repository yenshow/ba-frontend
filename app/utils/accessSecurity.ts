import { parseFloorLabelToken } from "~/utils/elevatorFloorModel"
import type {
	AccessSecurityIntercomLog,
	AccessSecurityMainStation,
	AccessSecuritySiteLocation,
	AccessSecuritySiteZone,
} from "~/types/accessSecurity"

// ── 樓層／戶別 ──────────────────────────────────────────────

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

const OVERVIEW_GRID_CELLS = 12

export type AccessSecurityOverviewGridCell =
	| { kind: "unit"; location: AccessSecuritySiteLocation }
	| { kind: "overflow"; count: number }
	| null

export const buildAccessSecurityOverviewGrid = (
	locations: AccessSecuritySiteLocation[]
): AccessSecurityOverviewGridCell[] => {
	const ordered = groupAccessSecurityLocationsByFloor(locations).flatMap(
		(group) => group.locations
	)
	if (ordered.length <= OVERVIEW_GRID_CELLS) {
		return [
			...ordered.map((location) => ({ kind: "unit" as const, location })),
			...Array(OVERVIEW_GRID_CELLS - ordered.length).fill(null),
		]
	}
	const visible = OVERVIEW_GRID_CELLS - 1
	return [
		...ordered.slice(0, visible).map((location) => ({ kind: "unit" as const, location })),
		{ kind: "overflow", count: ordered.length - visible },
	]
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

export const resolveAccessSecurityZoneStation = (
	zone: Pick<AccessSecuritySiteZone, "manageDeviceId">,
	stations: AccessSecurityMainStation[]
): AccessSecurityMainStation | null => {
	const id = Number(zone.manageDeviceId)
	if (!Number.isInteger(id) || id <= 0) return null
	return stations.find((st) => st.deviceId === id) ?? null
}

export const formatAccessSecurityArmingLabel = (
	station: AccessSecurityMainStation | null | undefined
): string => {
	if (!station) return "未綁定"
	if (!station.armed) return "未佈防"
	if (station.armingStatus === "ready") return "已佈防"
	if (station.armingStatus === "connecting") return "連線中"
	if (station.armingStatus === "stopped") return "已停止"
	return station.armingStatus || "未佈防"
}

// ── 對講事件（監控頁） ───────────────────────────────────────

const toPositiveInt = (raw: unknown): number | null => {
	const n = Number(raw)
	return Number.isInteger(n) && n > 0 ? n : null
}

const getIntercomEventLocationId = (event: AccessSecurityIntercomLog): number | null =>
	toPositiveInt(event.location_id)

const resolveAccessSecurityIntercomUnit = (
	event: AccessSecurityIntercomLog,
	locations: AccessSecuritySiteLocation[]
): AccessSecuritySiteLocation | null => {
	const locId = getIntercomEventLocationId(event)
	if (locId != null) {
		const hit = locations.find((loc) => loc.id === locId)
		if (hit) return hit
	}

	const deviceId = toPositiveInt(event.device_id)
	if (deviceId != null) {
		const hit = locations.find((loc) => loc.indoorDeviceId === deviceId)
		if (hit) return hit
	}

	const systemId = toPositiveInt(event.system_id)
	if (systemId != null) {
		const hit = locations.find((loc) => loc.systemId === systemId)
		if (hit) return hit
	}

	const rawName = String(event.location_name || "").trim()
	if (rawName) {
		const hit = locations.find(
			(loc) =>
				loc.displayName === rawName || loc.name === rawName || loc.unitName === rawName
		)
		if (hit) return hit
	}

	const summary = String(event.message || "")
	return (
		locations.find(
			(loc) =>
				(loc.displayName && summary.includes(loc.displayName)) ||
				(loc.name && summary.includes(loc.name))
		) || null
	)
}

const formatIntercomUnitLabel = (
	loc: AccessSecuritySiteLocation | null,
	event: AccessSecurityIntercomLog
): string => {
	if (loc) return loc.displayName || loc.name
	const raw = String(event.location_name || "").trim()
	if (!raw) return "—"
	const { floor, unitName } = splitAccessSecurityLocationName(raw)
	return formatAccessSecurityDisplayName(floor, unitName || raw) || raw
}

export const getIntercomSourceBadgeClass = (source: string): string => {
	if (source === "alert_linkage") return "bg-amber-500/80 text-white"
	if (source === "access_security_ring") return "bg-cyan-500/80 text-white"
	return "bg-slate-500/80 text-white"
}

export const getIntercomSourceLabel = (source: string): string => {
	if (source === "alert_linkage") return "警報連動"
	if (source === "access_security_ring") return "語音廣播"
	return source || "—"
}

export const parseIntercomLogTimestamp = (
	ts: string | null | undefined
): { date: string; time: string } => {
	const raw = String(ts || "").trim()
	if (!raw) return { date: "—", time: "—" }
	const i = raw.indexOf(" ")
	if (i === -1) return { date: raw, time: "" }
	return { date: raw.slice(0, i), time: raw.slice(i + 1) }
}

const escapeRegExp = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const stripPlaceTokens = (
	text: string,
	tokens: Array<string | null | undefined>
): string => {
	const unique = [
		...new Set(
			tokens
				.map((token) => String(token || "").trim())
				.filter((token) => token && token !== "—")
		),
	].sort((a, b) => b.length - a.length)
	let next = text
	for (const token of unique) {
		next = next.replace(new RegExp(`(?:^|\\s)${escapeRegExp(token)}(?=\\s|$)`, "gi"), " ")
	}
	return next.replace(/\s+/g, " ").trim()
}

/** 監控頁摘要：去掉括號內容、英文結果碼、地點前綴，以及已出現在戶別欄的位置詞 */
const formatIntercomMonitorSummary = (
	raw: string | null | undefined,
	placeTokens: Array<string | null | undefined> = []
): string => {
	let text = String(raw || "").trim()
	if (!text) return "—"
	// `{區域} - {地點}：動作` → 只留動作（戶別已在另一欄）
	const colonIdx = text.indexOf("：")
	if (colonIdx >= 0 && colonIdx < text.length - 1) {
		text = text.slice(colonIdx + 1).trim()
	}
	text = text.replace(/[（(][^）)]*[）)]/g, " ")
	text = text.replace(
		/\b(broadcast-played|need-auth|not-found|forbidden|ringing|trying|busy|none|ok|code-\d+)\b/gi,
		" "
	)
	if (placeTokens.length) text = stripPlaceTokens(text, placeTokens)
	return text.replace(/\s+/g, " ").trim() || "—"
}

export const formatIntercomMonitorRow = (
	event: AccessSecurityIntercomLog,
	locations: AccessSecuritySiteLocation[]
): { unit: string; summary: string } => {
	const loc = resolveAccessSecurityIntercomUnit(event, locations)
	const unit = formatIntercomUnitLabel(loc, event)
	return {
		unit,
		summary: formatIntercomMonitorSummary(
			event.message,
			unit === "—"
				? []
				: [unit, loc?.displayName, loc?.name, loc?.unitName, event.location_name, event.zone_name]
		),
	}
}
