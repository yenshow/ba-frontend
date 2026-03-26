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

	const request = async <T>(path: string, options: RequestInit = {}) => {
		try {
			return await baseRequest<T>(path, options);
		} catch (error: any) {
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

				if (isLoginError) {
					throw new Error("用戶名或密碼錯誤");
				}
			}

			throw error;
		}
	};

	return {
		register: (data: RegisterData) => {
			return request<{ message: string; user: User }>("/users/register", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		login: (credentials: LoginCredentials) => {
			return request<LoginResponse>("/users/login", {
				method: "POST",
				body: JSON.stringify(credentials)
			});
		},

		getMe: async (): Promise<User> => {
			const res = await request<{ user: User }>("/users/me");
			return res.user;
		},

		getUsers: (params?: {
			role?: string;
			status?: string;
			limit?: number;
			offset?: number;
			orderBy?: string;
			order?: "asc" | "desc";
		}) => {

			const filterParams: Record<string, unknown> = {};
			if (params?.role) filterParams.role = params.role;
			if (params?.status) filterParams.status = params.status;

			const paginationParams = buildPaginationParams({
				limit: params?.limit,
				offset: params?.offset,
				orderBy: params?.orderBy,
				order: params?.order
			});

			const allParams = mergeQueryParams(filterParams, paginationParams);

			const path = buildPathWithQuery("/users", allParams);
			return request<{ users: User[]; total: number; limit: number; offset: number }>(path);
		},

		updateUser: (id: number, data: Partial<User>) => {
			return request<{ message: string; user: User }>(`/users/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		deleteUser: (id: number) => {
			return request<{ message: string }>(`/users/${id}`, {
				method: "DELETE"
			});
		},

		getPermissionDefinitions: (tree = false) => {
			const path = tree ? "/permissions/definitions?tree=true" : "/permissions/definitions";
			return request<{ definitions: PermissionDefinition[] }>(path);
		},

		getUserPermissions: (userId: number) => {
			return request<UserPermissionSettings>(`/users/${userId}/permissions`);
		},

		updateUserPermissions: (userId: number, overrides: { permission_id: number; granted: boolean }[]) => {
			return request<UserPermissionSettings>(`/users/${userId}/permissions`, {
				method: "PUT",
				body: JSON.stringify({ overrides })
			});
		}
	};
};

