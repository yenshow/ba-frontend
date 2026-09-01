/** 營運設定表單（GET|PUT /api/runtime-config） */

export type RuntimeConfigFieldKind = "text" | "number" | "boolean"

export type RuntimeConfigField = {
	key: string
	label: string
	kind: RuntimeConfigFieldKind
}

export type RuntimeConfigSection = {
	title: string
	fields: RuntimeConfigField[]
}

export type RuntimeConfigSchema = {
	sections: RuntimeConfigSection[]
}

export type RuntimeDailyTimeFieldBinding = {
	extraKey: string
	hourKey: string
	minuteKey: string
	label: string
	sectionMatch: (section: RuntimeConfigSection) => boolean
}

/** 前端虛擬欄位（不送 API） */
export const RUNTIME_FORM_EXTRA_KEYS = {
	backupDailyTime: "__backupDailyTime",
	isapiTimeSyncDailyTime: "__isapiTimeSyncDailyTime",
} as const

export const RUNTIME_DAILY_TIME_FIELDS: RuntimeDailyTimeFieldBinding[] = [
	{
		extraKey: RUNTIME_FORM_EXTRA_KEYS.backupDailyTime,
		hourKey: "BACKUP_DAILY_LOCAL_HOUR",
		minuteKey: "BACKUP_DAILY_LOCAL_MINUTE",
		label: "每日備份時刻",
		sectionMatch: (section) =>
			section.fields.some((field) => field.key === "BACKUP_ROOT_DIR"),
	},
	{
		extraKey: RUNTIME_FORM_EXTRA_KEYS.isapiTimeSyncDailyTime,
		hourKey: "ISAPI_TIME_SYNC_DAILY_LOCAL_HOUR",
		minuteKey: "ISAPI_TIME_SYNC_DAILY_LOCAL_MINUTE",
		label: "每日校時時刻",
		sectionMatch: (section) =>
			section.fields.some((field) => field.key === "ISAPI_TIME_SYNC_ENABLED"),
	},
]

/** 環境設定頁表單控制項共用樣式 */
export const RUNTIME_FIELD_INPUT_CLASS =
	"w-full min-w-0 rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm text-white focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 2xl:text-base"

export const mergeRuntimeFormValues = (
	schema: RuntimeConfigSchema,
	values: Record<string, string>,
): Record<string, string> => {
	const out: Record<string, string> = {}
	for (const section of schema.sections) {
		for (const field of section.fields) {
			out[field.key] = values[field.key] ?? ""
		}
	}
	return out
}

export type RuntimeGridField =
	| { type: "schema"; field: RuntimeConfigField }
	| { type: "dailyTime"; binding: RuntimeDailyTimeFieldBinding }

/** 區塊內兩欄排版用欄位順序（含虛擬欄位） */
export const getSectionGridFields = (section: RuntimeConfigSection): RuntimeGridField[] => {
	const items: RuntimeGridField[] = []
	for (const field of section.fields) {
		items.push({ type: "schema", field })
	}
	for (const binding of RUNTIME_DAILY_TIME_FIELDS) {
		if (binding.sectionMatch(section)) {
			items.push({ type: "dailyTime", binding })
		}
	}
	return items
}

const positiveInt = (raw: string): boolean => {
	const n = Number(raw)
	return Number.isFinite(n) && Number.isInteger(n) && n >= 1
}

const isAbsolutePath = (raw: string): boolean => /^([A-Za-z]:[\\/]|\\\\|\/)/.test(raw)

const trimField = (values: Record<string, string>, key: string): string =>
	String(values[key] ?? "").trim()

const pad2 = (n: number) => String(n).padStart(2, "0")

export const formatDailyTimeFromKeys = (
	values: Record<string, string>,
	hourKey: string,
	minuteKey: string,
): string => {
	const h = Math.min(23, Math.max(0, Number(values[hourKey] ?? 0)))
	const m = Math.min(59, Math.max(0, Number(values[minuteKey] ?? 0)))
	if (!Number.isInteger(h) || !Number.isInteger(m)) return "00:00"
	return `${pad2(h)}:${pad2(m)}`
}

