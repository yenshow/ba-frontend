/**
 * 環境設定表單：欄位定義與 .env 互轉。僅管理列出的鍵；儲存會重寫表單涵蓋的區塊。
 * LICENSE_* 不由表單編輯；自原檔讀取並於儲存時原樣寫回（不經表單修改）。
 */

export type EnvFormFieldKind = "text" | "password" | "textarea" | "number" | "select"

export type EnvFormFieldOption = { value: string; label: string }

export type EnvFormField = {
	key: string
	/** 表單顯示用中文標籤 */
	label: string
	kind: EnvFormFieldKind
	options?: EnvFormFieldOption[]
}

export type EnvFormSection = {
	title: string
	fileHeader: string
	fields: EnvFormField[]
	layoutGroup?: number
}

/** 自 .env 讀寫但不在表單顯示的授權鍵（順序用於序列化） */
export const LICENSE_PRESERVE_ORDER = [
	"LICENSE_DEPLOYMENT_PROFILE",
	"LICENSE_OPEN_ALL_FEATURES",
	"LICENSE_PLATFORM_API_BASE_URL",
	"LICENSE_SIGN_SECRET",
] as const

const LICENSE_PRESERVE_SET = new Set<string>(LICENSE_PRESERVE_ORDER)

/** 舊備份 env 鍵：載入時遷移至新鍵，儲存時不再寫回 */
const BACKUP_ENV_LEGACY_ALIASES: Record<string, string> = {
	BACKUP_DATABASE_CUTOFF_DAYS: "BACKUP_RETENTION_DAYS",
	BACKUP_ARCHIVE_FILE_RETENTION_DAYS: "BACKUP_FILE_RETENTION_DAYS",
}

const BACKUP_ENV_LEGACY_KEYS = new Set<string>(Object.values(BACKUP_ENV_LEGACY_ALIASES))

const applyBackupEnvAliases = (
	values: Record<string, string>,
	all: Record<string, string>,
): void => {
	for (const [newKey, legacyKey] of Object.entries(BACKUP_ENV_LEGACY_ALIASES)) {
		if (!values[newKey]?.trim() && all[legacyKey]?.trim()) {
			values[newKey] = all[legacyKey]
		}
	}
}

export const ENV_FORM_SECTIONS: EnvFormSection[] = [
	{
		title: "伺服器",
		fileHeader: "伺服器",
		layoutGroup: 1,
		fields: [
			{ key: "HOST", label: "監聽位址", kind: "text" },
			{ key: "PORT", label: "埠號", kind: "number" },
			{ key: "CORS_ORIGINS", label: "跨域來源", kind: "textarea" },
		],
	},
	{
		title: "JWT",
		fileHeader: "JWT（正式環境務必改為強隨機字串）",
		layoutGroup: 1,
		fields: [
			{ key: "JWT_SECRET", label: "JWT 密鑰", kind: "password" },
			{ key: "JWT_EXPIRES_IN", label: "JWT 有效期限", kind: "text" },
		],
	},
	{
		title: "主資料庫（PostgreSQL）",
		fileHeader: "主資料庫（PostgreSQL）",
		layoutGroup: 2,
		fields: [
			{ key: "DB_HOST", label: "資料庫主機", kind: "text" },
			{ key: "DB_PORT", label: "資料庫埠號", kind: "number" },
			{ key: "DB_NAME", label: "資料庫名稱", kind: "text" },
			{ key: "DB_USER", label: "資料庫使用者", kind: "text" },
			{ key: "DB_PASSWORD", label: "資料庫密碼", kind: "password" },
		],
	},
	{
		title: "外部資料庫",
		fileHeader: "外部資料庫",
		layoutGroup: 2,
		fields: [
			{ key: "EXTERNAL_DB_HOST", label: "外部資料庫主機", kind: "text" },
			{ key: "EXTERNAL_DB_PORT", label: "外部資料庫埠號", kind: "number" },
			{ key: "EXTERNAL_DB_USER", label: "外部資料庫使用者", kind: "text" },
			{ key: "EXTERNAL_DB_PASSWORD", label: "外部資料庫密碼", kind: "password" },
			{ key: "EXTERNAL_DB_NAME", label: "外部資料庫名稱", kind: "text" },
		],
	},
	{
		title: "YSCP",
		fileHeader: "YSCP",
		fields: [
			{ key: "YSCP_HOST", label: "YSCP 主機", kind: "text" },
			{ key: "YSCP_AK", label: "存取金鑰（AK）", kind: "password" },
			{ key: "YSCP_SK", label: "私密金鑰（SK）", kind: "password" },
			{ key: "YSCP_API_VER", label: "API 版本", kind: "text" },
		],
	},
	{
		title: "功能開關",
		fileHeader: "功能開關（布林；未設定時為 true）",
		layoutGroup: 3,
		fields: [
			{
				key: "ENABLE_YSCP_PEOPLE_COUNTING",
				label: "啟用 YSCP 人流",
				kind: "select",
				options: [
					{ value: "true", label: "是（讀取 YSCP 人流）" },
					{ value: "false", label: "否（略過 YSCP 人流）" },
				],
			},
		],
	},
	{
		title: "MediaMTX（串流）",
		fileHeader: "MediaMTX（串流）",
		layoutGroup: 3,
		fields: [
			{ key: "MEDIAMTX_API_BASE_URL", label: "API 基礎網址", kind: "text" },
			{ key: "MEDIAMTX_WEBRTC_BASE_URL", label: "WebRTC 基礎網址", kind: "text" },
		],
	},
	{
		title: "警報日界線",
		fileHeader: "警報日界線（每日批次 active→resolved、連動 DO 復歸；忽視僅當曆日阻擋）",
		fields: [
			{ key: "ALERT_DAILY_ROLLOVER_TZ", label: "時區", kind: "text" },
			{ key: "ALERT_DAILY_ROLLOVER_LOCAL_HOUR", label: "本地小時", kind: "number" },
			{ key: "ALERT_DAILY_ROLLOVER_LOCAL_MINUTE", label: "本地分鐘", kind: "number" },
		],
	},
	{
		title: "備份排程",
		fileHeader:
			"備份排程（環境僅歸檔 raw；啟動後立即執行一輪；變更後請 PM2 重啟）",
		fields: [
			{ key: "BACKUP_DATABASE_CUTOFF_DAYS", label: "線上資料保留天數", kind: "number" },
			{ key: "BACKUP_ARCHIVE_FILE_RETENTION_DAYS", label: "備份檔保留天數", kind: "number" },
			{ key: "BACKUP_SCHEDULER_INTERVAL", label: "排程間隔（毫秒）", kind: "number" },
		],
	},
]

