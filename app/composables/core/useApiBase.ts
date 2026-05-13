import { useRequestFetch } from "#app";
import { useAuth } from "~/composables/core/useAuth";
import {
	ApiRequestError,
	extractBackendApiErrorText,
	isDeviceApiRequest,
	isDeviceConnectionError,
	mapHttpStatusToUserFacingError,
	resolveFetchHttpStatus,
	USER_FACING_API_UNAUTHORIZED,
	USER_FACING_API_UNEXPECTED,
	USER_FACING_CONNECTION_ERROR
} from "~/utils/errorUtils";

// GET 同 URL 同時間去重（避免多個元件/多個 watch 同步觸發造成 burst）
const inFlightGetRequests = new Map<string, Promise<unknown>>();

/**
 * 共用的 API 基礎 composable
 * 提供統一的請求處理和錯誤處理邏輯
 */
type RequestOptions = Omit<RequestInit, "body"> & {
	timeout?: number;
	body?: unknown;
};

export const useApiBase = () => {
	const config = useRuntimeConfig();
	const fetcher = useRequestFetch();

	// 使用環境變數配置的 API base URL
	const apiBase = config.public.apiBase || "/api";

	// 取得認證 headers
	// 注意：此函數可能在非 Vue 上下文中調用（如定時器回調），
	// 因此需要安全地獲取 cookie
	const getAuthHeaders = (): HeadersInit => {
		let token: string | null = null;

		// 嘗試獲取 cookie
		try {
			// 優先嘗試使用 Nuxt composable（在 Vue 上下文中）
			const cookie = useCookie("auth_token");
			token = cookie.value;
		} catch (error) {
			// 如果無法使用 composable（如在定時器回調中），直接讀取 cookie
			if (process.client && typeof document !== "undefined") {
				const cookies = document.cookie.split(";");
				const authCookie = cookies.find(cookie => cookie.trim().startsWith("auth_token="));
				if (authCookie) {
					token = decodeURIComponent(authCookie.split("=")[1]?.trim() || "");
					// 如果 token 為空字符串，設為 null
					if (token === "") {
						token = null;
					}
				}
			}
		}

		const headers: HeadersInit = {
			"Content-Type": "application/json",
			Accept: "application/json"
		};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		return headers;
	};

	// 統一的請求處理函數
	const request = async <T>(path: string, options: RequestOptions = {}) => {
		const url = `${apiBase}${path}`;
		const method = String(options.method || "GET").toUpperCase();

		if (method === "GET") {
			const existing = inFlightGetRequests.get(url) as Promise<T> | undefined;
			if (existing) return await existing;
		}

		const isFormData = options.body instanceof FormData;
		const baseHeaders = getAuthHeaders() as Record<string, string>;
		// FormData 時不要設定 Content-Type，讓瀏覽器自動帶上 multipart/form-data + boundary
		if (isFormData) {
			delete baseHeaders["Content-Type"];
		}
		const headers: Record<string, string> = {
			...baseHeaders,
			// 禁用瀏覽器快取，確保取得最新資料
			// 注意：只使用標準的 Cache-Control 和 Pragma，避免 CORS 問題
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Pragma: "no-cache",
			...(options.headers as Record<string, string>)
		};

		// 設置超時時間（預設 5 秒，可通過 options.timeout 自定義）
		const timeout = options.timeout ?? 5000;
		// 從 options 中移除 timeout，避免傳遞給 fetcher 時出現問題
		const { timeout: _timeout, ...fetcherOptions } = options;
		const contentType = String(headers["Content-Type"] || headers["content-type"] || "");
		const shouldStringifyJsonBody =
			!isFormData &&
			fetcherOptions.body != null &&
			typeof fetcherOptions.body === "object" &&
			contentType.includes("application/json");
		const finalBody = shouldStringifyJsonBody
			? JSON.stringify(fetcherOptions.body)
			: fetcherOptions.body;

		const run = async () => {
			const response = await fetcher<T>(url, {
				...fetcherOptions,
				body: finalBody as any,
				headers,
				credentials: "include",
				timeout
			} as any);

			// 統一處理後端響應格式
			if (response && typeof response === "object") {
				// 標準格式 { success: true, data: ... }
				if ("success" in response && "data" in response && (response as any).success === true) {
					return (response as any).data as T;
				}
				// 帶 timestamp 的響應（移除 timestamp）
				if ("timestamp" in response) {
					const { timestamp, ...data } = response as any;
					return data as T;
				}
			}

			return response as any;
		};

		try {
			const promise = run();
			if (method === "GET") {
				inFlightGetRequests.set(url, promise as Promise<unknown>);
			}
			const response = await promise;
			return response as T;
		} catch (error: any) {
			const backendErrorMsg = extractBackendApiErrorText(error);
			const statusCode = resolveFetchHttpStatus(error);
			const isExternalDataQuery = path.includes("/external-data/");

			if (statusCode !== undefined && statusCode !== null) {
				if (statusCode === 401) {
					const { logout } = useAuth();
					logout();
					if (process.client) {
						const router = useRouter();
						const currentPath = router.currentRoute.value?.fullPath || "/";
						const redirectPath =
							currentPath.startsWith("/login") || currentPath.includes("/login?") ? "/" : currentPath;
						await router.push({
							path: "/login",
							query: {
								redirect: redirectPath
							}
						});
					}
					throw new ApiRequestError(USER_FACING_API_UNAUTHORIZED, {
						statusCode,
						code: "HTTP_401",
						originalMessage: backendErrorMsg
					});
				}

				const { message, code } = mapHttpStatusToUserFacingError(statusCode, isExternalDataQuery);
				throw new ApiRequestError(message, {
					statusCode,
					code,
					originalMessage: backendErrorMsg
				});
			}

			const errorMessage = error?.message || "";
			const isDeviceRequest = isDeviceApiRequest(path);

			const isNetworkError =
				errorMessage.includes("ERR_ADDRESS_UNREACHABLE") ||
				errorMessage.includes("ERR_CONNECTION_REFUSED") ||
				errorMessage.includes("ERR_NETWORK") ||
				errorMessage.includes("Failed to fetch") ||
				errorMessage.includes("NetworkError") ||
				errorMessage.includes("ECONNREFUSED") ||
				errorMessage.includes("ENOTFOUND") ||
				error?.code === "ECONNREFUSED" ||
				error?.code === "ENOTFOUND" ||
				(error?.statusCode === undefined &&
					error?.status === undefined &&
					errorMessage.includes("<no response>"));

			if (isDeviceRequest) {
				const isDeviceConn =
					isDeviceConnectionError(errorMessage) ||
					(errorMessage.includes("無法連接到後端伺服器") && !isNetworkError);

				if (isDeviceConn) {
					throw new ApiRequestError(USER_FACING_CONNECTION_ERROR, {
						code: "NETWORK_ERROR",
						originalMessage: backendErrorMsg || errorMessage
					});
				}
			}

			if (isNetworkError) {
				throw new ApiRequestError(USER_FACING_CONNECTION_ERROR, {
					code: "NETWORK_ERROR",
					originalMessage: backendErrorMsg || errorMessage
				});
			}

			if (
				errorMessage.includes("CORS") ||
				errorMessage.includes("cross-origin") ||
				errorMessage.includes("Access-Control") ||
				(error?.statusCode === 0 && !isNetworkError)
			) {
				throw new ApiRequestError(USER_FACING_CONNECTION_ERROR, {
					code: "NETWORK_ERROR",
					originalMessage: backendErrorMsg || errorMessage
				});
			}

			if (error instanceof Error) {
				throw new ApiRequestError(USER_FACING_API_UNEXPECTED, {
					code: "UNKNOWN",
					originalMessage: backendErrorMsg || errorMessage
				});
			}
			throw error;
		} finally {
			if (method === "GET") {
				inFlightGetRequests.delete(url);
			}
		}
	};

	return {
		apiBase,
		request
	};
};
