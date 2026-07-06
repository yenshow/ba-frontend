/**
 * API 錯誤解析、映射與使用者可見文案（前端 SSOT）
 */

import type { Ref } from "vue"

export const YSCP_SUCCESS_CODE = "0"

export type BackendApiFailure = {
	backendCode?: string
	message?: string
	details?: unknown
	isYscp?: boolean
}

export const isYscpPath = (path: string): boolean => path.includes("/yscp/")

export const isYscpSuccessCode = (code: unknown): boolean => String(code ?? "") === YSCP_SUCCESS_CODE

const clipText = (raw: unknown): string => {
	if (raw === undefined || raw === null) return ""
	return String(raw).trim()
}

const parseBodyObject = (body: Record<string, unknown>, path?: string): BackendApiFailure | null => {
	const hasStandardError =
		body.error &&
		typeof body.error === "object" &&
		(body.error as Record<string, unknown>).code != null

	if (hasStandardError) {
		const errObj = body.error as Record<string, unknown>
		return {
			backendCode: clipText(errObj.code) || undefined,
			message: clipText(errObj.message) || undefined,
			details: errObj.details,
			isYscp: false,
		}
	}

	const pathIsYscp = Boolean(path && isYscpPath(path))
	const hasYscpShape = pathIsYscp
		? body.code != null && typeof body.msg === "string"
		: body.code != null &&
			typeof body.msg === "string" &&
			!("success" in body) &&
			!("error" in body)

	if (hasYscpShape) {
		const code = clipText(body.code)
		if (isYscpSuccessCode(code)) return null
		return {
			backendCode: code || undefined,
			message: clipText(body.msg) || undefined,
			details: body.data,
			isYscp: true,
		}
	}

	if (typeof body.message === "string" && body.message) {
		return {
			backendCode: clipText(body.code) || undefined,
			message: clipText(body.message),
			details: body.details,
			isYscp: false,
		}
	}

	return null
}

export const parseResponseBodyFailure = (
	body: unknown,
	ctx?: { path?: string }
): BackendApiFailure | null => {
	if (!body || typeof body !== "object") return null
	return parseBodyObject(body as Record<string, unknown>, ctx?.path)
}

/** 從 ofetch 錯誤或 YSCP 業務失敗物件解析失敗資訊 */
export const parseBackendApiFailure = (
	error: unknown,
	ctx?: { path?: string }
): BackendApiFailure => {
	const e = error as {
		data?: unknown
		response?: { _data?: unknown; data?: unknown }
		cause?: { data?: unknown }
		isYscpBusinessError?: boolean
		yscpFailure?: BackendApiFailure
	}

	if (e?.isYscpBusinessError && e.yscpFailure) {
		return e.yscpFailure
	}

	const data = e?.data ?? e?.response?._data ?? e?.response?.data ?? e?.cause?.data

	if (typeof data === "string") {
		try {
			const parsed = JSON.parse(data) as Record<string, unknown>
			if (parsed && typeof parsed === "object") {
				return parseBodyObject(parsed, ctx?.path) ?? { message: clipText(data), isYscp: false }
			}
		} catch {
			return { message: clipText(data), isYscp: false }
		}
	}

	if (data && typeof data === "object") {
		return parseBodyObject(data as Record<string, unknown>, ctx?.path) ?? {}
	}

	return { message: clipText((error as Error)?.message), isYscp: false }
}

export class YscpApiBusinessError extends Error {
	readonly isYscpBusinessError = true
	readonly yscpFailure: BackendApiFailure

	constructor(failure: BackendApiFailure) {
		super("操作失敗")
		this.name = "YscpApiBusinessError"
		this.yscpFailure = failure
	}
}

export const assertYscpResponseSuccess = (response: unknown, path: string): void => {
	if (!isYscpPath(path) || !response || typeof response !== "object") return
	const body = response as Record<string, unknown>
	if (body.code == null) return
	const failure = parseResponseBodyFailure(body, { path })
	if (failure) throw new YscpApiBusinessError(failure)
}

export const unwrapYscpSuccessData = <T>(response: unknown): T => {
	if (!response || typeof response !== "object") return response as T
	const body = response as Record<string, unknown>
	if (body.code != null && isYscpSuccessCode(body.code) && "data" in body) {
		return body.data as T
	}
	return response as T
}

