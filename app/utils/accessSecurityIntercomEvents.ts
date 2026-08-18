import type { AccessSecuritySiteLocation } from "~/types/accessSecurity"
import type { OperationalEvent } from "~/composables/systems/useOperationalEvents"
import {
	formatAccessSecurityDisplayName,
	splitAccessSecurityLocationName,
} from "~/utils/accessSecurityFloor"

export const ACCESS_SECURITY_INTERCOM_MONITOR_LIMIT = 5

export const ACCESS_SECURITY_MONITOR_EVENT_SOURCES = [
	"access_security_ring",
	"alert_linkage",
] as const

const toPositiveInt = (raw: unknown): number | null => {
	const n = Number(raw)
	return Number.isInteger(n) && n > 0 ? n : null
}

const getIntercomEventLocationId = (event: OperationalEvent): number | null =>
	toPositiveInt(event.location_id)

export const resolveAccessSecurityIntercomUnit = (
	event: OperationalEvent,
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

	const summary = String(event.summary || "")
	return (
		locations.find(
			(loc) =>
				(loc.displayName && summary.includes(loc.displayName)) ||
				(loc.name && summary.includes(loc.name))
		) || null
	)
}

export const formatAccessSecurityIntercomUnitLabel = (
	event: OperationalEvent,
	locations: AccessSecuritySiteLocation[]
): string => {
	const loc = resolveAccessSecurityIntercomUnit(event, locations)
	if (loc) return loc.displayName || loc.name
	const raw = String(event.location_name || "").trim()
	if (!raw) return "—"
	const { floor, unitName } = splitAccessSecurityLocationName(raw)
	return formatAccessSecurityDisplayName(floor, unitName || raw) || raw
}

export const filterAccessSecurityMonitorEvents = (
	events: OperationalEvent[],
	locations: AccessSecuritySiteLocation[],
	limit = ACCESS_SECURITY_INTERCOM_MONITOR_LIMIT
): OperationalEvent[] =>
	(events || [])
		.filter((event) =>
			ACCESS_SECURITY_MONITOR_EVENT_SOURCES.some((source) => source === event.source)
		)
		.filter((event) => resolveAccessSecurityIntercomUnit(event, locations) != null)
		.slice(0, limit)

export const getIntercomSourceBadgeClass = (source: string): string => {
	if (source === "alert_linkage") return "bg-amber-500/80 text-white"
	if (source === "access_security_ring") return "bg-cyan-500/80 text-white"
	return "bg-slate-500/80 text-white"
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

/** 監控頁摘要：去掉括號內容與英文結果碼 */
export const formatIntercomMonitorSummary = (raw: string | null | undefined): string => {
	let text = String(raw || "").trim()
	if (!text) return "—"
	text = text.replace(/[（(][^）)]*[）)]/g, " ")
	text = text.replace(
		/\b(broadcast-played|need-auth|not-found|forbidden|ringing|trying|busy|none|ok|code-\d+)\b/gi,
		" "
	)
	return text.replace(/\s+/g, " ").trim() || "—"
}