export const KNOWN_ENV_FORM_KEYS = new Set(ENV_FORM_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)))

const ENV_FORM_FIELD_LABELS = new Map(
	ENV_FORM_SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f.label] as const)),
)

export const getEnvFormFieldLabel = (key: string): string => ENV_FORM_FIELD_LABELS.get(key) ?? key

const parseQuotedDouble = (raw: string): string => {
	let out = ""
	for (let i = 1; i < raw.length; i++) {
		const c = raw[i]
		if (c === '"') break
		if (c === "\\" && i + 1 < raw.length) {
			const n = raw[i + 1]
			if (n === "n") {
				out += "\n"
				i++
				continue
			}
			if (n === "r") {
				out += "\r"
				i++
				continue
			}
			if (n === "t") {
				out += "\t"
				i++
				continue
			}
			out += n
			i++
			continue
		}
		out += c
	}
	return out
}

const parseQuotedSingle = (raw: string): string => {
	let out = ""
	for (let i = 1; i < raw.length; i++) {
		const c = raw[i]
		if (c === "'") break
		out += c
	}
	return out
}

const parseEnvLineValue = (raw: string): string => {
	const t = raw.replace(/\r$/, "").trim()
	if (t.startsWith('"')) return parseQuotedDouble(t)
	if (t.startsWith("'")) return parseQuotedSingle(t)
	return t
}

const parseAllAssignments = (content: string): Record<string, string> => {
	const all: Record<string, string> = {}
	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith("#")) continue
		const eq = line.indexOf("=")
		if (eq <= 0) continue
		const keyPart = line.slice(0, eq).trim()
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(keyPart)) continue
		all[keyPart] = parseEnvLineValue(line.slice(eq + 1))
	}
	return all
}

export type ParsedEnvFile = {
	values: Record<string, string>
	unknownKeys: string[]
	preservedLicense: Record<string, string>
}

export const parseEnvFileContent = (content: string): ParsedEnvFile => {
	const all = parseAllAssignments(content)
	const values: Record<string, string> = {}
	const preservedLicense: Record<string, string> = {}
	const unknownOrder: string[] = []
	const seenUnknown = new Set<string>()

	for (const [key, val] of Object.entries(all)) {
		if (KNOWN_ENV_FORM_KEYS.has(key)) {
			values[key] = val
		} else if (LICENSE_PRESERVE_SET.has(key)) {
			preservedLicense[key] = val
		} else if (BACKUP_ENV_LEGACY_KEYS.has(key)) {
			// 舊鍵：略過 unknown，於下方 migrate 至新鍵
		} else if (!seenUnknown.has(key)) {
			seenUnknown.add(key)
			unknownOrder.push(key)
		}
	}

	applyBackupEnvAliases(values, all)

	return { values, unknownKeys: unknownOrder, preservedLicense }
}