// --- 授權／權限／存取文案 ---

export const MSG_LICENSE_LOCKED = "此功能尚未授權，請聯絡管理員"
export const MSG_LICENSE_REDIRECT = "此功能尚未授權，已為您返回首頁"
export const MSG_PERMISSION_LOCKED = "您沒有此功能的存取權限"
export const MSG_PERMISSION_REDIRECT = "您沒有此功能的存取權限，已為您返回首頁"
export const MSG_ADMIN_ONLY = "僅管理員可存取此頁面"
export const MSG_ACCOUNT_ADMIN = "管理員請至用戶管理重設密碼"

// --- HTTP／通用 fallback ---

export const USER_FACING_API_BAD_REQUEST = "請求內容不正確，請確認後再試" as const;
export const USER_FACING_API_UNAUTHORIZED = "登入已過期，請重新登入" as const;
export const USER_FACING_API_NOT_FOUND = "找不到要求的資料" as const;
export const USER_FACING_API_SERVER_ERROR = "伺服器異常，請稍後再試" as const;
export const USER_FACING_API_GENERIC_CLIENT_ERROR = "無法完成請求，請稍後再試" as const;
export const USER_FACING_API_CONFLICT = "資料衝突，請確認後再試" as const;
export const USER_FACING_API_BAD_GATEWAY = "外部服務暫時無法連線，請稍後再試" as const;
export const USER_FACING_API_UNEXPECTED = "發生錯誤，請稍後再試" as const;
export const USER_FACING_CONNECTION_ERROR = "設備連線異常，請稍後再試" as const;
export const USER_FACING_EXTERNAL_DB_ERROR = "資料庫查詢錯誤" as const;
export const USER_FACING_REQUEST_TIMEOUT = "請求逾時，請稍後再試";

export type ErrorContext = "load" | "save" | "delete" | "sync" | "control";

const CONTEXT_FALLBACK_MESSAGES: Record<ErrorContext, string> = {
	load: "無法載入資料，請稍後再試",
	save: "無法儲存，請稍後再試",
	delete: "無法刪除，請稍後再試",
	sync: "同步失敗，請稍後再試",
	control: "操作失敗，請稍後再試"
};

// --- 後端 code 映射 ---

/** 極簡 exact：登入／授權檔／權限／帳號管理少數可修正句；模組 CRUD 靠 errorContext + handleError fallback */
const API_ERROR_USER_MESSAGES: Record<string, string> = {
	FEATURE_NOT_LICENSED: MSG_LICENSE_LOCKED,
	INVALID_LICENSE_PAYLOAD: "授權檔案格式不正確",
	INVALID_OFFLINE_LICENSE_SIGNATURE: "授權簽章驗證失敗",
	INVALID_LICENSE_PRODUCT: "授權產品不符",
	PERMISSION_DENIED: MSG_PERMISSION_LOCKED,
	USER_AUTH_FAILED: "帳號或密碼錯誤",
	USER_ACCOUNT_INACTIVE: "帳號已停用，請聯絡管理員",
	USER_CREDENTIALS_REQUIRED: "請輸入帳號與密碼",
	USER_OLD_PASSWORD_REQUIRED: "請輸入舊密碼",
	USER_OLD_PASSWORD_INVALID: "舊密碼不正確",
	USER_FORBIDDEN_PASSWORD_SELF: "無法變更自己的密碼，請聯絡管理員",
	USER_FORBIDDEN_DELETE_SELF: "無法刪除自己的帳號",
	USER_FORBIDDEN_DELETE_ADMIN: "無法刪除管理員帳號",
	LOCATION_ZONE_DELETE_FORBIDDEN: "此區域尚有地點，無法刪除"
};

