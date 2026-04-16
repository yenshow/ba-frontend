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

export const severityToToastType = (
	severity: AppSeverity
): { type: "error" | "warning" | "info"; duration: number } => {
	if (severity === "critical") return { type: "error", duration: 10000 };
	if (severity === "error") return { type: "warning", duration: 8000 };
	return { type: "info", duration: 5000 };
};

export const inferSeverityFromApiError = (error: unknown): AppSeverity => {
	const e = error as any;
	const statusCode: number | undefined =
		typeof e?.statusCode === "number"
			? e.statusCode
			: typeof e?.status === "number"
				? e.status
				: undefined;

	// 優先看 statusCode（契約：http-errors.md）
	if (statusCode === 400) return "warning";
	if (statusCode === 401 || statusCode === 403 || statusCode === 404) return "error";
	if (statusCode === 500 || statusCode === 503) return "critical";

	// 再看 code（非必須，但支援未來從 useApiBase 注入）
	const code: string = String(e?.code ?? "");
	if (code === "DEVICE_CONNECTION_ERROR" || code === "NETWORK_ERROR") return "critical";
	if (code === "TIMEOUT" || code === "CORS") return "error";

	// 最後 fallback：以 message 低成本兜底
	const message = String(e?.message ?? "").toLowerCase();
	if (CONNECTION_ERROR_TOKENS.some((t) => message.includes(String(t).toLowerCase()))) {
		return "critical";
	}
	if (TIMEOUT_ERROR_TOKENS.some((t) => message.includes(String(t).toLowerCase()))) {
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
	const isDeviceApi =
		lower.includes("/modbus/") || lower.includes("/device/");

	if (CONNECTION_ERROR_TOKENS.some((t) => lower.includes(String(t).toLowerCase()))) {
		return true;
	}

	// 特例：包含設備 API 路徑 + IP 時，視為設備連線類錯誤
	if (isDeviceApi && hasIp) {
		return true;
	}

	// 503 的字串殘留（無 status 時的舊訊息）仍視為連線類
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

