/**
 * 錯誤處理相關工具函數
 */

export type AppSeverity = "warning" | "error" | "critical";

export const APP_SEVERITY_RANK: Record<AppSeverity, number> = {
	warning: 1,
	error: 2,
	critical: 3
} as const;

/**
 * 連線/離線 token（僅用於「無 status/code」時的 fallback；避免解析整句中文訊息造成漂移）
 * - **前後端需盡量一致**（後端：systemAlertHelper.js）
 */
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
	| "HTTP_404"
	| "HTTP_500"
	| "HTTP_503"
	| "NETWORK_ERROR"
	| "TIMEOUT"
	| "UNKNOWN";

export class ApiRequestError extends Error {
	statusCode?: number;
	code?: ApiErrorCode;
	originalMessage?: string;

	constructor(
		message: string,
		meta?: { statusCode?: number; code?: ApiErrorCode; originalMessage?: string }
	) {
		super(message);
		this.name = "ApiRequestError";
		this.statusCode = meta?.statusCode;
		this.code = meta?.code;
		this.originalMessage = meta?.originalMessage;
	}
}

/** 外部資料庫查詢失敗時對使用者顯示的固定文案（與後端 errorHandler 對齊） */
export const USER_FACING_EXTERNAL_DB_ERROR = "資料庫查詢錯誤" as const;

/** useApiBase 對使用者顯示：不透傳 HTTP 狀態數字、URL、後端原文（詳見 originalMessage） */
export const USER_FACING_API_BAD_REQUEST = "請求內容不正確，請確認後再試" as const;
export const USER_FACING_API_UNAUTHORIZED = "登入已過期，請重新登入" as const;
export const USER_FACING_API_FORBIDDEN = "權限不足，無法執行此操作" as const;
export const USER_FACING_API_NOT_FOUND = "找不到要求的資料" as const;
export const USER_FACING_API_SERVER_ERROR = "伺服器異常，請稍後再試" as const;
export const USER_FACING_API_GENERIC_CLIENT_ERROR = "無法完成請求，請稍後再試" as const;
export const USER_FACING_API_UNEXPECTED = "發生錯誤，請稍後再試" as const;
export const USER_FACING_CONNECTION_ERROR = "連線異常，請稍後再試" as const;

