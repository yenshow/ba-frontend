export type ExportFormatKind = "datetime" | "date" | "time"

export type ExportFieldCatalogItem = {
	key: string
	label: string
	required?: boolean
	requiresFormat?: boolean
	formatKind?: ExportFormatKind
	/** 無平台資料、匯出固定空字串；輸出表頭／第三方欄名由使用者自訂 */
	constantEmpty?: boolean
}

export type ExportEventTypeId =
	| "access_control"
	| "energy"
	| "operational"
	| "vehicle"
	| "alerts"
	| "environment"

export type ExportEventTypeInfo = {
	id: ExportEventTypeId | string
	label: string
	filterSchema?: {
		kind: string
		required?: boolean
		fields?: Array<{
			key: string
			type: string
			label: string
			required?: boolean
			enum?: string[]
			enumLabels?: Record<string, string>
		}>
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
	{ value: "access_control", label: "門禁管理／進出" },
	{ value: "energy", label: "能源讀數" },
	{ value: "operational", label: "營運事件" },
	{ value: "vehicle", label: "車輛進出" },
	{ value: "alerts", label: "警報事件" },
	{ value: "environment", label: "環境數值" },
]

export type FormDropdownOption = { value: string; label: string }

/** readonly 選項 → FilterDropdown 可用陣列 */
export const toDropdownOptions = (
	options: ReadonlyArray<{ readonly value: string; readonly label: string }>,
): FormDropdownOption[] => options.map((o) => ({ value: o.value, label: o.label }))

const getGrainField = (schema: ExportFilterSchema | null | undefined) =>
	schema?.fields?.find((f) => f.key === "grain") ?? null

export const schemaHasGrain = (schema: ExportFilterSchema | null | undefined) =>
	Boolean(getGrainField(schema))

/** 由 filterSchema.grain（含 enum／enumLabels）驅動「匯出粒度」下拉 */
export const resolveExportMode = (
	schema: ExportFilterSchema | null | undefined,
): { options: FormDropdownOption[] } | null => {
	const field = getGrainField(schema)
	const values = field?.enum
	if (!values?.length) return null
	const labels = field.enumLabels || {}
	return {
		options: values.map((value) => ({
			value,
			label: labels[value] || value,
		})),
	}
}

/** 依 schema 正規化 grain；相容舊存檔 punchMode */
export const normalizeGrainBySchema = (
	schema: ExportFilterSchema | null | undefined,
	raw: unknown,
	legacyPunchMode?: unknown,
): string => {
	const field = getGrainField(schema)
	const allowed = field?.enum?.length ? field.enum : ["raw", "hourly"]
	const fallback = allowed.includes("hourly") ? "hourly" : allowed[0] || "raw"
	const v = String(raw ?? legacyPunchMode ?? "")
		.trim()
		.toLowerCase()
	return allowed.includes(v) ? v : fallback
}

/** 檔名用日期格式 */
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

/** 檔名用時間格式 */
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

/** 欄位：日期 */
export const FIELD_DATE_FORMAT_OPTIONS = [
	{ label: "yyyy-MM-dd", value: "yyyy-MM-dd" },
	{ label: "yyyy/MM/dd", value: "yyyy/MM/dd" },
	{ label: "yyyyMMdd", value: "yyyyMMdd" },
	{ label: "dd-MM-yyyy", value: "dd-MM-yyyy" },
	{ label: "dd/MM/yyyy", value: "dd/MM/yyyy" },
	{ label: "MM/dd/yyyy", value: "MM/dd/yyyy" },
]

/** 欄位：時間 */
export const FIELD_TIME_FORMAT_OPTIONS = [
	{ label: "HH:mm:ss", value: "HH:mm:ss" },
	{ label: "HH:mm", value: "HH:mm" },
	{ label: "HHmmss", value: "HHmmss" },
	{ label: "HHmm", value: "HHmm" },
]

/** 欄位：日期時間 */
export const DATETIME_FORMAT_OPTIONS = [
	{ label: "yyyy-MM-dd HH:mm:ss", value: "yyyy-MM-dd HH:mm:ss" },
	{ label: "yyyy-MM-dd HH:mm", value: "yyyy-MM-dd HH:mm" },
	{ label: "yyyy/MM/dd HH:mm:ss", value: "yyyy/MM/dd HH:mm:ss" },
	{ label: "yyyy/MM/dd HH:mm", value: "yyyy/MM/dd HH:mm" },
]

export const getFormatOptionsForField = (
	field: Pick<ExportFieldCatalogItem, "requiresFormat" | "formatKind">,
): FormDropdownOption[] => {
	if (!field.requiresFormat) return []
	if (field.formatKind === "date") return FIELD_DATE_FORMAT_OPTIONS
	if (field.formatKind === "time") return FIELD_TIME_FORMAT_OPTIONS
	return DATETIME_FORMAT_OPTIONS
}

export const getDefaultFormatForField = (
	field: Pick<ExportFieldCatalogItem, "requiresFormat" | "formatKind">,
): string => getFormatOptionsForField(field)[0]?.value ?? ""

export const OUTPUT_FORMAT_OPTIONS = [
	{ value: "csv", label: "CSV" },
	{ value: "txt", label: "TXT" },
]

export const STORAGE_TYPE_OPTIONS = [
	{ value: "local", label: "本機儲存" },
	{ value: "sftp", label: "SFTP 儲存" },
]

export const DB_SYNC_DB_TYPE_OPTIONS = [
	{ value: "postgres", label: "PostgreSQL" },
	{ value: "sqlserver", label: "SQL Server" },
	{ value: "mysql", label: "MySQL" },
]

export const DB_SYNC_DEFAULT_PUSH_TIME = "18:00"

export const RECORD_EXPORT_DEFAULT_EXPORT_TIME = "00:00"

export const SCHEDULE_FREQ_OPTIONS = [
	{ value: "daily", label: "每日" },
	{ value: "weekly", label: "每週" },
	{ value: "monthly", label: "每月" },
] as const

export type ScheduleFreq = (typeof SCHEDULE_FREQ_OPTIONS)[number]["value"]

export const WEEKDAY_OPTIONS = [
	{ value: "1", label: "星期一" },
	{ value: "2", label: "星期二" },
	{ value: "3", label: "星期三" },
	{ value: "4", label: "星期四" },
	{ value: "5", label: "星期五" },
	{ value: "6", label: "星期六" },
	{ value: "7", label: "星期日" },
]

export const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
	const d = i + 1
	return { value: String(d), label: `${d} 日` }
})

