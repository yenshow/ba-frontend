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

export type RuntimeConfigCapabilities = {
	yscpDatabase: boolean;
};

export type RuntimeConfigSideEffects = {
	yscpExternalDb?: { ok: boolean; skipped?: boolean; message?: string };
	alerts?: { ok: boolean; message?: string };
	backup?: { ok: boolean; message?: string };
};

/** 前端虛擬欄位（不送 API） */
export const RUNTIME_FORM_EXTRA_KEYS = {
	alertRolloverTime: "__alertRolloverTime",
	backupIntervalHours: "__backupIntervalHours",
} as const;

export const RUNTIME_SECRET_KEYS = [
	"YSCP_DB_PASSWORD",
	"YSCP_AK",
	"YSCP_SK",
] as const;

/** schema 有定義但由虛擬欄位取代顯示 */
const HIDDEN_SCHEMA_KEYS = new Set([
	"ALERT_DAILY_ROLLOVER_LOCAL_HOUR",
	"ALERT_DAILY_ROLLOVER_LOCAL_MINUTE",
	"BACKUP_SCHEDULER_INTERVAL",
]);

export const RUNTIME_PASSWORD_PLACEHOLDER = "留空表示不變更";

/** 環境設定頁表單控制項共用樣式 */
export const RUNTIME_FIELD_INPUT_CLASS =
	"w-full min-w-0 rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm text-white focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 2xl:text-base";

export const mergeRuntimeFormValues = (
	schema: RuntimeConfigSchema,
	values: Record<string, string>,
): Record<string, string> => {
	const out: Record<string, string> = {};
	for (const section of schema.sections) {
		for (const field of section.fields) {
			out[field.key] = values[field.key] ?? "";
		}
	}
	return out;
};

const isBackupSection = (section: RuntimeConfigSection) =>
	section.fields.some(f => f.key === "BACKUP_SCHEDULER_INTERVAL");

export type RuntimeGridField =
	| { type: "schema"; field: RuntimeConfigField }
	| { type: "alertRolloverTime" }
	| { type: "backupIntervalHours" };

/** 區塊內兩欄排版用欄位順序（含虛擬欄位） */
export const getSectionGridFields = (section: RuntimeConfigSection): RuntimeGridField[] => {
	const items: RuntimeGridField[] = [];
	for (const field of section.fields) {
		if (HIDDEN_SCHEMA_KEYS.has(field.key)) continue;
		items.push({ type: "schema", field });
		if (field.key === "ALERT_DAILY_ROLLOVER_TZ") {
			items.push({ type: "alertRolloverTime" });
		}
	}
	if (isBackupSection(section)) {
		items.push({ type: "backupIntervalHours" });
	}
	return items;
};

const positiveInt = (raw: string): boolean => {
	const n = Number(raw);
	return Number.isFinite(n) && Number.isInteger(n) && n >= 1;
};

const isAbsolutePath = (raw: string): boolean =>
	/^([A-Za-z]:[\\/]|\\\\|\/)/.test(raw);

const trimField = (values: Record<string, string>, key: string): string =>
	String(values[key] ?? "").trim();

const pad2 = (n: number) => String(n).padStart(2, "0");

export const formatAlertRolloverTime = (values: Record<string, string>): string => {
	const h = Math.min(23, Math.max(0, Number(values.ALERT_DAILY_ROLLOVER_LOCAL_HOUR ?? 0)));
	const m = Math.min(59, Math.max(0, Number(values.ALERT_DAILY_ROLLOVER_LOCAL_MINUTE ?? 5)));
	if (!Number.isInteger(h) || !Number.isInteger(m)) return "00:05";
	return `${pad2(h)}:${pad2(m)}`;
};

export const msToBackupIntervalHours = (msRaw: string | undefined): string => {
	const ms = Number(msRaw);
	if (!Number.isFinite(ms) || ms < 1) return "24";
	const hours = ms / (60 * 60 * 1000);
	return String(Number.isInteger(hours) ? hours : Math.round(hours * 100) / 100);
};

export const decorateRuntimeFormExtras = (
	values: Record<string, string>,
): Record<string, string> => ({
	[RUNTIME_FORM_EXTRA_KEYS.alertRolloverTime]: formatAlertRolloverTime(values),
	[RUNTIME_FORM_EXTRA_KEYS.backupIntervalHours]: msToBackupIntervalHours(
		values.BACKUP_SCHEDULER_INTERVAL,
	),
});