const API_ERROR_PREFIX_MESSAGES: ReadonlyArray<{ prefix: string; message: string }> = [
	{ prefix: "LADDER_SDK_", message: "設備操作失敗，請稍後再試" },
	{ prefix: "MEDIAMTX_", message: "串流服務暫時無法使用，請稍後再試" },
	{ prefix: "MONITOR_", message: "無法取得監控資料，請稍後再試" },
	{ prefix: "YSCP_", message: "操作失敗，請稍後再試" },
	{ prefix: "SMTP_", message: "郵件伺服器設定不完整，請檢查後再試" },
	{ prefix: "PEOPLE_COUNTING_", message: "門禁管理操作失敗，請稍後再試" },
	{ prefix: "USER_PASSWORD_", message: "密碼不符合要求，請重新輸入" },
	{ prefix: "USER_FORBIDDEN_", message: "您沒有執行此操作的權限" },
	{ prefix: "LICENSE_", message: "授權相關操作失敗，請聯絡管理員" },
	{ prefix: "INVALID_LICENSE_", message: "授權檔案無效，請確認後再試" },
	{ prefix: "PERSONNEL_", message: "人員資料有誤，請檢查後再試" },
	{ prefix: "PERSON_SYNC_", message: "人員同步失敗，請稍後再試" },
	{ prefix: "VEHICLE_ACCESS_", message: "車輛管理操作失敗，請稍後再試" },
	{ prefix: "ACCESS_CONTROL_", message: "門禁操作失敗，請稍後再試" },
	{ prefix: "ALERT_", message: "警報操作失敗，請稍後再試" },
	{ prefix: "DEVICE_MODEL_", message: "設備型號資料有誤，請檢查後再試" },
	{ prefix: "DEVICE_CONNECTIVITY_", message: USER_FACING_CONNECTION_ERROR },
	{ prefix: "DEVICE_", message: "設備操作失敗，請稍後再試" },
	{ prefix: "LOCATION_ZONE_", message: "區域操作失敗，請稍後再試" },
	{ prefix: "LOCATION_", message: "地點操作失敗，請稍後再試" },
	{ prefix: "MODBUS_CONNECTION_", message: USER_FACING_CONNECTION_ERROR },
	{ prefix: "MODBUS_READ_TIMEOUT", message: USER_FACING_CONNECTION_ERROR },
	{ prefix: "MODBUS_WRITE_TIMEOUT", message: USER_FACING_CONNECTION_ERROR },
	{ prefix: "MODBUS_", message: "設備通訊失敗，請稍後再試" },
	{ prefix: "ELEVATOR_", message: "電梯操作失敗，請稍後再試" },
	{ prefix: "ENVIRONMENT_", message: "環境資料操作失敗，請稍後再試" },
	{ prefix: "EXTERNAL_DATA_", message: USER_FACING_EXTERNAL_DB_ERROR },
	{ prefix: "SETTINGS_", message: "設定操作失敗，請稍後再試" },
	{ prefix: "MULTIMEDIA_", message: "多媒體操作失敗，請稍後再試" },
	{ prefix: "AUTH_", message: USER_FACING_API_UNAUTHORIZED }
];

const getExactUserMessage = (backendCode: string): string | undefined =>
	API_ERROR_USER_MESSAGES[backendCode];

const getHeuristicUserMessage = (backendCode: string): string | undefined => {
	if (
		backendCode.includes("TIMEOUT") ||
		backendCode.includes("CONNECTION") ||
		backendCode.includes("UNAVAILABLE")
	) {
		return USER_FACING_CONNECTION_ERROR;
	}
	if (backendCode.endsWith("_NOT_FOUND") || backendCode.includes("NOT_FOUND")) {
		return USER_FACING_API_NOT_FOUND;
	}
	if (backendCode.includes("DUPLICATE") || backendCode.includes("IN_USE")) {
		return USER_FACING_API_CONFLICT;
	}
	return undefined;
};

const getPrefixUserMessage = (backendCode: string): string | undefined => {
	for (const { prefix, message } of API_ERROR_PREFIX_MESSAGES) {
		if (backendCode.startsWith(prefix) || backendCode === prefix) return message;
	}
	return undefined;
};

// --- VALIDATION_* + details 組句 ---

const VALIDATION_FIELD_LABELS: Record<string, string> = {
	name: "名稱",
	deviceName: "設備名稱",
	deviceModelId: "設備型號",
	deviceType: "設備類型",
	host: "主機位址",
	port: "連接埠",
	unitId: "單元編號",
	username: "帳號",
	password: "密碼",
	newPassword: "新密碼",
	oldPassword: "舊密碼",
	employeeNo: "員工編號",
	personGroupIds: "人員群組",
	vehicleGroupIds: "車輛群組",
	licensePlate: "車牌號碼",
	siteId: "工地",
	zoneId: "區域",
	locationId: "地點",
	locationType: "地點類型",
	systemType: "系統類型",
	page: "頁碼",
	limit: "筆數",
	status: "狀態",
	role: "角色",
	excel: "Excel 檔案",
	fingerPrintID: "指紋編號",
	rule_id: "警報規則",
	ctrlMode: "控制模式",
	floors: "授權樓層"
};

