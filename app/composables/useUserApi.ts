import { useRequestFetch } from "#app";
import type { User, LoginCredentials, RegisterData, LoginResponse } from "~/types/user";

export const useUserApi = () => {
	const config = useRuntimeConfig();
	const fetcher = useRequestFetch();
	const { adjustApiBase } = useApiBase();

	// 獲取並調整 API base URL
	const apiBase = adjustApiBase(config.public.apiBase || "http://localhost:4000/api", "User API");

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
					data: error?.data
				});
			}

			// 處理請求超時
			if (error?.message?.includes("timeout") || error?.name === "TimeoutError") {
				throw new Error("請求超時，請檢查網路連線或稍後再試");
			}

			// 處理網路錯誤（無法連接到伺服器）
			if (
				error?.message?.includes("fetch") ||
				error?.code === "ECONNREFUSED" ||
				error?.code === "ENOTFOUND" ||
				error?.message?.includes("Failed to fetch") ||
				error?.message?.includes("NetworkError")
			) {
				throw new Error("無法連接到伺服器，請確認後端 API 是否正常運行");
			}

			// 處理 401 Unauthorized - Token 過期
			if (error?.statusCode === 401 || error?.status === 401) {
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
			if (error?.statusCode === 403 || error?.status === 403) {
				throw new Error("權限不足，無法執行此操作");
			}

			// 處理 404 Not Found
			if (error?.statusCode === 404 || error?.status === 404) {
				throw new Error("請求的資源不存在");
			}

			// 處理 500 Internal Server Error - 服務器錯誤
			if (error?.statusCode === 500 || error?.status === 500) {
				const statusText = error?.statusText || "Internal Server Error";
				const errorMessage = error?.message || statusText;
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
