/**
 * 營運事件：型別、列表標籤／meta、API（單一入口）
 */
import { useApiBase } from "~/composables/core/useApiBase"
import { buildPathWithQuery } from "~/utils/apiUtils"
import { getSourceLabel, getAlertSourceFilterLabel } from "~/utils/alertUtils"
import { formatDateTime } from "~/utils/dateUtils"
import { SYSTEM_TYPE_LABELS } from "~/types/location"

export type OperationalEventKind =
	| "control_write"
	| "state_change"
	| "access"
	| "vehicle"
	| "elevator"
	| "intercom"

export type OperationalEvent = {
	id: number
	occurred_at: string
	source: string
	event_kind: OperationalEventKind
	location_id: number | null
	system_id: number | null
	device_id: number | null
	bit_key: string | null
	address: number | null
	old_value: boolean | null
	new_value: boolean | null
	summary: string
	actor_user_id: number | null
	ref_table: string | null
	ref_id: number | null
	payload: Record<string, unknown> | null
	created_at: string
	device_name?: string | null
	location_name?: string | null
	zone_name?: string | null
	actor_username?: string | null
}

type OperationalEventFilters = {
	source?: string
	event_kind?: string
	location_id?: number
	start_date?: string
	end_date?: string
	limit?: number
	offset?: number
}

type OperationalEventListResponse = {
	events: OperationalEvent[]
	total: number
	limit: number
	offset: number
	byKind: Array<{ event_kind: string; count: number }>
}

type OperationalEventMetaItem = {
	key: string
	label: string
	value: string
}

/** 營運事件來源篩選（基礎設施對齊警示紀錄命名；另含進出／連動） */
const OPERATIONAL_SOURCE_FILTER_KEYS = [
	"environment",
	"lighting",
	"hvac",
	"drainage",
	"power",
	"air_circulation",
	"fire",
	"smoke_alarm",
	"emergency_rescue",
	"people_counting",
	"vehicle_access",
	"elevator",
	"alert_linkage",
] as const

const EXTRA_SOURCE_LABELS: Record<string, string> = {
	people_counting: SYSTEM_TYPE_LABELS.people_counting,
	access_control: SYSTEM_TYPE_LABELS.people_counting, // 歷史列
	vehicle_access: SYSTEM_TYPE_LABELS.vehicle_access,
	elevator: SYSTEM_TYPE_LABELS.elevator,
	alert_linkage: "警報連動",
	video_intercom: "組網對講",
	access_security_ring: "語音廣播",
}

export const getOperationalSourceLabel = (source: string): string =>
	EXTRA_SOURCE_LABELS[source] ?? getSourceLabel(source)

const getOperationalSourceFilterLabel = (source: string): string =>
	EXTRA_SOURCE_LABELS[source] ?? getAlertSourceFilterLabel(source)

export const buildOperationalSourceFilterOptions = () => [
	{ value: "", label: "全部系統" },
	...OPERATIONAL_SOURCE_FILTER_KEYS.map((value) => ({
		value,
		label: getOperationalSourceFilterLabel(value),
	})),
]

export const OPERATIONAL_KIND_OPTIONS = [
	{ value: "", label: "全部類型" },
	{ value: "control_write", label: "控制寫入" },
	{ value: "state_change", label: "狀態變化" },
	{ value: "access", label: "門禁／人流" },
	{ value: "vehicle", label: "車輛進出" },
	{ value: "elevator", label: "電梯管理" },
	{ value: "intercom", label: "對講" },
] as const

export const getOperationalKindLabel = (kind: string): string => {
	const hit = OPERATIONAL_KIND_OPTIONS.find((o) => o.value === kind)
	return hit?.label || kind
}

const KIND_BADGE_CLASS: Record<string, string> = {
	control_write: "bg-emerald-500/80",
	state_change: "bg-indigo-500/80",
	access: "bg-sky-500/80",
	vehicle: "bg-violet-500/80",
	elevator: "bg-fuchsia-500/80",
	intercom: "bg-cyan-500/80",
}

export const getOperationalKindBadgeClass = (kind: string): string =>
	KIND_BADGE_CLASS[kind] || "bg-slate-500/80"

/** 是否為警報連動觸發的控制寫入 */
export const isOperationalAlertLinkage = (event: OperationalEvent): boolean => {
	if (event.source === "alert_linkage") return true
	const payload = event.payload
	return Boolean(payload && payload.fromAlertLinkage === true)
}

const getOperationalPlaceLabel = (
	event: Pick<OperationalEvent, "zone_name" | "location_name">
): string => {
	if (event.zone_name && event.location_name) {
		return `${event.zone_name} - ${event.location_name}`
	}
	return event.location_name || event.zone_name || "—"
}

const getOperationalDeviceLabel = (
	event: Pick<OperationalEvent, "device_name" | "device_id">
): string => {
	if (event.device_name) return event.device_name
	if (event.device_id != null) return `#${event.device_id}`
	return "—"
}

export const getOperationalActorLabel = (
	event: Pick<OperationalEvent, "actor_username" | "actor_user_id">
): string => event.actor_username || (event.actor_user_id == null ? "" : `#${event.actor_user_id}`)

/** 列表固定：地點、設備、時間；另可附樓層／操作者（不顯示點位） */
export const buildOperationalEventMeta = (event: OperationalEvent): OperationalEventMetaItem[] => {
	const items: OperationalEventMetaItem[] = [
		{ key: "place", label: "地點", value: getOperationalPlaceLabel(event) },
		{ key: "device", label: "設備", value: getOperationalDeviceLabel(event) },
		{ key: "time", label: "時間", value: formatDateTime(event.occurred_at) },
	]
	const floorLabel = String(event.payload?.floorLabel ?? event.payload?.floor ?? "").trim()
	if (floorLabel) {
		items.push({ key: "floor", label: "樓層", value: floorLabel })
	}
	const actor = getOperationalActorLabel(event)
	if (actor) items.push({ key: "actor", label: "操作者", value: actor })
	return items
}

export const useOperationalEvents = () => {
	const { request } = useApiBase()

	const getEvents = async (
		filters?: OperationalEventFilters
	): Promise<OperationalEventListResponse> => {
		const path = buildPathWithQuery("/operational-events", filters as Record<string, unknown>)
		return await request<OperationalEventListResponse>(path)
	}

	return { getEvents }
}
