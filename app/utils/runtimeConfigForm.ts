/** 營運設定表單（GET|PUT /api/runtime-config） */



export type RuntimeConfigFieldKind = "text" | "number"



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



/** 前端虛擬欄位（不送 API） */

export const RUNTIME_FORM_EXTRA_KEYS = {

	backupDailyTime: "__backupDailyTime",

} as const



/** 環境設定頁表單控制項共用樣式 */

export const RUNTIME_FIELD_INPUT_CLASS =

	"w-full min-w-0 rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm text-white focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 2xl:text-base"



export const mergeRuntimeFormValues = (

	schema: RuntimeConfigSchema,

	values: Record<string, string>

): Record<string, string> => {

	const out: Record<string, string> = {}

	for (const section of schema.sections) {

		for (const field of section.fields) {

			out[field.key] = values[field.key] ?? ""

		}

	}

	return out

}



const isBackupSection = (section: RuntimeConfigSection) =>

	section.fields.some((f) => f.key === "BACKUP_ROOT_DIR")



export type RuntimeGridField =

	| { type: "schema"; field: RuntimeConfigField }

	| { type: "backupDailyTime" }



/** 區塊內兩欄排版用欄位順序（含虛擬欄位） */

export const getSectionGridFields = (section: RuntimeConfigSection): RuntimeGridField[] => {

	const items: RuntimeGridField[] = []

	for (const field of section.fields) {

		items.push({ type: "schema", field })

	}

	if (isBackupSection(section)) {

		items.push({ type: "backupDailyTime" })

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



export const formatBackupDailyTime = (values: Record<string, string>): string => {

	const h = Math.min(23, Math.max(0, Number(values.BACKUP_DAILY_LOCAL_HOUR ?? 0)))

	const m = Math.min(59, Math.max(0, Number(values.BACKUP_DAILY_LOCAL_MINUTE ?? 0)))

	if (!Number.isInteger(h) || !Number.isInteger(m)) return "00:00"

	return `${pad2(h)}:${pad2(m)}`

}



export const decorateRuntimeFormExtras = (

	values: Record<string, string>

): Record<string, string> => ({

	[RUNTIME_FORM_EXTRA_KEYS.backupDailyTime]: formatBackupDailyTime(values),

})



export const parseBackupDailyTime = (

	raw: string

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



/**

 * 合併 schema 欄位、虛擬欄位

 */

export const buildRuntimePayloadForSave = (

	schema: RuntimeConfigSchema,

	form: Record<string, string>

): Record<string, string> => {

	const payload = mergeRuntimeFormValues(schema, form)



	const backupDaily = parseBackupDailyTime(form[RUNTIME_FORM_EXTRA_KEYS.backupDailyTime] ?? "")

	if (backupDaily) {

		payload.BACKUP_DAILY_LOCAL_HOUR = String(backupDaily.hour)

		payload.BACKUP_DAILY_LOCAL_MINUTE = String(backupDaily.minute)

	}



	return payload

}



/**

 * 營運設定儲存前 client 驗證；規則鏡像 ba-backend runtimeConfigService.validateValues

 * （不含 BACKUP_ROOT_DIR 寫入測試）

 */

export const validateRuntimeConfigForSave = (

	schema: RuntimeConfigSchema,

	form: Record<string, string>

): string | null => {

	const backupDailyRaw = trimField(form, RUNTIME_FORM_EXTRA_KEYS.backupDailyTime)

	if (backupDailyRaw && !parseBackupDailyTime(backupDailyRaw)) {

		return "每日備份時刻格式須為 HH:mm（例：00:00）"

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



	return null

}

