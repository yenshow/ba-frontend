import type {
	User,
	LoginCredentials,
	RegisterData,
	LoginResponse,
	PermissionDefinition,
	UserPermissionSettings
} from "~/types/user";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPaginationParams, buildPathWithQuery, mergeQueryParams } from "~/utils/apiUtils";

/**
 * 用戶 API Composable
 * 統一使用 useApiBase，特殊處理登入錯誤以提供更好的用戶體驗
 */
export const useUserApi = () => {
	const { request: baseRequest } = useApiBase();

	/**
	 * 包裝請求函數，特殊處理登入錯誤
	 * 統一顯示「用戶名或密碼錯誤」以提供更好的用戶體驗
	 */
	const request = async <T>(path: string, options: RequestInit = {}) => {
		try {
			return await baseRequest<T>(path, options);
		} catch (error: any) {
			// 特殊處理：登入錯誤統一顯示友好訊息（用戶體驗優化）
			if (path.includes("/login")) {
				const errorMessage = error?.message || "";
				const isLoginError =
					errorMessage.includes("用戶名") ||
					errorMessage.includes("密碼") ||
					errorMessage.includes("帳號") ||
					errorMessage.includes("username") ||
					errorMessage.includes("password") ||
					errorMessage.includes("登入失敗") ||
					errorMessage.includes("認證失敗") ||
					errorMessage.includes("401") ||
					errorMessage.includes("401");

				// 如果是登入相關錯誤，統一顯示友好訊息
				if (isLoginError) {
					throw new Error("用戶名或密碼錯誤");
				}
			}

			// 其他錯誤直接拋出（由 useApiBase 統一處理）
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

		// 取得當前用戶（後端回傳 { user }，此處解包以符合 useAuth 預期）
		getMe: async (): Promise<User> => {
			const res = await request<{ user: User }>("/users/me");
			return res.user;
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

			// 構建篩選參數
			const filterParams: Record<string, unknown> = {};
			if (params?.role) filterParams.role = params.role;
			if (params?.status) filterParams.status = params.status;

			// 構建分頁參數
			const paginationParams = buildPaginationParams({
				limit: params?.limit,
				offset: params?.offset,
				orderBy: params?.orderBy,
				order: params?.order
			});

			// 合併參數
			const allParams = mergeQueryParams(filterParams, paginationParams);

			const path = buildPathWithQuery("/users", allParams);
			return request<{ users: User[]; total: number; limit: number; offset: number }>(path);
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
		},

		// 權限定義（供權限設定頁渲染）
		getPermissionDefinitions: (tree = false) => {
			const path = tree ? "/permissions/definitions?tree=true" : "/permissions/definitions";
			return request<{ definitions: PermissionDefinition[] }>(path);
		},

		// 取得某用戶的權限設定（管理員）
		getUserPermissions: (userId: number) => {
			return request<UserPermissionSettings>(`/users/${userId}/permissions`);
		},

		// 寫入某用戶的權限覆寫（管理員）
		updateUserPermissions: (userId: number, overrides: { permission_id: number; granted: boolean }[]) => {
			return request<UserPermissionSettings>(`/users/${userId}/permissions`, {
				method: "PUT",
				body: JSON.stringify({ overrides })
			});
		}
	};
};