const labelForField = (field: string): string => VALIDATION_FIELD_LABELS[field] ?? field;

const labelForFields = (fields: string[]): string => fields.map(labelForField).join("、");

const asStringArray = (value: unknown): string[] =>
	Array.isArray(value) ? value.map(v => String(v)) : [];

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const resolveValidationMessage = (
	backendCode: string | undefined,
	details: unknown
): string | undefined => {
	if (!backendCode?.startsWith("VALIDATION_")) return undefined;

	const d = asRecord(details);

	if (backendCode === "VALIDATION_REQUIRED") {
		const missing = asStringArray(d?.missing);
		if (missing.length === 1) return `請填寫${labelForField(missing[0])}`;
		if (missing.length > 1) return `請填寫：${labelForFields(missing)}`;
		return "請填寫必填欄位";
	}
	if (backendCode === "VALIDATION_INVALID_NUMBER") {
		const invalid = asStringArray(d?.invalid);
		if (invalid.length === 1) return `${labelForField(invalid[0])}必須為數字`;
		if (invalid.length > 1) return `以下欄位必須為數字：${labelForFields(invalid)}`;
		return "請輸入有效的數字";
	}
	if (backendCode === "VALIDATION_INVALID_INTEGER") {
		const invalid = asStringArray(d?.invalid);
		if (invalid.length === 1) return `${labelForField(invalid[0])}必須為整數`;
		if (invalid.length > 1) return `以下欄位必須為整數：${labelForFields(invalid)}`;
		return "請輸入有效的整數";
	}
	if (backendCode === "VALIDATION_INVALID_ENUM") {
		const field = d?.field != null ? String(d.field) : "";
		const allowed = asStringArray(d?.allowedValues);
		if (field && allowed.length) return `${labelForField(field)}僅能選擇：${allowed.join("、")}`;
		return "請選擇有效的選項";
	}
	if (backendCode === "VALIDATION_INVALID_DATE") {
		const invalid = asStringArray(d?.invalid);
		if (invalid.length === 1) return `${labelForField(invalid[0])}日期格式不正確`;
		if (invalid.length > 1) return `以下欄位日期格式不正確：${labelForFields(invalid)}`;
		return "日期格式不正確";
	}
	if (backendCode === "VALIDATION_CUSTOM") return "請確認輸入內容後再試";

	return undefined;
};

// --- 型別與 ApiRequestError ---

export type AppSeverity = "warning" | "error" | "critical";

export const CONNECTION_ERROR_TOKENS = [
	"連接超時",
	"連接被拒絕",
	"無法到達設備",
	"連接已斷開",
	"無法連接",
	"無法讀取",
	"connection refused",
	"econnrefused",
	"設備離線",
	"設備連接失敗",
	"服務不可用",
	"service unavailable"
] as const;

export const TIMEOUT_ERROR_TOKENS = ["timeout", "timed out", "etimedout", "請求超時"] as const;

export type ApiErrorCode =
	| "HTTP_400"
	| "HTTP_401"
	| "HTTP_403"
	| "HTTP_429"
	| "HTTP_404"
	| "HTTP_500"
	| "HTTP_503"
	| "NETWORK_ERROR"
	| "TIMEOUT"
	| "BACKEND_CODE"
	| "UNKNOWN";

export type ApiRequestErrorMeta = {
	statusCode?: number;
	code?: ApiErrorCode;
	backendCode?: string;
	originalMessage?: string;
	details?: unknown;
	resolvedCode?: ApiErrorCode;
};

export class ApiRequestError extends Error {
	statusCode?: number;
	code?: ApiErrorCode;
	backendCode?: string;
	originalMessage?: string;
	details?: unknown;
	isGenericMessage?: boolean;

	constructor(message: string, meta?: ApiRequestErrorMeta & { isGenericMessage?: boolean }) {
		super(message);
		this.name = "ApiRequestError";
		this.statusCode = meta?.statusCode;
		this.code = meta?.code ?? meta?.resolvedCode;
		this.backendCode = meta?.backendCode;
		this.originalMessage = meta?.originalMessage;
		this.details = meta?.details;
		this.isGenericMessage = meta?.isGenericMessage;
	}
}

