export const PERSONNEL_MAX_PROFILE_FIELDS = 5
export const PERSONNEL_PROFILE_LABEL_MAX = 16
export const PERSONNEL_PROFILE_VALUE_MAX = 100

export const PERSONNEL_PROFILE_PRESET_KEYS = [
	"job_title",
	"blood_type",
	"insurance",
	"phone",
	"department",
	"emergency_contact",
	"note",
] as const

export type PersonnelProfilePresetKey = (typeof PERSONNEL_PROFILE_PRESET_KEYS)[number]

export type PersonnelProfileFieldPreset = PersonnelProfilePresetKey | "custom"

export type PersonnelProfileField = {
	key: string
	preset: PersonnelProfileFieldPreset
	label: string
}

export const PERSONNEL_TOGGLEABLE_LIST_COLUMNS = [
	"avatar",
	"group",
	"accessData",
	"status",
] as const

export type PersonnelToggleableListColumn = (typeof PERSONNEL_TOGGLEABLE_LIST_COLUMNS)[number]

export type PersonnelListColumns = {
	avatar: boolean
	group: boolean
	accessData: boolean
	status: boolean
	custom: string[]
}

export type PersonnelProfileSchema = {
	fields: PersonnelProfileField[]
	listColumns: PersonnelListColumns
}

export const PERSONNEL_PROFILE_PRESET_CATALOG: Record<
	PersonnelProfilePresetKey,
	{ label: string }
> = {
	job_title: { label: "職稱" },
	blood_type: { label: "血型" },
	insurance: { label: "保險" },
	phone: { label: "電話" },
	department: { label: "部門" },
	emergency_contact: { label: "緊急聯絡人" },
	note: { label: "備註" },
}

export const PERSONNEL_BLOOD_TYPE_SUGGESTIONS = ["A", "B", "AB", "O"] as const

export const PERSONNEL_TOGGLEABLE_LIST_COLUMN_LABELS: Record<
	PersonnelToggleableListColumn,
	string
> = {
	avatar: "頭像",
	group: "群組",
	accessData: "資料（平台）",
	status: "狀態",
}

export const PERSONNEL_LOCKED_LIST_COLUMNS = [
	{ key: "employeeNo", label: "ID" },
	{ key: "fullName", label: "姓名" },
	{ key: "actions", label: "操作" },
] as const

const CUSTOM_KEY_RE = /^custom_(\d+)$/

const DEFAULT_LIST_COLUMNS: PersonnelListColumns = {
	avatar: true,
	group: true,
	accessData: true,
	status: true,
	custom: [],
}

export const emptyPersonnelProfileSchema = (): PersonnelProfileSchema => ({
	fields: [],
	listColumns: { ...DEFAULT_LIST_COLUMNS, custom: [] },
})

export const isPersonnelProfilePresetKey = (
	value: string,
): value is PersonnelProfilePresetKey =>
	(PERSONNEL_PROFILE_PRESET_KEYS as readonly string[]).includes(value)

export const nextPersonnelCustomFieldKey = (fields: PersonnelProfileField[]): string => {
	let max = 0
	for (const field of fields) {
		const m = CUSTOM_KEY_RE.exec(field.key)
		if (m) max = Math.max(max, Number.parseInt(m[1], 10) || 0)
	}
	return `custom_${max + 1}`
}

export const normalizePersonnelProfileSchema = (
	raw: unknown,
): PersonnelProfileSchema => {
	const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
	const incoming = Array.isArray(src.fields) ? src.fields : []
	const fields: PersonnelProfileField[] = []
	const seen = new Set<string>()
	for (const item of incoming) {
		if (fields.length >= PERSONNEL_MAX_PROFILE_FIELDS) break
		if (!item || typeof item !== "object") continue
		const row = item as Record<string, unknown>
		const presetRaw = String(row.preset || "").trim()
		const keyRaw = String(row.key || "").trim()
		const preset: PersonnelProfileFieldPreset | "" = isPersonnelProfilePresetKey(presetRaw)
			? presetRaw
			: presetRaw === "custom" || CUSTOM_KEY_RE.test(keyRaw)
				? "custom"
				: isPersonnelProfilePresetKey(keyRaw)
					? keyRaw
					: ""
		if (!preset) continue
		const key = preset === "custom" ? keyRaw : preset
		if (preset === "custom" && !CUSTOM_KEY_RE.test(key)) continue
		if (preset !== "custom" && key !== preset) continue
		if (seen.has(key)) continue
		const fallback =
			preset === "custom" ? "自訂欄位" : PERSONNEL_PROFILE_PRESET_CATALOG[preset].label
		const label = String(row.label || "").trim().slice(0, PERSONNEL_PROFILE_LABEL_MAX) || fallback
		seen.add(key)
		fields.push({ key, preset, label })
	}

	const listSrc =
		src.listColumns && typeof src.listColumns === "object"
			? (src.listColumns as Record<string, unknown>)
			: {}
	const listColumns: PersonnelListColumns = { ...DEFAULT_LIST_COLUMNS, custom: [] }
	for (const col of PERSONNEL_TOGGLEABLE_LIST_COLUMNS) {
		listColumns[col] = listSrc[col] !== false
	}
	const fieldKeys = new Set(fields.map((f) => f.key))
	const requested = Array.isArray(listSrc.custom)
		? listSrc.custom.map((k) => String(k || "").trim()).filter(Boolean)
		: fields.map((f) => f.key)
	listColumns.custom = requested.filter((k) => fieldKeys.has(k))
	return { fields, listColumns }
}

export const clonePersonnelProfileSchema = (
	schema: PersonnelProfileSchema,
): PersonnelProfileSchema => ({
	fields: schema.fields.map((f) => ({ ...f })),
	listColumns: {
		...schema.listColumns,
		custom: [...schema.listColumns.custom],
	},
})

export const getPersonCustomFieldValue = (
	person: { custom_fields?: Record<string, unknown> | null } | null | undefined,
	key: string,
): string => {
	const raw = person?.custom_fields
	if (!raw || typeof raw !== "object") return ""
	const value = raw[key]
	return value == null ? "" : String(value)
}

export const emptyCustomFieldValues = (fields: PersonnelProfileField[]): Record<string, string> =>
	Object.fromEntries(fields.map((field) => [field.key, ""]))

export const visiblePersonnelCustomFields = (
	schema: PersonnelProfileSchema,
): PersonnelProfileField[] => {
	const visible = new Set(schema.listColumns.custom)
	return schema.fields.filter((field) => visible.has(field.key))
}

export const personnelListTableMinWidth = (visibleCustomCount: number): string =>
	`${720 + visibleCustomCount * 128}px`
