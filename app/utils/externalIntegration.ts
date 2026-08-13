export type ExportFieldCatalogItem = {
	key: string
	label: string
	required?: boolean
	requiresFormat?: boolean
}

export type ExportEventTypeId =
	| "access_control"
	| "energy"
	| "operational"
	| "vehicle"
	| "people_counting"
	| "alerts"
	| "environment"

export type ExportEventTypeInfo = {
	id: ExportEventTypeId | string
	label: string
	filterSchema?: {
		kind: string
		required?: boolean
		fields?: Array<{ key: string; type: string; label: string; required?: boolean }>
	} | null
	fields?: ExportFieldCatalogItem[]
}

export type ExportFilterSchemaKind =
	| "person_groups"
	| "devices"
	| "locations"
	| "operational"
	| "alerts"

export type ExportFilterSchema = NonNullable<ExportEventTypeInfo["filterSchema"]>

export const EVENT_TYPE_OPTIONS: Array<{ value: ExportEventTypeId; label: string }> = [
	{ value: "access_control", label: "門禁／刷卡" },
	{ value: "energy", label: "能源讀數" },
	{ value: "operational", label: "營運事件" },
	{ value: "vehicle", label: "車輛進出" },
	{ value: "people_counting", label: "人流紀錄" },
	{ value: "alerts", label: "警報事件" },
	{ value: "environment", label: "環境數值" },
]

export const EXPORT_FIELD_FORMAT_PLACEHOLDER: Record<string, string> = {
	eventDateTime: "yyyy-MM-dd HH:mm:ss",
	eventDate: "yyyy-MM-dd",
	eventTime: "HH:mm:ss",
	recordedAt: "yyyy-MM-dd HH:mm:ss",
	occurredAt: "yyyy-MM-dd HH:mm:ss",
	triggerTime: "yyyy-MM-dd HH:mm:ss",
	createdAt: "yyyy-MM-dd HH:mm:ss",
	updatedAt: "yyyy-MM-dd HH:mm:ss",
}

export const getExportFieldFormatPlaceholder = (key: string) =>
	EXPORT_FIELD_FORMAT_PLACEHOLDER[key] ?? "yyyy-MM-dd HH:mm:ss"

export const OUTPUT_FORMAT_OPTIONS = [
	{ value: "csv", label: "CSV" },
	{ value: "txt", label: "TXT" },
]

export const STORAGE_TYPE_OPTIONS = [
	{ value: "local", label: "本機儲存" },
	{ value: "sftp", label: "SFTP 儲存" },
]

export const DATE_FORMAT_OPTIONS = [
	{ label: "yyyy-MM-dd", value: "yyyy-MM-dd" },
	{ label: "yyyyMMdd", value: "yyyyMMdd" },
	{ label: "yyyy/MM/dd", value: "yyyy/MM/dd" },
	{ label: "dd-MM-yyyy", value: "dd-MM-yyyy" },
	{ label: "dd/MM/yyyy", value: "dd/MM/yyyy" },
	{ label: "MM/dd/yyyy", value: "MM/dd/yyyy" },
	{ label: "yyyy-MM", value: "yyyy-MM" },
	{ label: "yyyyMM", value: "yyyyMM" },
	{ label: "ddMMyyyy", value: "ddMMyyyy" },
	{ label: "MMddyyyy", value: "MMddyyyy" },
]

export const TIME_FORMAT_OPTIONS = [
	{ label: "HH:mm:ss", value: "HH:mm:ss" },
	{ label: "HHmmss", value: "HHmmss" },
	{ label: "HH:mm", value: "HH:mm" },
	{ label: "HHmm", value: "HHmm" },
	{ label: "h:mm:ss a", value: "h:mm:ss a" },
	{ label: "Hmmss", value: "Hmmss" },
	{ label: "Hmm", value: "Hmm" },
	{ label: "hh:mm:ss a", value: "hh:mm:ss a" },
	{ label: "hhmmss", value: "hhmmss" },
	{ label: "HH:mm:ss.SSS", value: "HH:mm:ss.SSS" },
]

export const DB_SYNC_DB_TYPE_OPTIONS = [
	{ value: "postgres", label: "PostgreSQL" },
	{ value: "sqlserver", label: "SQL Server" },
	{ value: "mysql", label: "MySQL" },
]

