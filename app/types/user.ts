export interface User {
	id: number;
	username: string;
	role: "admin" | "user";
	status: "active" | "inactive";
	/** 有效權限代碼（admin 全部；user 僅 overrides） */
	permissions?: string[];
	created_at?: string;
	updated_at?: string;
}

export interface PermissionDefinition {
	id: number;
	code: string;
	category: string;
	parent_id: number | null;
	name: string | null;
	sort_order: number;
}

export interface PermissionDefinitionsResponse {
	definitions: PermissionDefinition[];
}

export interface UserPermissionOverridesResponse {
	overridesByPermId: Record<number, boolean>;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface ChangePasswordData {
	oldPassword?: string;
	newPassword: string;
}

export interface CreateManagedUserData {
	username: string;
	password: string;
	role?: "admin" | "user";
	overrides?: { permission_id: number; granted: boolean }[];
}

export interface CreateManagedUserResponse {
	user: User;
}

export interface UpdateUserData {
	username?: string;
	role?: "admin" | "user";
	status?: "active" | "inactive";
}

export interface LoginResponse {
	message: string;
	user: User;
	token: string;
}