/** 依 HTTP status 取得對使用者顯示的固定文案（不含 401：由 useApiBase 處理登出） */
export const mapHttpStatusToUserFacingError = (
	statusCode: number,
	isExternalDataQuery: boolean
): { message: string; code: ApiErrorCode } => {
	if (statusCode === 400) return { message: USER_FACING_API_BAD_REQUEST, code: "HTTP_400" };
	if (statusCode === 403) return { message: USER_FACING_API_FORBIDDEN, code: "HTTP_403" };
	if (statusCode === 404) return { message: USER_FACING_API_NOT_FOUND, code: "HTTP_404" };

	if (statusCode >= 500 && statusCode < 600) {
		if (isExternalDataQuery) {
			return {
				message: USER_FACING_EXTERNAL_DB_ERROR,
				code: statusCode === 503 ? "HTTP_503" : "HTTP_500"
			};
		}
		return { message: USER_FACING_API_SERVER_ERROR, code: "HTTP_500" };
	}

	if (statusCode >= 400 && statusCode < 500) {
		return { message: USER_FACING_API_GENERIC_CLIENT_ERROR, code: "UNKNOWN" };
	}

	return { message: USER_FACING_API_UNEXPECTED, code: "UNKNOWN" };
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

/**
 * 從 API／ofetch 錯誤帶出的字串中取出可給使用者看的片段（絕不回傳整頁 HTML）
 */
const clipUserFacingApiErrorText = (raw: unknown): string => {
	if (raw === undefined || raw === null) return "";
	let s = String(raw).trim();
	if (!s) return "";
	if (isLikelyHtmlOrDocumentErrorPage(s)) return "";
	if (s.length > MAX_USER_VISIBLE_API_ERROR_CHARS) {
		return `${s.slice(0, MAX_USER_VISIBLE_API_ERROR_CHARS).trimEnd()}…`;
	}
	return s;
};

/** 從 ofetch 預設字串列（含 URL）解析 500／503，例如 `[GET] "…/external-data/…" : 503 …` */
const parseExternalDataHttpStatusFromMessage = (message: string): number | undefined => {
	const m = String(message || "");
	if (!m.includes("external-data")) return undefined;
	const g = m.match(/:\s*(\d{3})\b/);
	if (!g) return undefined;
	const code = parseInt(g[1], 10);
	return code === 500 || code === 503 ? code : undefined;
};

const coerceHttpStatusCode = (error: unknown): number | undefined => {
	const e = error as any;
	const raw = e?.statusCode ?? e?.status ?? e?.response?.status;
	if (raw === undefined || raw === null || raw === "") return undefined;
	const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
	return Number.isFinite(n) ? n : undefined;
};

/** 合併 error 上的 status 與 ofetch 訊息列（供 useApiBase、嚴重度） */
export const resolveFetchHttpStatus = (error: unknown): number | undefined =>
	coerceHttpStatusCode(error) ??
	parseExternalDataHttpStatusFromMessage(String((error as any)?.message ?? ""));

export const extractBackendApiErrorText = (error: unknown): string => {
	const e = error as any;
	const data = e?.data ?? e?.response?._data ?? e?.response?.data;
	if (typeof data === "string") {
		try {
			const parsed = JSON.parse(data) as Record<string, unknown>;
			if (parsed && typeof parsed === "object") {
				const errObj = parsed.error as Record<string, unknown> | undefined;
				return clipUserFacingApiErrorText(
					(typeof errObj?.message === "string" && errObj.message) ||
						(typeof parsed.message === "string" && parsed.message) ||
						(typeof parsed.details === "string" && parsed.details) ||
						""
				);
			}
		} catch {
			return clipUserFacingApiErrorText(data);
		}
		return clipUserFacingApiErrorText(data);
	}
	if (data && typeof data === "object") {
		const errObj = (data as any).error;
		return clipUserFacingApiErrorText(
			errObj?.message ?? (data as any).message ?? (data as any).details ?? ""
		);
	}
	return clipUserFacingApiErrorText(e?.message ?? "");
};

const looksLikeOfetchDebugLine = (s: string): boolean => {
	const t = String(s || "").trim();
	if (!t) return false;
	if (/^\[\s*\w+\]\s+"/.test(t) && /\d{3}\b/.test(t)) return true;
	if (/\bHTTP_\d{3}\b/i.test(t)) return true;
	return false;
};

/** Toast 最後防線：長 URL、表名、技術句改為固定分類 */
export const simplifyUserFacingToastMessage = (msg: string): string => {
	const s = String(msg || "").trim();
	if (!s) return s;
	if (looksLikeOfetchDebugLine(s)) return USER_FACING_API_UNEXPECTED;
	if (isLikelyHtmlOrDocumentErrorPage(s)) return USER_FACING_API_UNEXPECTED;
	let clipped = s;
	if (clipped.length > MAX_USER_VISIBLE_API_ERROR_CHARS) {
		clipped = `${clipped.slice(0, MAX_USER_VISIBLE_API_ERROR_CHARS).trimEnd()}…`;
	}
	if (parseExternalDataHttpStatusFromMessage(clipped) !== undefined) return USER_FACING_EXTERNAL_DB_ERROR;
	if (/查詢\s+[\w.]+\s+/.test(clipped) && /失敗\s*:/.test(clipped)) return USER_FACING_EXTERNAL_DB_ERROR;
	return clipped;
};

/** 元件 catch 內可共用：ApiRequestError 用固定句，其餘走 simplify */
export const resolveUserFacingCatchMessage = (error: unknown, fallback: string): string => {
	if (error instanceof ApiRequestError) return error.message;
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

export const inferSeverityFromApiError = (error: unknown): AppSeverity => {
	const e = error as any;
	const statusCode = resolveFetchHttpStatus(error);

	if (statusCode === 400) return "warning";
	if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) return "error";
	if (statusCode !== undefined && statusCode >= 500 && statusCode < 600) return "critical";

	const code: string = String(e?.code ?? "");
	if (code === "NETWORK_ERROR") return "critical";
	if (code === "TIMEOUT") return "error";

	const message = String(e?.message ?? "").toLowerCase();
	if (CONNECTION_ERROR_TOKENS.some(t => message.includes(String(t).toLowerCase()))) {
		return "critical";
	}
	if (TIMEOUT_ERROR_TOKENS.some(t => message.includes(String(t).toLowerCase()))) {
		return "error";
	}
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

/**
 * 檢查是否為設備連接錯誤
 * @param errorMessage - 錯誤訊息
 * @returns 是否為設備連接錯誤
 */
export const isDeviceConnectionError = (errorMessage: string): boolean => {
	const msg = String(errorMessage || "");
	const lower = msg.toLowerCase();
	const hasIp = Boolean(lower.match(/\d+\.\d+\.\d+\.\d+:\d+/));
	const isDeviceApi = lower.includes("/modbus/") || lower.includes("/device/");

	if (CONNECTION_ERROR_TOKENS.some(t => lower.includes(String(t).toLowerCase()))) {
		return true;
	}

	if (isDeviceApi && hasIp) {
		return true;
	}

	if (lower.includes("503")) return true;

	return false;
};

/**
 * 檢查是否為設備 API 請求
 * @param path - API 路徑
 * @returns 是否為設備 API 請求
 */
export const isDeviceApiRequest = (path: string): boolean => {
	return path.includes("/modbus/") || path.includes("/device/");
};
