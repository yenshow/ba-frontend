/**
 * 環境設定表單：欄位定義與 .env 互轉。僅管理列出的鍵；儲存會重寫表單涵蓋的區塊。
 * LICENSE_* 不由表單編輯；自原檔讀取並於儲存時原樣寫回（不經表單修改）。
 */

export type EnvFormFieldKind = "text" | "password" | "textarea" | "number" | "select";

export type EnvFormFieldOption = { value: string; label: string };

export type EnvFormField = {
	key: string;
	kind: EnvFormFieldKind;
	options?: EnvFormFieldOption[];
	placeholder?: string;
};

export type EnvFormSection = {
	title: string;
	fileHeader: string;
	fields: EnvFormField[];
	layoutGroup?: number;
};

/** 自 .env 讀寫但不在表單顯示的授權鍵（順序用於序列化） */
export const LICENSE_PRESERVE_ORDER = [
	"LICENSE_DEPLOYMENT_PROFILE",
	"LICENSE_OPEN_ALL_FEATURES",
	"LICENSE_PLATFORM_API_BASE_URL",
	"LICENSE_SIGN_SECRET",
] as const;

const LICENSE_PRESERVE_SET = new Set<string>(LICENSE_PRESERVE_ORDER);

export const ENV_FORM_SECTIONS: EnvFormSection[] = [
	{
		title: "伺服器",
		fileHeader: "伺服器",
		layoutGroup: 1,
		fields: [
			{ key: "HOST", kind: "text", placeholder: "0.0.0.0" },
			{ key: "PORT", kind: "number", placeholder: "4000" },
			{ key: "CORS_ORIGINS", kind: "textarea", placeholder: "http://localhost:3000,http://localhost:3001" },
		],
	},
	{
		title: "JWT",
		fileHeader: "JWT（正式環境務必改為強隨機字串）",
		layoutGroup: 1,
		fields: [
			{ key: "JWT_SECRET", kind: "password" },
			{ key: "JWT_EXPIRES_IN", kind: "text", placeholder: "7d" },
		],
	},
	{
		title: "主資料庫（PostgreSQL）",
		fileHeader: "主資料庫（PostgreSQL）",
		layoutGroup: 2,
		fields: [
			{ key: "DB_HOST", kind: "text", placeholder: "127.0.0.1" },
			{ key: "DB_PORT", kind: "number", placeholder: "5433" },
			{ key: "DB_NAME", kind: "text", placeholder: "ba_system" },
			{ key: "DB_USER", kind: "text", placeholder: "postgres" },
			{ key: "DB_PASSWORD", kind: "password" },
		],
	},
	{
		title: "外部資料庫",
		fileHeader: "外部資料庫",
		layoutGroup: 2,
		fields: [
			{ key: "EXTERNAL_DB_HOST", kind: "text" },
			{ key: "EXTERNAL_DB_PORT", kind: "number", placeholder: "5432" },
			{ key: "EXTERNAL_DB_USER", kind: "text", placeholder: "postgres" },
			{ key: "EXTERNAL_DB_PASSWORD", kind: "password" },
			{ key: "EXTERNAL_DB_NAME", kind: "text", placeholder: "cms" },
		],
	},
	{
		title: "YSCP",
		fileHeader: "YSCP",
		fields: [
			{ key: "YSCP_HOST", kind: "text" },
			{ key: "YSCP_AK", kind: "password" },
			{ key: "YSCP_SK", kind: "password" },
			{ key: "YSCP_API_VER", kind: "text", placeholder: "v1" },
		],
	},
	{
		title: "功能開關",
		fileHeader: "功能開關（布林；未設定時為 true）",
		layoutGroup: 3,
		fields: [
			{
				key: "ENABLE_YSCP_PEOPLE_COUNTING",
				kind: "select",
				options: [
					{ value: "true", label: "true（讀取 YSCP 人流）" },
					{ value: "false", label: "false（略過 YSCP 人流）" },
				],
			},
		],
	},
	{
		title: "MediaMTX（串流）",
		fileHeader: "MediaMTX（串流）",
		layoutGroup: 3,
		fields: [
			{ key: "MEDIAMTX_API_BASE_URL", kind: "text", placeholder: "http://127.0.0.1:9997" },
			{ key: "MEDIAMTX_WEBRTC_BASE_URL", kind: "text", placeholder: "http://127.0.0.1:8889" },
		],
	},
	{
		title: "警報日界線",
		fileHeader: "警報日界線（每日批次 active→resolved、連動 DO 復歸；忽視僅當曆日阻擋）",
		fields: [
			{ key: "ALERT_DAILY_ROLLOVER_TZ", kind: "text", placeholder: "Asia/Taipei" },
			{ key: "ALERT_DAILY_ROLLOVER_LOCAL_HOUR", kind: "number", placeholder: "0" },
			{ key: "ALERT_DAILY_ROLLOVER_LOCAL_MINUTE", kind: "number", placeholder: "5" },
		],
	},
	{
		title: "備份排程",
		fileHeader: "備份排程",
		fields: [
			{ key: "BACKUP_RETENTION_DAYS", kind: "number", placeholder: "30" },
			{ key: "BACKUP_FILE_RETENTION_DAYS", kind: "number", placeholder: "365" },
			{ key: "BACKUP_SCHEDULER_INTERVAL", kind: "number", placeholder: "86400000" },
		],
	},
];