export const isApiRequestTimeout = (error: unknown): boolean => {
	if (error instanceof ApiRequestError && error.code === "TIMEOUT") return true;

	const parts: string[] = [];
	if (error instanceof ApiRequestError) {
		if (error.originalMessage) parts.push(error.originalMessage);
		if (error.message) parts.push(error.message);
	} else if (error instanceof Error) {
		parts.push(error.message);
	} else if (error && typeof error === "object") {
		const r = error as { code?: string; message?: string; originalMessage?: string };
		if (r.code === "TIMEOUT") return true;
		if (r.originalMessage) parts.push(r.originalMessage);
		if (r.message) parts.push(r.message);
	} else if (error != null) {
		parts.push(String(error));
	}

	const lower = parts.join("\n").toLowerCase();
	return TIMEOUT_ERROR_TOKENS.some(token => lower.includes(token)) || lower.includes("timeouterror");
};

export const mapHttpStatusToUserFacingError = (
	statusCode: number,
	isExternalDataQuery: boolean
): { message: string; code: ApiErrorCode; isGeneric: boolean } => {
	if (statusCode === 400)
		return { message: USER_FACING_API_BAD_REQUEST, code: "HTTP_400", isGeneric: true };
	if (statusCode === 429) {
		return { message: "請求過於頻繁，請稍後再試", code: "HTTP_429", isGeneric: false };
	}
	if (statusCode === 403)
		return { message: MSG_PERMISSION_LOCKED, code: "HTTP_403", isGeneric: false };
	if (statusCode === 404)
		return { message: USER_FACING_API_NOT_FOUND, code: "HTTP_404", isGeneric: true };
	if (statusCode === 409)
		return { message: USER_FACING_API_CONFLICT, code: "HTTP_400", isGeneric: false };
	if (statusCode === 502)
		return { message: USER_FACING_API_BAD_GATEWAY, code: "HTTP_500", isGeneric: false };

	if (statusCode >= 500 && statusCode < 600) {
		if (isExternalDataQuery) {
			return {
				message: USER_FACING_EXTERNAL_DB_ERROR,
				code: statusCode === 503 ? "HTTP_503" : "HTTP_500",
				isGeneric: false
			};
		}
		return { message: USER_FACING_API_SERVER_ERROR, code: "HTTP_500", isGeneric: true };
	}

	if (statusCode >= 400 && statusCode < 500) {
		return { message: USER_FACING_API_GENERIC_CLIENT_ERROR, code: "UNKNOWN", isGeneric: true };
	}

	return { message: USER_FACING_API_UNEXPECTED, code: "UNKNOWN", isGeneric: true };
};

const MAX_USER_VISIBLE_API_ERROR_CHARS = 480;

const isLikelyHtmlOrDocumentErrorPage = (raw: string): boolean => {
	const s = String(raw || "");
	if (!s) return false;
	if (/<!DOCTYPE/i.test(s)) return true;
	if (/<\s*html[\s>]/i.test(s)) return true;
	if (/\bnuxt\b/i.test(s) && /\bdev server\b/i.test(s)) return true;
	return false;
};

const clipUserFacingApiErrorText = (raw: unknown): string => {
	if (raw === undefined || raw === null) return "";
	let s = String(raw).trim();
	if (!s || isLikelyHtmlOrDocumentErrorPage(s)) return "";
	if (s.length > MAX_USER_VISIBLE_API_ERROR_CHARS) {
		return `${s.slice(0, MAX_USER_VISIBLE_API_ERROR_CHARS).trimEnd()}…`;
	}
	return s;
};

const parseExternalDataHttpStatusFromMessage = (message: string): number | undefined => {
	const m = String(message || "");
	if (!m.includes("external-data")) return undefined;
	const g = m.match(/:\s*(\d{3})\b/);
	if (!g) return undefined;
	const code = parseInt(g[1], 10);
	return code === 500 || code === 503 ? code : undefined;
};

const coerceHttpStatusCode = (error: unknown): number | undefined => {
	const e = error as { statusCode?: number; status?: number; response?: { status?: number } };
	const raw = e?.statusCode ?? e?.status ?? e?.response?.status;
	if (raw === undefined || raw === null) return undefined;
	const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
	return Number.isFinite(n) ? n : undefined;
};

