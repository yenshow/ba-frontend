/** 營運設定表單（GET|PUT /api/runtime-config） */

export type RuntimeConfigFieldKind = "text" | "password" | "number";

export type RuntimeConfigField = {
	key: string;
	label: string;
	kind: RuntimeConfigFieldKind;
};

export type RuntimeConfigSection = {
	title: string;
	fields: RuntimeConfigField[];
};

export type RuntimeConfigSchema = {
	sections: RuntimeConfigSection[];
};

export const mergeRuntimeFormValues = (
	schema: RuntimeConfigSchema,
	values: Record<string, string>
): Record<string, string> => {
	const out: Record<string, string> = {};
	for (const section of schema.sections) {
		for (const field of section.fields) {
			out[field.key] = values[field.key] ?? "";
		}
	}
	return out;
};

export const getRuntimeSectionRows = (schema: RuntimeConfigSchema) =>
	schema.sections.map(section => [section]);

const positiveInt = (raw: string): boolean => {
	const n = Number(raw);
	return Number.isFinite(n) && Number.isInteger(n) && n >= 1;
};

const isAbsolutePath = (raw: string): boolean =>
	/^([A-Za-z]:[\\/]|\\\\|\/)/.test(raw);

const trimField = (values: Record<string, string>, key: string): string =>
	String(values[key] ?? "").trim();

const validateOptionalIntRange = (
	raw: string,
	min: number,
	max: number,
	label: string,
): string | null => {
	if (!raw) return null;
	const n = Number(raw);
	if (!Number.isInteger(n) || n < min || n > max) {
		return `${label} 須為 ${min}–${max}`;
	}
	return null;
};

/**
 * 營運設定儲存前 client 驗證；規則鏡像 ba-backend runtimeConfigService.validateValues
 * （不含 BACKUP_ROOT_DIR 寫入測試）
 */
export const validateRuntimeConfigForSave = (values: Record<string, string>): string | null => {
	if (!trimField(values, "YSCP_HOST")) return "主機不可為空白";

	for (const k of ["BACKUP_DATABASE_CUTOFF_DAYS", "BACKUP_ARCHIVE_FILE_RETENTION_DAYS"]) {
		const raw = trimField(values, k);
		if (raw && !positiveInt(raw)) return `${k} 須為大於 0 的整數`;
	}

	const intervalRaw = trimField(values, "BACKUP_SCHEDULER_INTERVAL");
	if (intervalRaw && !positiveInt(intervalRaw)) {
		return "BACKUP_SCHEDULER_INTERVAL 須為大於 0 的整數（毫秒）";
	}

	const rootDir = trimField(values, "BACKUP_ROOT_DIR");
	if (rootDir && !isAbsolutePath(rootDir)) {
		return "BACKUP_ROOT_DIR 必須為絕對路徑";
	}

	return (
		validateOptionalIntRange(
			trimField(values, "ALERT_DAILY_ROLLOVER_LOCAL_HOUR"),
			0,
			23,
			"ALERT_DAILY_ROLLOVER_LOCAL_HOUR",
		) ??
		validateOptionalIntRange(
			trimField(values, "ALERT_DAILY_ROLLOVER_LOCAL_MINUTE"),
			0,
			59,
			"ALERT_DAILY_ROLLOVER_LOCAL_MINUTE",
		)
	);
};
