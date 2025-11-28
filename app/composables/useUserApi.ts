import { useRequestFetch } from "#app";
import type { User, LoginCredentials, RegisterData, LoginResponse } from "~/types/user";

export const useUserApi = () => {
	const config = useRuntimeConfig();
	const fetcher = useRequestFetch();

	// 使用環境變數配置的 API base URL
	const apiBase = config.public.apiBase || "http://localhost:4000/api";

	// 取得認證 headers
	const getAuthHeaders = (): HeadersInit => {
		const token = useCookie("auth_token").value;
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			Accept: "application/json"
		};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		return headers;
	};

	const request = async <T>(path: string, options: RequestInit = {}) => {
		const url = `${apiBase}${path}`;
		const headers: Record<string, string> = {
			...(getAuthHeaders() as Record<string, string>),
			...(options.headers as Record<string, string>)
		};

		// 設置超時時間（10秒）
		const timeout = 10000;

		// 開發模式下記錄請求詳情
		if (process.dev && process.client) {
			console.log(`[User API] ${options.method || "GET"} ${url}`, {
				headers: { ...headers, Authorization: headers.Authorization ? "Bearer ***" : undefined },
				body: options.body
			});
		}

		try {
			const response = await fetcher<T>(url, {
				...options,
				headers,
				credentials: "include", // 配合後端 CORS credentials: true 設定
				timeout
			} as any);
			return response;
		} catch (error: any) {
			// 開發模式下記錄完整錯誤資訊
			if (process.dev && process.client) {
				console.error(`[User API] 請求失敗: ${url}`, {
					error,
					statusCode: error?.statusCode || error?.status,
					statusText: error?.statusText,
					message: error?.message,
					data: error?.data,
					// 診斷資訊
					diagnostics: {
						requestUrl: url,
						apiBase: apiBase,
						timestamp: new Date().toISOString()
					}
				});
			}

			// 處理 CORS 錯誤（後端可能沒收到請求）
			if (
				error?.message?.includes("CORS") ||
				error?.message?.includes("cross-origin") ||
				error?.message?.includes("Access-Control") ||
				error?.statusCode === 0 || // CORS 錯誤通常沒有狀態碼
				(error?.statusCode === undefined && error?.status === undefined && error?.message?.includes("fetch"))
			) {
				const errorMsg =
					`CORS 錯誤：無法連接到後端 API (${url})\n` +
					`可能原因：\n` +
					`1. 後端 CORS 設定未包含前端來源\n` +
					`2. 後端地址不正確或無法訪問\n` +
					`3. 網路連線問題\n\n` +
					`請檢查：\n` +
					`- 後端 CORS_ORIGINS 環境變數是否包含前端地址\n` +
					`- 後端是否正常運行\n` +
					`- 前端 NUXT_PUBLIC_API_BASE 環境變數是否正確`;
				throw new Error(errorMsg);
			}

			// 處理請求超時
			if (error?.message?.includes("timeout") || error?.name === "TimeoutError") {
				throw new Error(`請求超時 (${url})，請檢查網路連線或稍後再試`);
			}

			// 處理網路錯誤（無法連接到伺服器）
			if (
				error?.message?.includes("fetch") ||
				error?.code === "ECONNREFUSED" ||
				error?.code === "ENOTFOUND" ||
				error?.message?.includes("Failed to fetch") ||
				error?.message?.includes("NetworkError")
			) {
				throw new Error(
					`無法連接到後端伺服器 (${url})\n` +
						`請確認：\n` +
						`1. 後端服務是否正常運行\n` +
						`2. 後端地址是否正確（檢查 NUXT_PUBLIC_API_BASE 環境變數）\n` +
						`3. 網路連線是否正常`
				);
			}

			// 提取後端返回的錯誤訊息（從多個可能的來源）
			// 後端錯誤格式可能是：{ error: true, message: "...", details: "..." }
			const backendErrorMsg = 
				error?.data?.message || 
				error?.data?.details || 
				error?.data?.error?.message ||
				error?.message || 
				"";
			const statusCode = error?.statusCode || error?.status;
			
			// 檢查是否為登入相關錯誤（從錯誤訊息中判斷）
			const isLoginError = (msg: string) => 
				msg.includes("用戶名") || 
				msg.includes("密碼") || 
				msg.includes("帳號") ||
				msg.includes("username") ||
				msg.includes("password");

			// 處理 400 Bad Request - 通常用於登入失敗等業務邏輯錯誤
			if (statusCode === 400) {
				// 如果是登入相關的錯誤，顯示更友好的訊息
				if (url.includes("/login") && isLoginError(backendErrorMsg)) {
					throw new Error("用戶名或密碼錯誤");
				}
				throw new Error(backendErrorMsg || "請求參數錯誤");
			}

			// 處理 401 Unauthorized - Token 過期或認證失敗
			if (statusCode === 401) {
				// 如果是登入請求，可能是帳號密碼錯誤（後端可能用 401 表示登入失敗）
				if (url.includes("/login")) {
					if (isLoginError(backendErrorMsg)) {
						throw new Error("用戶名或密碼錯誤");
					}
					throw new Error(backendErrorMsg || "登入失敗，請檢查帳號密碼");
				}

				// 其他 401 錯誤（Token 過期）
				const { logout } = useAuth();
				logout();

				// 只在客戶端顯示提示並重定向
				if (process.client) {
					const toast = useToast();
					toast.warning("登入已過期，請重新登入");

					const router = useRouter();
					await router.push({
						path: "/login",
						query: {
							redirect: router.currentRoute.value.fullPath
						}
					});
				}

				throw new Error("登入已過期，請重新登入");
			}

			// 處理 403 Forbidden - 權限不足
			if (statusCode === 403) {
				throw new Error(backendErrorMsg || "權限不足，無法執行此操作");
			}

			// 處理 404 Not Found
			if (statusCode === 404) {
				throw new Error(backendErrorMsg || "請求的資源不存在");
			}

			// 處理 500 Internal Server Error - 服務器錯誤
			if (statusCode === 500) {
				// 檢查是否為業務邏輯錯誤（如登入失敗）被誤判為 500
				// 後端可能將登入失敗錯誤當作 500 處理，但錯誤訊息是"用戶名或密碼錯誤"
				if (url.includes("/login") && isLoginError(backendErrorMsg)) {
					throw new Error("用戶名或密碼錯誤");
				}
				
				const errorMessage = backendErrorMsg || error?.statusText || "Internal Server Error";
				throw new Error(`伺服器錯誤 (500): ${errorMessage}。請檢查後端服務是否正常運行，或聯繫系統管理員。`);
			}

			if (error instanceof Error) {
				// 如果有狀態碼，包含在錯誤訊息中
				const statusCode = (error as any)?.statusCode || (error as any)?.status;
				if (statusCode) {
					throw new Error(`API 請求失敗 (${statusCode}): ${error.message}`);
				}
				throw new Error(`API 請求失敗: ${error.message}`);
			}
			throw error;
		}
	};

	return {
		// 註冊
		register: (data: RegisterData) => {
			return request<{ message: string; user: User }>("/users/register", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 登入
		login: (credentials: LoginCredentials) => {
			return request<LoginResponse>("/users/login", {
				method: "POST",
				body: JSON.stringify(credentials)
			});
		},

		// 取得當前用戶
		getMe: () => {
			return request<User>("/users/me");
		},

		// 取得用戶列表（管理員）
		getUsers: (params?: { role?: string; status?: string; limit?: number; offset?: number; orderBy?: string; order?: "asc" | "desc" }) => {
			const query = new URLSearchParams();
			if (params?.role) query.append("role", params.role);
			if (params?.status) query.append("status", params.status);
			// 參數驗證和默認值由後端統一處理
			if (params?.limit !== undefined && params?.limit !== null) {
				query.append("limit", String(params.limit));
			}
			if (params?.offset !== undefined && params?.offset !== null) {
				query.append("offset", String(params.offset));
			}
			if (params?.orderBy) {
				query.append("orderBy", params.orderBy);
			}
			if (params?.order) {
				query.append("order", params.order);
			}

			const queryString = query.toString();
			return request<{ users: User[]; total: number; limit: number; offset: number }>(`/users${queryString ? `?${queryString}` : ""}`);
		},

		// 更新用戶
		updateUser: (id: number, data: Partial<User>) => {
			return request<{ message: string; user: User }>(`/users/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除用戶（管理員）
		deleteUser: (id: number) => {
			return request<{ message: string }>(`/users/${id}`, {
				method: "DELETE"
			});
		}
	};
};
