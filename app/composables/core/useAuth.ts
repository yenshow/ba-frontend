import type { User, LoginCredentials } from "~/types/user";
import { useUserApi } from "~/composables/systems/useUserApi";
import { getPermissionCodeByRoute } from "~/constants/permissions";

export const useAuth = () => {
	const userApi = useUserApi();
	const config = useRuntimeConfig();

	// 使用 cookie 儲存 token 和用戶資訊
	// secure: 依 API 協定決定
	// - https://backend.yenshow.com (Cloudflare tunnel) → secure: true
	// - http://192.168.2.8:4000 (本地) → secure: false（HTTP 無法設置 secure cookie）
	// 可透過 NUXT_PUBLIC_SECURE_COOKIE 強制覆寫（true/false）
	const apiBase = config.public.apiBase || "http://localhost:4000/api";
	const secureOverride = (config.public as { secureCookie?: string }).secureCookie;
	const isSecure =
		secureOverride !== undefined && secureOverride !== ""
			? secureOverride === "true"
			: apiBase.startsWith("https://");

	const tokenCookie = useCookie<string | null>("auth_token", {
		default: () => null,
		secure: isSecure,
		sameSite: "strict",
		maxAge: 60 * 60 * 24 * 7, // 7 天
		httpOnly: false // 需要在前端 JavaScript 中訪問
	});

	const userCookie = useCookie<User | null>("auth_user", {
		default: () => null,
		secure: isSecure,
		sameSite: "strict",
		maxAge: 60 * 60 * 24 * 7, // 7 天
		httpOnly: false // 需要在前端 JavaScript 中訪問
	});

	// 響應式狀態
	const user = useState<User | null>("auth_user", () => userCookie.value);
	const token = useState<string | null>("auth_token", () => tokenCookie.value);

	// 計算屬性
	const isAuthenticated = computed(() => !!token.value && !!user.value);
	const isAdmin = computed(() => user.value?.role === "admin");
	const isOperator = computed(() => user.value?.role === "operator" || user.value?.role === "admin");
	const isViewer = computed(() => user.value?.role === "viewer" || isOperator.value);

	/** 是否具備指定權限（admin 視為擁有全部；其餘依 user.permissions） */
	const hasPermission = (code: string): boolean => {
		const u = user.value;
		if (!u) return false;
		if (u.role === "admin") return true;
		return Array.isArray(u.permissions) && u.permissions.includes(code);
	};

	/** 是否具備該模組（系統）的存取權限：若該路由需權限則檢查 hasPermission，否則視為有權限 */
	const hasModulePermission = (module: { route: string }): boolean => {
		const code = getPermissionCodeByRoute(module.route);
		if (!code) return true;
		return hasPermission(code);
	};

	// 登入
	const login = async (credentials: LoginCredentials) => {
		try {
			const response = await userApi.login(credentials);

			// 儲存 token 和用戶資訊
			tokenCookie.value = response.token;
			userCookie.value = response.user;
			token.value = response.token;
			user.value = response.user;

			return response;
		} catch (error) {
			// 清除狀態
			logout();
			throw error;
		}
	};

	// 登出
	const logout = () => {
		tokenCookie.value = null;
		userCookie.value = null;
		token.value = null;
		user.value = null;
	};

	// 取得當前用戶資訊（從 API）- 用於手動刷新用戶資訊
	const fetchUser = async () => {
		try {
			const currentUser = await userApi.getMe();
			userCookie.value = currentUser;
			user.value = currentUser;
			return currentUser;
		} catch (error) {
			// 如果取得失敗，清除認證狀態
			logout();
			throw error;
		}
	};

	// 初始化：檢查是否有已儲存的認證資訊
	const init = async () => {
		// 如果有 token 但沒有用戶資訊，嘗試從 Cookie 恢復
		if (tokenCookie.value && !user.value) {
			token.value = tokenCookie.value;
		}
		if (userCookie.value && !user.value) {
			user.value = userCookie.value;
		}

		// 如果兩者都存在，可選擇性地驗證 token 是否仍然有效
		// 為了避免每次刷新都調用 API，這裡只檢查是否有 token 和用戶資訊
		// Token 的有效性會在實際 API 調用時由後端驗證（401 錯誤處理）
		if (token.value && user.value) {
			// 可選：在後台靜默驗證 token（不影響用戶體驗）
			// 如果不需要即時驗證，可以跳過這個檢查
		}
	};

	return {
		user: readonly(user),
		token: readonly(token),
		isAuthenticated,
		isAdmin,
		isOperator,
		isViewer,
		hasPermission,
		hasModulePermission,
		login,
		logout,
		fetchUser,
		init
	};
};