const needsEnvQuoting = (v: string): boolean =>
	v !== "" && (/[\s#"'=]/.test(v) || v.includes("\n") || v.includes("\r"))

const escapeEnvValue = (v: string): string => {
	if (v === "") return ""
	if (!needsEnvQuoting(v)) return v
	return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`
}

export const serializeEnvFormValues = (
	values: Record<string, string>,
	preservedLicense: Record<string, string> = {},
): string => {
	const lines: string[] = []
	for (const section of ENV_FORM_SECTIONS) {
		lines.push(`# --- ${section.fileHeader} ---`)
		for (const field of section.fields) {
			lines.push(`${field.key}=${escapeEnvValue(values[field.key] ?? "")}`)
		}
		lines.push("")
	}
	const licenseKeys = LICENSE_PRESERVE_ORDER.filter((k) => k in preservedLicense)
	if (licenseKeys.length > 0) {
		lines.push("# --- 授權 ---")
		for (const key of licenseKeys) {
			lines.push(`${key}=${escapeEnvValue(preservedLicense[key] ?? "")}`)
		}
		lines.push("")
	}
	return lines.join("\n").replace(/\s+$/, "\n")
}

export const createEmptyEnvFormValues = (): Record<string, string> => {
	const o: Record<string, string> = {}
	for (const key of KNOWN_ENV_FORM_KEYS) o[key] = ""
	return o
}

const clusterEnvFormSectionsForLayout = (sections: EnvFormSection[]): EnvFormSection[][] => {
	const rows: EnvFormSection[][] = []
	let buf: EnvFormSection[] = []
	let bufKey: number | null = null
	for (const s of sections) {
		const g = s.layoutGroup
		if (g === undefined) {
			if (buf.length) {
				rows.push(buf)
				buf = []
				bufKey = null
			}
			rows.push([s])
			continue
		}
		if (buf.length === 0) {
			buf = [s]
			bufKey = g
			continue
		}
		if (g === bufKey) buf.push(s)
		else {
			rows.push(buf)
			buf = [s]
			bufKey = g
		}
	}
	if (buf.length) rows.push(buf)
	return rows
}

export const ENV_FORM_SECTION_ROWS = clusterEnvFormSectionsForLayout(ENV_FORM_SECTIONS)

export const normalizeEnvFormValuesFromParsed = (parsed: Record<string, string>): Record<string, string> => {
	const merged = { ...createEmptyEnvFormValues(), ...parsed }
	const y = merged.ENABLE_YSCP_PEOPLE_COUNTING?.trim().toLowerCase()
	merged.ENABLE_YSCP_PEOPLE_COUNTING = y === "false" || y === "0" || y === "no" ? "false" : "true"
	return merged
}

export const validateEnvFormValues = (form: Record<string, string>): string | null => {
	const portOk = (raw: string) => {
		const n = Number(raw)
		return Number.isInteger(n) && n >= 1 && n <= 65535
	}
	for (const k of ["PORT", "DB_PORT", "EXTERNAL_DB_PORT"] as const) {
		const raw = form[k]?.trim() ?? ""
		if (raw && !portOk(raw)) return `${getEnvFormFieldLabel(k)} 須為 1–65535 的整數`
	}
	const positiveInt = (raw: string) => {
		const n = Number(raw)
		return Number.isFinite(n) && Number.isInteger(n) && n >= 1
	}
	for (const k of [
		"BACKUP_DATABASE_CUTOFF_DAYS",
		"BACKUP_ARCHIVE_FILE_RETENTION_DAYS",
	] as const) {
		const raw = form[k]?.trim() ?? ""
		if (raw && !positiveInt(raw)) return `${getEnvFormFieldLabel(k)} 須為大於 0 的整數`
	}
	const intervalRaw = form.BACKUP_SCHEDULER_INTERVAL?.trim() ?? ""
	if (intervalRaw && !positiveInt(intervalRaw)) {
		return `${getEnvFormFieldLabel("BACKUP_SCHEDULER_INTERVAL")} 須為大於 0 的整數（毫秒）`
	}
	const h = form.ALERT_DAILY_ROLLOVER_LOCAL_HOUR?.trim() ?? ""
	if (h) {
		const n = Number(h)
		if (!Number.isInteger(n) || n < 0 || n > 23) {
			return `${getEnvFormFieldLabel("ALERT_DAILY_ROLLOVER_LOCAL_HOUR")} 須為 0–23`
		}
	}
	const m = form.ALERT_DAILY_ROLLOVER_LOCAL_MINUTE?.trim() ?? ""
	if (m) {
		const n = Number(m)
		if (!Number.isInteger(n) || n < 0 || n > 59) {
			return `${getEnvFormFieldLabel("ALERT_DAILY_ROLLOVER_LOCAL_MINUTE")} 須為 0–59`
		}
	}
	return null
}