export const KNOWN_ENV_FORM_KEYS = new Set(ENV_FORM_SECTIONS.flatMap(s => s.fields.map(f => f.key)));

const parseQuotedDouble = (raw: string): string => {
	let out = "";
	for (let i = 1; i < raw.length; i++) {
		const c = raw[i];
		if (c === '"') break;
		if (c === "\\" && i + 1 < raw.length) {
			const n = raw[i + 1];
			if (n === "n") {
				out += "\n";
				i++;
				continue;
			}
			if (n === "r") {
				out += "\r";
				i++;
				continue;
			}
			if (n === "t") {
				out += "\t";
				i++;
				continue;
			}
			out += n;
			i++;
			continue;
		}
		out += c;
	}
	return out;
};

const parseQuotedSingle = (raw: string): string => {
	let out = "";
	for (let i = 1; i < raw.length; i++) {
		const c = raw[i];
		if (c === "'") break;
		out += c;
	}
	return out;
};

const parseEnvLineValue = (raw: string): string => {
	const t = raw.replace(/\r$/, "").trim();
	if (t.startsWith('"')) return parseQuotedDouble(t);
	if (t.startsWith("'")) return parseQuotedSingle(t);
	return t;
};

const parseAllAssignments = (content: string): Record<string, string> => {
	const all: Record<string, string> = {};
	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq <= 0) continue;
		const keyPart = line.slice(0, eq).trim();
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(keyPart)) continue;
		all[keyPart] = parseEnvLineValue(line.slice(eq + 1));
	}
	return all;
};

export type ParsedEnvFile = {
	values: Record<string, string>;
	unknownKeys: string[];
	preservedLicense: Record<string, string>;
};

export const parseEnvFileContent = (content: string): ParsedEnvFile => {
	const all = parseAllAssignments(content);
	const values: Record<string, string> = {};
	const preservedLicense: Record<string, string> = {};
	const unknownOrder: string[] = [];
	const seenUnknown = new Set<string>();

	for (const [key, val] of Object.entries(all)) {
		if (KNOWN_ENV_FORM_KEYS.has(key)) {
			values[key] = val;
		} else if (LICENSE_PRESERVE_SET.has(key)) {
			preservedLicense[key] = val;
		} else if (!seenUnknown.has(key)) {
			seenUnknown.add(key);
			unknownOrder.push(key);
		}
	}

	return { values, unknownKeys: unknownOrder, preservedLicense };
};