export const formatBackupDailyTime = (values: Record<string, string>): string =>
	formatDailyTimeFromKeys(
		values,
		"BACKUP_DAILY_LOCAL_HOUR",
		"BACKUP_DAILY_LOCAL_MINUTE",
	)

export const decorateRuntimeFormExtras = (
	values: Record<string, string>,
): Record<string, string> => {
	const extras: Record<string, string> = {}
	for (const binding of RUNTIME_DAILY_TIME_FIELDS) {
		extras[binding.extraKey] = formatDailyTimeFromKeys(
			values,
			binding.hourKey,
			binding.minuteKey,
		)
	}
	return extras
}

export const parseBackupDailyTime = (
	raw: string,
): { hour: number; minute: number } | null => {
	const m = String(raw ?? "")
		.trim()
		.match(/^(\d{1,2}):(\d{2})$/)
	if (!m) return null
	const hour = Number(m[1])
	const minute = Number(m[2])
	if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null
	if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null
	return { hour, minute }
}

export const parseDailyTime = parseBackupDailyTime

/**
 * 合併 schema 欄位、虛擬欄位
 */
export const buildRuntimePayloadForSave = (
	schema: RuntimeConfigSchema,
	form: Record<string, string>,
): Record<string, string> => {
	const payload = mergeRuntimeFormValues(schema, form)

	for (const binding of RUNTIME_DAILY_TIME_FIELDS) {
		const parsed = parseDailyTime(form[binding.extraKey] ?? "")
		if (parsed) {
			payload[binding.hourKey] = String(parsed.hour)
			payload[binding.minuteKey] = String(parsed.minute)
		}
	}

	return payload
}

/**
 * 營運設定儲存前 client 驗證；規則鏡像 ba-backend runtimeConfigService.validateValues
 * （不含 BACKUP_ROOT_DIR 寫入測試）
 */
export const validateRuntimeConfigForSave = (
	schema: RuntimeConfigSchema,
	form: Record<string, string>,
): string | null => {
	for (const binding of RUNTIME_DAILY_TIME_FIELDS) {
		const raw = trimField(form, binding.extraKey)
		if (raw && !parseDailyTime(raw)) {
			return `${binding.label}格式須為 HH:mm（例：00:00）`
		}
	}

	const payload = buildRuntimePayloadForSave(schema, form)

	for (const k of ["BACKUP_ARCHIVE_AFTER_DAYS", "BACKUP_ONLINE_RETENTION_DAYS"]) {
		const raw = trimField(payload, k)
		if (raw && !positiveInt(raw)) return `${k} 須為大於 0 的整數`
	}

	const archiveDays = Number(trimField(payload, "BACKUP_ARCHIVE_AFTER_DAYS") || "7")
	const onlineDays = Number(trimField(payload, "BACKUP_ONLINE_RETENTION_DAYS") || "365")
	if (
		Number.isInteger(archiveDays) &&
		Number.isInteger(onlineDays) &&
		onlineDays < archiveDays + 1
	) {
		return "線上資料保留天數須大於「逾此天數寫入備份檔」"
	}

	const rootDir = trimField(payload, "BACKUP_ROOT_DIR")
	if (rootDir && !isAbsolutePath(rootDir)) {
		return "BACKUP_ROOT_DIR 必須為絕對路徑"
	}

	const enabledRaw = trimField(payload, "ISAPI_TIME_SYNC_ENABLED").toLowerCase()
	if (enabledRaw && enabledRaw !== "true" && enabledRaw !== "false") {
		return "ISAPI 校時啟用須為 true 或 false"
	}

	return null
}

export const isRuntimeBooleanTrue = (raw: string | undefined | null): boolean =>
	String(raw ?? "true").trim().toLowerCase() !== "false"

export const setRuntimeBooleanValue = (raw: string | undefined | null, checked: boolean): string =>
	checked ? "true" : "false"
