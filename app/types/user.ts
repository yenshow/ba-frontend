export interface User {
	id: number;
	username: string;
	role: "admin" | "operator" | "viewer";
	status: "active" | "inactive" | "suspended";
	/** 有效權限代碼（登入／me 由後端計算：角色預設 + 用戶覆寫） */
	permissions?: string[];
	created_at?: string;
	updated_at?: string;
}

/** 權限定義（與後端 permission_definitions 對齊） */
export interface PermissionDefinition {
	id: number;
	code: string;
	category: string;
	parent_id: number | null;
	name: string | null;
	sort_order: number;
	children?: PermissionDefinition[];
}

/** 某用戶的權限設定（管理員取得／寫入用） */
export interface UserPermissionSettings {
	definitions: PermissionDefinition[];
	roleDefaultsByPermId: Record<number, boolean>;
	overridesByPermId: Record<number, boolean>;
	effectiveCodes: string[];
	role: string;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface RegisterData {
	username: string;
	password: string;
	role?: "admin" | "operator" | "viewer";
}

export interface LoginResponse {
	message: string;
	user: User;
	token: string;
}