export const resolveFetchHttpStatus = (error: unknown): number | undefined =>
	coerceHttpStatusCode(error) ??
	parseExternalDataHttpStatusFromMessage(String((error as { message?: string })?.message ?? ""));

export const extractBackendApiErrorText = (error: unknown, path?: string): string => {
	const failure = parseBackendApiFailure(error, path ? { path } : undefined);
	return clipUserFacingApiErrorText(failure.message ?? "");
};

const looksLikeOfetchDebugLine = (s: string): boolean => {
	const t = String(s || "").trim();
	if (!t) return false;
	return (/^\[\s*\w+\]\s+"/.test(t) && /\d{3}\b/.test(t)) || /\bHTTP_\d{3}\b/i.test(t);
};

export const simplifyUserFacingToastMessage = (msg: string): string => {
	const s = String(msg || "").trim();
	if (!s) return s;
	if (looksLikeOfetchDebugLine(s) || isLikelyHtmlOrDocumentErrorPage(s))
		return USER_FACING_API_UNEXPECTED;
	let clipped = s;
	if (clipped.length > MAX_USER_VISIBLE_API_ERROR_CHARS) {
		clipped = `${clipped.slice(0, MAX_USER_VISIBLE_API_ERROR_CHARS).trimEnd()}…`;
	}
	if (parseExternalDataHttpStatusFromMessage(clipped) !== undefined)
		return USER_FACING_EXTERNAL_DB_ERROR;
	if (/查詢\s+[\w.]+\s+/.test(clipped) && /失敗\s*:/.test(clipped))
		return USER_FACING_EXTERNAL_DB_ERROR;
	return clipped;
};

export const resolveUserFacingCatchMessage = (error: unknown, fallback: string): string => {
	if (error instanceof ApiRequestError) {
		if (error.isGenericMessage && fallback) return fallback;
		return error.message;
	}
	if (error instanceof YscpApiBusinessError) {
		const resolved = resolveUserFacingApiError({
			backendCode: error.yscpFailure.backendCode,
			path: "/yscp/",
		});
		return resolved.message || fallback;
	}
	const raw = error instanceof Error ? error.message || fallback : fallback;
	return simplifyUserFacingToastMessage(raw) || USER_FACING_API_UNEXPECTED;
};

export const severityToToastType = (
	severity: AppSeverity
): { type: "error" | "warning" | "info"; duration: number } => {
	if (severity === "critical") return { type: "error", duration: 10000 };
	if (severity === "error") return { type: "warning", duration: 8000 };
	return { type: "info", duration: 5000 };
};

const isCriticalBackendCode = (backendCode: string | undefined): boolean =>
	Boolean(
		backendCode &&
		(backendCode.startsWith("MODBUS_") ||
			backendCode.startsWith("DEVICE_CONNECTIVITY_") ||
			backendCode === "LICENSE_CHECK_FAILED" ||
			backendCode === "SERVICE_UNAVAILABLE")
	);

export const inferSeverityFromApiError = (error: unknown): AppSeverity => {
	const e = error as ApiRequestError & { code?: string };
	const backendCode =
		e instanceof ApiRequestError ? e.backendCode : (e as { backendCode?: string })?.backendCode;

	if (backendCode?.startsWith("VALIDATION_")) return "warning";
	if (isCriticalBackendCode(backendCode)) return "critical";

	const statusCode =
		e instanceof ApiRequestError && e.statusCode != null
			? e.statusCode
			: resolveFetchHttpStatus(error);

	if (statusCode === 400) return "warning";
	if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) return "error";
	if (statusCode !== undefined && statusCode >= 500 && statusCode < 600) return "critical";

	const code = String(e?.code ?? "");
	if (code === "NETWORK_ERROR") return "critical";
	if (code === "TIMEOUT") return "error";

	const message = String(e?.message ?? "").toLowerCase();
	if (CONNECTION_ERROR_TOKENS.some(t => message.includes(String(t).toLowerCase())))
		return "critical";
	if (TIMEOUT_ERROR_TOKENS.some(t => message.includes(String(t).toLowerCase()))) return "error";
	if (
		message.includes("failed to fetch") ||
		message.includes("networkerror") ||
		message.includes("enotfound") ||
		message.includes("無法連接到後端伺服器")
	) {
		return "critical";
	}
	if (message.includes("cors") || message.includes("cross-origin")) return "error";
	return "warning";
};

