export type AccessControlFieldKey =
	| "employeeId"
	| "personName"
	| "personGroup"
	| "deviceName"
	| "deviceScreenshot"
	| "eventDateTime"
	| "eventDate"
	| "eventTime"
	| "cardNo"

export type AccessControlFieldCatalogItem = {
	key: AccessControlFieldKey
	label: string
	required?: boolean
	requiresFormat?: boolean
}

export const EXPORT_FIELD_FORMAT_PLACEHOLDER: Partial<Record<AccessControlFieldKey, string>> = {
	eventDateTime: "yyyy-MM-dd HH:mm:ss",
	eventDate: "yyyy-MM-dd",
	eventTime: "HH:mm:ss",
}

export const getExportFieldFormatPlaceholder = (key: string) =>
	EXPORT_FIELD_FORMAT_PLACEHOLDER[key as AccessControlFieldKey] ?? ""

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
