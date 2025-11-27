export interface User {
	id: number;
	username: string;
	email: string;
	role: "admin" | "operator" | "viewer";
	status: "active" | "inactive" | "suspended";
	created_at?: string;
	updated_at?: string;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface RegisterData {
	username: string;
	email: string;
	password: string;
	role?: "admin" | "operator" | "viewer";
}

export interface LoginResponse {
	message: string;
	user: User;
	token: string;
}