export const normalizeScheduleFreq = (raw: unknown): ScheduleFreq => {
	const v = String(raw ?? "daily").trim().toLowerCase()
	if (v === "weekly" || v === "monthly") return v
	return "daily"
}

export const normalizeScheduleDay = (freq: ScheduleFreq, raw: unknown): number | null => {
	if (freq === "daily") return null
	const n = Number(raw)
	if (!Number.isFinite(n)) return null
	const day = Math.trunc(n)
	if (freq === "weekly" && day >= 1 && day <= 7) return day
	if (freq === "monthly" && day >= 1 && day <= 31) return day
	return null
}

export const formatExportScheduleLabel = (
	freqRaw: unknown,
	dayRaw: unknown,
	timeRaw: unknown,
): string => {
	const freq = normalizeScheduleFreq(freqRaw)
	const time = String(timeRaw ?? "").trim() || "00:00"
	if (freq === "daily") return `每日 ${time}`
	if (freq === "weekly") {
		const day = normalizeScheduleDay("weekly", dayRaw) ?? 5
		const short = ["一", "二", "三", "四", "五", "六", "日"][day - 1] ?? String(day)
		return `每週${short} ${time}`
	}
	const day = normalizeScheduleDay("monthly", dayRaw) ?? 1
	return `每月 ${day} 日 ${time}`
}

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
	grain: string
}

export const buildFilterPayloadFromForm = (
	schema: ExportFilterSchema | null | undefined,
	form: RecordExportFilterForm,
): Record<string, unknown> => {
	const kind = schema?.kind as ExportFilterSchemaKind | undefined
	const extra = schemaHasGrain(schema)
		? { grain: normalizeGrainBySchema(schema, form.grain) }
		: {}
	if (kind === "person_groups") return { groupIds: form.groupIds, ...extra }
	if (kind === "devices") {
		return { deviceIds: parseIdListText(form.deviceIdsText), ...extra }
	}
	if (kind === "locations") {
		return { locationIds: parseIdListText(form.locationIdsText), ...extra }
	}
	if (kind === "operational") {
		return {
			eventKinds: parseCsvListText(form.eventKindsText),
			sources: parseCsvListText(form.sourcesText),
			...extra,
		}
	}
	if (kind === "alerts") {
		return {
			sources: parseCsvListText(form.sourcesText),
			statuses: parseCsvListText(form.statusesText),
			...extra,
		}
	}
	return { ...extra }
}

export const isGroupFilterRequired = (schema: ExportFilterSchema | null | undefined) =>
	schema?.kind === "person_groups" && schema.required === true
