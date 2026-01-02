import { useRequestFetch } from "#app";
import { useAuth } from "~/composables/useAuth";
import { useToast } from "~/composables/useToast";

/**
 * 共用的 API 基礎 composable
 * 提供統一的請求處理和錯誤處理邏輯
 */
export const useApiBase = () => {
	const config = useRuntimeConfig();
	const fetcher = useRequestFetch();

	// 使用環境變數配置的 API base URL
	const apiBase = config.public.apiBase || "http://localhost:4000/api";

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
	const request = async <T>(path: string, options: RequestInit = {}) => {
		const url = `${apiBase}${path}`;
		const headers: Record<string, string> = {
			...(getAuthHeaders() as Record<string, string>),
			// 禁用瀏覽器快取，確保取得最新資料
			// 注意：只使用標準的 Cache-Control 和 Pragma，避免 CORS 問題
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Pragma: "no-cache",
			...(options.headers as Record<string, string>)
		};

		// 設置超時時間（10秒）
		const timeout = 10000;

		try {
			const response = await fetcher<T>(url, {
				...options,
				headers,
				credentials: "include",
				timeout
			} as any);
			return response;
		} catch (error: any) {
			// 先提取後端返回的錯誤訊息和狀態碼（優先處理 HTTP 狀態碼）
			const backendErrorMsg =
				error?.data?.message ||
				error?.data?.details ||
				error?.data?.error?.message ||
				error?.message ||
				"";
			const statusCode = error?.statusCode || error?.status;

			// 如果有 HTTP 狀態碼，優先處理狀態碼錯誤（而不是網路錯誤）
			// 這樣可以正確處理 503 等服務錯誤，而不是誤判為後端連接錯誤
			if (statusCode !== undefined && statusCode !== null) {
			if (statusCode === 400) {
				throw new Error(backendErrorMsg || "請求參數錯誤");
			}

			if (statusCode === 401) {
				const { logout } = useAuth();
				logout();
				if (process.client) {
					const toast = useToast();
					toast.warning("登入已過期，請重新登入");
					const router = useRouter();
					const currentPath = router.currentRoute.value?.fullPath || "/";
					await router.push({
						path: "/login",
						query: {
							redirect: currentPath
						}
					});
				}
				throw new Error("登入已過期，請重新登入");
			}

			if (statusCode === 403) {
				throw new Error(backendErrorMsg || "權限不足，無法執行此操作");
			}

			if (statusCode === 404) {
				throw new Error(backendErrorMsg || "請求的資源不存在");
			}

			if (statusCode === 500) {
				throw new Error(`伺服器錯誤 (500): ${backendErrorMsg || "Internal Server Error"}`);
			}

			if (statusCode === 503) {
				// 503 Service Unavailable - 通常表示設備離線或服務暫時不可用
					// 使用後端返回的詳細錯誤訊息（如 "連接超時: 無法在 10000ms 內連接到..."）
					throw new Error(backendErrorMsg || "設備離線或服務暫時不可用");
				}

				// 其他狀態碼
				throw new Error(`API 請求失敗 (${statusCode}): ${backendErrorMsg || error?.message || "Unknown error"}`);
			}

			// 如果沒有狀態碼，先檢查是否為設備連接錯誤（優先於網路錯誤判斷）
			const errorMessage = error?.message || "";
			
			// 檢查是否為設備連接錯誤（Modbus 設備連接超時等）
			// 通過檢查錯誤訊息中是否包含 IP:Port 格式來判斷
			const isDeviceConnectionError =
				errorMessage.includes("連接超時") ||
				errorMessage.includes("無法在") && errorMessage.match(/\d+\.\d+\.\d+\.\d+:\d+/) ||
				errorMessage.includes("連接被拒絕") ||
				errorMessage.includes("無法到達設備") ||
				errorMessage.includes("連接已斷開") ||
				(errorMessage.includes("連接到") && errorMessage.match(/\d+\.\d+\.\d+\.\d+:\d+/));

			if (isDeviceConnectionError) {
				// 這是設備連接錯誤，不是後端連接錯誤
				// 使用原始錯誤訊息或提供更友好的訊息
				throw new Error(backendErrorMsg || errorMessage || "設備連接失敗，請檢查設備狀態");
			}

			// 如果沒有狀態碼，再處理網路錯誤（真正的後端連接錯誤）
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

			if (isNetworkError) {
				const targetHost = url.match(/https?:\/\/([^\/:]+)/)?.[1] || "未知";
				throw new Error(
					`無法連接到後端伺服器 (${targetHost})\n\n` +
						`請確認：\n` +
						`1. 後端服務是否正常運行\n` +
						`2. 後端地址是否正確：${url}\n` +
						`3. 前端和後端是否在同一網路或可以互相訪問`
				);
			}

			// 處理請求超時（沒有狀態碼的情況）
			if (errorMessage.includes("timeout") || error?.name === "TimeoutError") {
				throw new Error(`請求超時 (${url})，請檢查網路連線或稍後再試`);
			}

			// 處理 CORS 錯誤
			if (
				errorMessage.includes("CORS") ||
				errorMessage.includes("cross-origin") ||
				errorMessage.includes("Access-Control") ||
				(error?.statusCode === 0 && !isNetworkError)
			) {
				throw new Error(
					`CORS 錯誤：無法連接到後端 API (${url})\n\n` +
						`請檢查後端 CORS_ORIGINS 環境變數是否包含前端地址`
				);
			}

			// 如果以上都不匹配，處理其他錯誤
			if (error instanceof Error) {
				throw new Error(`API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	return {
		apiBase,
		request
	};
};
