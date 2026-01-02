import type { User, LoginCredentials, RegisterData, LoginResponse } from "~/types/user";
import { useApiBase } from "~/composables/useApiBase";

export const useUserApi = () => {
	const { request: baseRequest } = useApiBase();

	/**
	 * 包裝請求函數，處理登入相關的特殊錯誤
	 * 統一顯示「用戶名或密碼錯誤」以提供更好的用戶體驗
	 */
	const request = async <T>(path: string, options: RequestInit = {}) => {
		try {
			return await baseRequest<T>(path, options);
		} catch (error: any) {
			// 開發模式下記錄登入相關請求的詳細資訊
			if (process.dev && process.client && path.includes("/login")) {
				console.error(`[User API] 登入請求失敗: ${path}`, {
					error,
					statusCode: error?.statusCode || error?.status,
					message: error?.message
				});
			}

			// 處理登入相關錯誤：統一顯示友好的錯誤訊息
			if (path.includes("/login")) {
			const errorMessage = error?.message || "";
				const isLoginError =
					errorMessage.includes("用戶名") ||
					errorMessage.includes("密碼") ||
					errorMessage.includes("帳號") ||
					errorMessage.includes("username") ||
					errorMessage.includes("password") ||
					errorMessage.includes("登入失敗") ||
					errorMessage.includes("認證失敗");

				// 如果是登入相關錯誤，統一顯示友好訊息
				if (isLoginError) {
					throw new Error("用戶名或密碼錯誤");
				}
				}

			// 其他錯誤直接拋出（由 useApiBase 處理）
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
		getUsers: (params?: {
			role?: string;
			status?: string;
			limit?: number;
			offset?: number;
			orderBy?: string;
			order?: "asc" | "desc";
		}) => {
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
			return request<{ users: User[]; total: number; limit: number; offset: number }>(
				`/users${queryString ? `?${queryString}` : ""}`
			);
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