export const parseAlertRolloverTime = (
	raw: string,
): { hour: number; minute: number } | null => {
	const m = String(raw ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!m) return null;
	const hour = Number(m[1]);
	const minute = Number(m[2]);
	if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
	if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
	return { hour, minute };
};

export const isValidIanaTimezone = (tz: string): boolean => {
	const trimmed = tz.trim();
	if (!trimmed) return false;
	try {
		Intl.DateTimeFormat(undefined, { timeZone: trimmed });
		return true;
	} catch {
		return false;
	}
};

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

export const buildRuntimePayloadForSave = (
	schema: RuntimeConfigSchema,
	form: Record<string, string>,
): Record<string, string> => {
	const payload = mergeRuntimeFormValues(schema, form);

	const rollover = parseAlertRolloverTime(
		form[RUNTIME_FORM_EXTRA_KEYS.alertRolloverTime] ?? "",
	);
	if (rollover) {
		payload.ALERT_DAILY_ROLLOVER_LOCAL_HOUR = String(rollover.hour);
		payload.ALERT_DAILY_ROLLOVER_LOCAL_MINUTE = String(rollover.minute);
	}

	const hoursRaw = trimField(form, RUNTIME_FORM_EXTRA_KEYS.backupIntervalHours);
	if (hoursRaw) {
		const hours = Number(hoursRaw);
		if (Number.isFinite(hours) && hours >= 1) {
			payload.BACKUP_SCHEDULER_INTERVAL = String(Math.round(hours * 60 * 60 * 1000));
		}
	}

	for (const key of RUNTIME_SECRET_KEYS) {
		if (!trimField(payload, key)) {
			delete payload[key];
		}
	}

	return payload;
};

export const validateRuntimeConfigForSave = (
	schema: RuntimeConfigSchema,
	form: Record<string, string>,
	capabilities: RuntimeConfigCapabilities,
): string | null => {
	const yscpEnabled = capabilities.yscpDatabase;
	if (yscpEnabled && !trimField(form, "YSCP_HOST")) {
		return "主機不可為空白";
	}

	const tz = trimField(form, "ALERT_DAILY_ROLLOVER_TZ");
	if (tz && !isValidIanaTimezone(tz)) {
		return "時區須為有效 IANA 時區（例：Asia/Taipei）";
	}

	const rolloverRaw = trimField(form, RUNTIME_FORM_EXTRA_KEYS.alertRolloverTime);
	if (rolloverRaw && !parseAlertRolloverTime(rolloverRaw)) {
		return "每日切換時刻格式須為 HH:mm（例：00:05）";
	}

	const hoursRaw = trimField(form, RUNTIME_FORM_EXTRA_KEYS.backupIntervalHours);
	if (hoursRaw) {
		const hours = Number(hoursRaw);
		if (!Number.isFinite(hours) || hours < 1) {
			return "備份排程間隔須為大於 0 的小時數";
		}
	}

	const payload = buildRuntimePayloadForSave(schema, form);

	for (const k of ["BACKUP_DATABASE_CUTOFF_DAYS", "BACKUP_ARCHIVE_FILE_RETENTION_DAYS"]) {
		const raw = trimField(payload, k);
		if (raw && !positiveInt(raw)) return `${k} 須為大於 0 的整數`;
	}

	const rootDir = trimField(payload, "BACKUP_ROOT_DIR");
	if (rootDir && !isAbsolutePath(rootDir)) {
		return "BACKUP_ROOT_DIR 必須為絕對路徑";
	}

	return (
		validateOptionalIntRange(
			trimField(payload, "ALERT_DAILY_ROLLOVER_LOCAL_HOUR"),
			0,
			23,
			"每日切換時刻（時）",
		) ??
		validateOptionalIntRange(
			trimField(payload, "ALERT_DAILY_ROLLOVER_LOCAL_MINUTE"),
			0,
			59,
			"每日切換時刻（分）",
		)
	);
};

export const formatRuntimeSaveFeedback = (
	applied: boolean,
	sideEffects?: RuntimeConfigSideEffects,
): { toast: "success" | "warning" | "info"; message: string } => {
	if (!applied) {
		return { toast: "info", message: "設定未變更" };
	}

	const yscp = sideEffects?.yscpExternalDb;
	if (yscp && !yscp.skipped && yscp.ok === false) {
		return {
			toast: "warning",
			message: yscp.message || "設定已儲存，但 YSCP 外部資料庫連線失敗",
		};
	}

	if (yscp?.ok) {
		return {
			toast: "success",
			message: `已套用營運設定（${yscp.message || "YSCP 連線成功"}）`,
		};
	}

	return { toast: "success", message: "已套用營運設定" };
};