export const isDeviceConnectionError = (errorOrMessage: unknown): boolean => {
	if (errorOrMessage instanceof ApiRequestError) {
		const bc = errorOrMessage.backendCode;
		if (bc?.startsWith("MODBUS_") || bc?.startsWith("DEVICE_CONNECTIVITY_")) return true;
	}

	const msg =
		errorOrMessage instanceof ApiRequestError
			? String(errorOrMessage.originalMessage || errorOrMessage.message || "")
			: String(errorOrMessage || "");
	const lower = msg.toLowerCase();
	const hasIp = Boolean(lower.match(/\d+\.\d+\.\d+\.\d+:\d+/));
	const isDeviceApi = lower.includes("/modbus/") || lower.includes("/device/");

	if (CONNECTION_ERROR_TOKENS.some(t => lower.includes(String(t).toLowerCase()))) return true;
	if (isDeviceApi && hasIp) return true;
	if (lower.includes("503")) return true;
	return false;
};

export const isDeviceApiRequest = (path: string): boolean =>
	path.includes("/modbus/") || path.includes("/device/");

export type ResolveUserFacingApiErrorInput = {
	statusCode?: number;
	backendCode?: string;
	path: string;
	originalMessage?: string;
	details?: unknown;
	context?: ErrorContext;
};

export type ResolvedUserFacingApiError = {
	message: string;
	code: ApiErrorCode;
	isGeneric: boolean;
};

export const getErrorContextFallbackMessage = (context: ErrorContext): string =>
	CONTEXT_FALLBACK_MESSAGES[context];

export const resolveUserFacingApiError = (
	input: ResolveUserFacingApiErrorInput
): ResolvedUserFacingApiError => {
	const { statusCode, backendCode, path, details, context } = input;
	const isExternalDataQuery = path.includes("/external-data/");
	const isYscpQuery = isYscpPath(path);

	const fromValidation = resolveValidationMessage(backendCode, details);
	if (fromValidation) return { message: fromValidation, code: "BACKEND_CODE", isGeneric: false };

	if (backendCode) {
		const fromExact = getExactUserMessage(backendCode);
		if (fromExact) return { message: fromExact, code: "BACKEND_CODE", isGeneric: false };

		const fromContext = context ? CONTEXT_FALLBACK_MESSAGES[context] : undefined;
		if (fromContext) return { message: fromContext, code: "UNKNOWN", isGeneric: true };

		const fromHeuristic = getHeuristicUserMessage(backendCode);
		if (fromHeuristic) return { message: fromHeuristic, code: "BACKEND_CODE", isGeneric: true };

		const fromPrefix = getPrefixUserMessage(backendCode);
		if (fromPrefix) return { message: fromPrefix, code: "BACKEND_CODE", isGeneric: true };
	}

	if (isYscpQuery) {
		return { message: USER_FACING_API_UNEXPECTED, code: "UNKNOWN", isGeneric: true };
	}

	if (statusCode !== undefined && statusCode !== null) {
		const fromStatus = mapHttpStatusToUserFacingError(statusCode, isExternalDataQuery);
		return { message: fromStatus.message, code: fromStatus.code, isGeneric: fromStatus.isGeneric };
	}

	return { message: USER_FACING_API_UNEXPECTED, code: "UNKNOWN", isGeneric: true };
};

// --- 表單 inline 錯誤（不 toast）---

/** 解析 API 錯誤為使用者可見字串（供開啟中的表單／dialog 使用） */
export const resolveFormApiError = (error: unknown, fallback: string): string =>
	resolveUserFacingCatchMessage(error, fallback);

/** 將 API 錯誤寫入 ref（不 toast） */
export const applyFormApiErrorToRef = (
	target: Ref<string | null>,
	error: unknown,
	fallback: string
): string => {
	const msg = resolveFormApiError(error, fallback);
	target.value = msg;
	return msg;
};

/** 多筆驗證錯誤合併為 dialog 底部顯示文字 */
export const joinFormErrors = (errors: string[]): string => errors.filter(e => e.trim()).join("\n");