const needsEnvQuoting = (v: string): boolean =>
	v !== "" && (/[\s#"'=]/.test(v) || v.includes("\n") || v.includes("\r"));

const escapeEnvValue = (v: string): string => {
	if (v === "") return "";
	if (!needsEnvQuoting(v)) return v;
	return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`;
};

export const serializeEnvFormValues = (
	values: Record<string, string>,
	preservedLicense: Record<string, string> = {},
): string => {
	const lines: string[] = [];
	for (const section of ENV_FORM_SECTIONS) {
		lines.push(`# --- ${section.fileHeader} ---`);
		for (const field of section.fields) {
			lines.push(`${field.key}=${escapeEnvValue(values[field.key] ?? "")}`);
		}
		lines.push("");
	}
	const licenseKeys = LICENSE_PRESERVE_ORDER.filter(k => k in preservedLicense);
	if (licenseKeys.length > 0) {
		lines.push("# --- 授權 ---");
		for (const key of licenseKeys) {
			lines.push(`${key}=${escapeEnvValue(preservedLicense[key] ?? "")}`);
		}
		lines.push("");
	}
	return lines.join("\n").replace(/\s+$/, "\n");
};

export const createEmptyEnvFormValues = (): Record<string, string> => {
	const o: Record<string, string> = {};
	for (const key of KNOWN_ENV_FORM_KEYS) o[key] = "";
	return o;
};

const clusterEnvFormSectionsForLayout = (sections: EnvFormSection[]): EnvFormSection[][] => {
	const rows: EnvFormSection[][] = [];
	let buf: EnvFormSection[] = [];
	let bufKey: number | null = null;
	for (const s of sections) {
		const g = s.layoutGroup;
		if (g === undefined) {
			if (buf.length) {
				rows.push(buf);
				buf = [];
				bufKey = null;
			}
			rows.push([s]);
			continue;
		}
		if (buf.length === 0) {
			buf = [s];
			bufKey = g;
			continue;
		}
		if (g === bufKey) buf.push(s);
		else {
			rows.push(buf);
			buf = [s];
			bufKey = g;
		}
	}
	if (buf.length) rows.push(buf);
	return rows;
};

export const ENV_FORM_SECTION_ROWS = clusterEnvFormSectionsForLayout(ENV_FORM_SECTIONS);

export const normalizeEnvFormValuesFromParsed = (parsed: Record<string, string>): Record<string, string> => {
	const merged = { ...createEmptyEnvFormValues(), ...parsed };
	const y = merged.ENABLE_YSCP_PEOPLE_COUNTING?.trim().toLowerCase();
	merged.ENABLE_YSCP_PEOPLE_COUNTING = y === "false" || y === "0" || y === "no" ? "false" : "true";
	return merged;
};

export const validateEnvFormValues = (form: Record<string, string>): string | null => {
	const portOk = (raw: string) => {
		const n = Number(raw);
		return Number.isInteger(n) && n >= 1 && n <= 65535;
	};
	for (const k of ["PORT", "DB_PORT", "EXTERNAL_DB_PORT"] as const) {
		const raw = form[k]?.trim() ?? "";
		if (raw && !portOk(raw)) return `${k} 須為 1–65535 的整數`;
	}
	const nn = (raw: string) => {
		const n = Number(raw);
		return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
	};
	for (const k of [
		"BACKUP_RETENTION_DAYS",
		"BACKUP_FILE_RETENTION_DAYS",
		"BACKUP_SCHEDULER_INTERVAL",
	] as const) {
		const raw = form[k]?.trim() ?? "";
		if (raw && !nn(raw)) return `${k} 須為非負整數`;
	}
	const h = form.ALERT_DAILY_ROLLOVER_LOCAL_HOUR?.trim() ?? "";
	if (h) {
		const n = Number(h);
		if (!Number.isInteger(n) || n < 0 || n > 23) return "ALERT_DAILY_ROLLOVER_LOCAL_HOUR 須為 0–23";
	}
	const m = form.ALERT_DAILY_ROLLOVER_LOCAL_MINUTE?.trim() ?? "";
	if (m) {
		const n = Number(m);
		if (!Number.isInteger(n) || n < 0 || n > 59) return "ALERT_DAILY_ROLLOVER_LOCAL_MINUTE 須為 0–59";
	}
	return null;
};
