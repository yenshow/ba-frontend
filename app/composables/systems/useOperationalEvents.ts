/**
 * 營運事件：型別、列表標籤／meta、API（單一入口）
 * 工地 UI 僅人流／車輛；「全部」篩選仍強制子集以免露出 Central 事件。
 */
import { useApiBase } from "~/composables/core/useApiBase"
import { buildPathWithQuery } from "~/utils/apiUtils"
import { getSourceLabel } from "~/utils/alertUtils"
import { formatDateTime } from "~/utils/dateUtils"

/** 工地 UI 主要使用的事件類型（篩選／標籤） */
export type OperationalEventKind = "access" | "vehicle"

/**
 * 營運事件列表列。
 * DI/DO 相關欄位為共用 API envelope，工地 UI／匯出不使用；
 * `event_kind` 允許字串以相容共用後端回傳的其他 kind。
 */
export type OperationalEvent = {
	id: number
	created_at: string
	source: string
	event_kind: OperationalEventKind | string
	location_id: number | null
	system_id: number | null
	device_id: number | null
	message: string
	actor_user_id: number | null
	ref_table: string | null
	ref_id: number | null
	payload: Record<string, unknown> | null
	device_name?: string | null
	location_name?: string | null
	zone_name?: string | null
	actor_username?: string | null
	bit_key?: string | null
	address?: number | null
	old_value?: boolean | null
	new_value?: boolean | null
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

/**
 * 工地營運事件來源篩選。
 * 實際寫入來源：people_counting／access（人流／門禁）、vehicle_access。
 */
const OPERATIONAL_SOURCE_FILTER_KEYS = [
	"people_counting",
	"vehicle_access",
] as const

/** 「全部」時仍限制工地支援的來源；類型不預設鎖 access/vehicle（含門禁 control_write） */
export const CONSTRUCTION_DEFAULT_SOURCES = "people_counting,vehicle_access"
export const CONSTRUCTION_DEFAULT_KINDS = ""

const SOURCE_FILTER_LABELS: Record<
	(typeof OPERATIONAL_SOURCE_FILTER_KEYS)[number],
	string
> = {
	people_counting: "人流統計",
	vehicle_access: "車輛進出",
}

/** 歷史列 access_control 與 people_counting 同屬門禁／人流模組 */
const SOURCE_DISPLAY_LABELS: Record<string, string> = {
	...SOURCE_FILTER_LABELS,
	access_control: SOURCE_FILTER_LABELS.people_counting,
}

export const getOperationalSourceLabel = (source: string): string =>
	SOURCE_DISPLAY_LABELS[source] ?? getSourceLabel(source)

const getOperationalSourceFilterLabel = (source: string): string =>
	SOURCE_FILTER_LABELS[source as keyof typeof SOURCE_FILTER_LABELS] ??
	getSourceLabel(source)

export const buildOperationalSourceFilterOptions = () => [
	{ value: "", label: "全部系統" },
	...OPERATIONAL_SOURCE_FILTER_KEYS.map((value) => ({
		value,
		label: getOperationalSourceFilterLabel(value),
	})),
]

export const OPERATIONAL_KIND_OPTIONS = [
	{ value: "", label: "全部類型" },
	{ value: "access", label: "門禁／人流" },
	{ value: "vehicle", label: "車輛進出" },
] as const

export const getOperationalKindLabel = (kind: string): string => {
	const hit = OPERATIONAL_KIND_OPTIONS.find((o) => o.value === kind)
	return hit?.label || kind
}

const KIND_BADGE_CLASS: Record<string, string> = {
	access: "bg-sky-500/80",
	vehicle: "bg-violet-500/80",
}

export const getOperationalKindBadgeClass = (kind: string): string =>
	KIND_BADGE_CLASS[kind] || "bg-slate-500/80"

const getOperationalPlaceLabel = (
	event: Pick<OperationalEvent, "zone_name" | "location_name">,
): string => {
	if (event.zone_name && event.location_name) {
		return `${event.zone_name} - ${event.location_name}`
	}
	return event.location_name || event.zone_name || "—"
}

const getOperationalDeviceLabel = (
	event: Pick<OperationalEvent, "device_name" | "device_id">,
): string => {
	if (event.device_name) return event.device_name
	if (event.device_id != null) return `#${event.device_id}`
	return "—"
}

export const getOperationalActorLabel = (
	event: Pick<OperationalEvent, "actor_username" | "actor_user_id">,
): string =>
	event.actor_username ||
	(event.actor_user_id == null ? "" : `#${event.actor_user_id}`)

/** 列表固定：地點、設備、時間；另可附操作者（工地無電梯投影） */
export const buildOperationalEventMeta = (
	event: OperationalEvent,
): OperationalEventMetaItem[] => {
	const items: OperationalEventMetaItem[] = [
		{ key: "place", label: "地點", value: getOperationalPlaceLabel(event) },
		{ key: "device", label: "設備", value: getOperationalDeviceLabel(event) },
		{ key: "time", label: "時間", value: formatDateTime(event.created_at) },
	]
	const actor = getOperationalActorLabel(event)
	if (actor) items.push({ key: "actor", label: "操作者", value: actor })
	return items
}

export const useOperationalEvents = () => {
	const { request } = useApiBase()

	const getEvents = async (
		filters?: OperationalEventFilters,
	): Promise<OperationalEventListResponse> => {
		const path = buildPathWithQuery(
			"/operational-events",
			filters as Record<string, unknown>,
		)
		return await request<OperationalEventListResponse>(path)
	}

	return { getEvents }
}
