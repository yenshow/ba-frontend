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
	| "DEVICE_CONNECTION_ERROR"
	| "TIMEOUT"
	| "CORS"
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
				return String(
					(typeof errObj?.message === "string" && errObj.message) ||
						(typeof parsed.message === "string" && parsed.message) ||
						(typeof parsed.details === "string" && parsed.details) ||
						""
				);
			}
		} catch {
			return data;
		}
	}
	if (data && typeof data === "object") {
		const errObj = (data as any).error;
		return String(errObj?.message ?? (data as any).message ?? (data as any).details ?? "");
	}
	return String(e?.message ?? "");
};

/** Toast 最後防線：長 URL、表名、技術句改為固定分類 */
export const simplifyUserFacingToastMessage = (msg: string): string => {
	const s = String(msg || "").trim();
	if (!s) return s;
	if (parseExternalDataHttpStatusFromMessage(s) !== undefined) return USER_FACING_EXTERNAL_DB_ERROR;
	if (/查詢\s+[\w.]+\s+/.test(s) && /失敗\s*:/.test(s)) return USER_FACING_EXTERNAL_DB_ERROR;
	return s;
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
	if (statusCode === 401 || statusCode === 403 || statusCode === 404) return "error";
	if (statusCode === 500 || statusCode === 503) return "critical";

	const code: string = String(e?.code ?? "");
	if (code === "DEVICE_CONNECTION_ERROR" || code === "NETWORK_ERROR") return "critical";
	if (code === "TIMEOUT" || code === "CORS") return "error";

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