export const DB_SYNC_DEFAULT_PUSH_TIME = "18:00"

export const RECORD_EXPORT_DEFAULT_EXPORT_TIME = "00:00"

export const normalizeDailyPushTime = (raw: string): string | null => {
	const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw ?? "").trim())
	if (!match) return null
	const hour = Number(match[1])
	const minute = Number(match[2])
	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

const buildPaddedTimePartOptions = (max: number) =>
	Array.from({ length: max + 1 }, (_, value) => {
		const padded = String(value).padStart(2, "0")
		return { value: padded, label: padded }
	})

/** 每日 HH:mm 選擇：時（00–23） */
export const DAILY_TIME_HOUR_OPTIONS = buildPaddedTimePartOptions(23)

/** 每日 HH:mm 選擇：分（00–59） */
export const DAILY_TIME_MINUTE_OPTIONS = buildPaddedTimePartOptions(59)

export const splitDailyHHmm = (
	raw: string,
	fallback = DB_SYNC_DEFAULT_PUSH_TIME,
): { hour: string; minute: string } => {
	const normalized = normalizeDailyPushTime(raw) ?? fallback
	const [hour = "00", minute = "00"] = normalized.split(":")
	return { hour, minute }
}

export const joinDailyHHmm = (
	hour: string,
	minute: string,
	fallback = DB_SYNC_DEFAULT_PUSH_TIME,
): string => normalizeDailyPushTime(`${hour}:${minute}`) ?? fallback

export const eventTypeLabel = (id: string) =>
	EVENT_TYPE_OPTIONS.find((o) => o.value === id)?.label || id

/** 事件類型下拉選項：標籤固定用 EVENT_TYPE_OPTIONS，對接／轉存共用 */
export const buildEventTypeOptions = (args?: {
	availableTypes?: ExportEventTypeInfo[] | null
	excludeIds?: Iterable<string> | null
}) => {
	const allowed = args?.availableTypes?.length
		? new Set(args.availableTypes.map((t) => String(t.id)))
		: null
	const excluded = args?.excludeIds
		? new Set([...args.excludeIds].map((id) => String(id)))
		: null
	return EVENT_TYPE_OPTIONS.filter((o) => {
		if (allowed && !allowed.has(o.value)) return false
		if (excluded?.has(o.value)) return false
		return true
	})
}

export const parseIdListText = (raw: string) =>
	[
		...new Set(
			String(raw || "")
				.split(/[,，\s]+/)
				.map((s) => Number(s.trim()))
				.filter((n) => Number.isFinite(n) && n > 0),
		),
	]

export const parseCsvListText = (raw: string) =>
	[
		...new Set(
			String(raw || "")
				.split(/[,，\s]+/)
				.map((s) => s.trim())
				.filter(Boolean),
		),
	]

export const getFilterFieldLabel = (
	schema: ExportFilterSchema | null | undefined,
	key: string,
	fallback: string,
) => schema?.fields?.find((f) => f.key === key)?.label ?? fallback

export type RecordExportFilterForm = {
	groupIds: number[]
	deviceIdsText: string
	locationIdsText: string
	eventKindsText: string
	sourcesText: string
	statusesText: string
}

export const buildFilterPayloadFromForm = (
	schema: ExportFilterSchema | null | undefined,
	form: RecordExportFilterForm,
): Record<string, unknown> => {
	const kind = schema?.kind as ExportFilterSchemaKind | undefined
	if (kind === "person_groups") return { groupIds: form.groupIds }
	if (kind === "devices") return { deviceIds: parseIdListText(form.deviceIdsText) }
	if (kind === "locations") return { locationIds: parseIdListText(form.locationIdsText) }
	if (kind === "operational") {
		return {
			eventKinds: parseCsvListText(form.eventKindsText),
			sources: parseCsvListText(form.sourcesText),
		}
	}
	if (kind === "alerts") {
		return {
			sources: parseCsvListText(form.sourcesText),
			statuses: parseCsvListText(form.statusesText),
		}
	}
	return {}
}

export const isGroupFilterRequired = (schema: ExportFilterSchema | null | undefined) =>
	schema?.kind === "person_groups" && schema.required === true
