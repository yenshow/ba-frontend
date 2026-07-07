import type { User, LoginCredentials } from "~/types/user";
import { useUserApi } from "~/composables/systems/users/useUserApi";
import { disconnectGlobalWebSocket } from "~/composables/websocket/useWebSocket";
import { isApiUnauthorizedError } from "~/utils/apiError";

const SESSION_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
/** 與後端 config.js 寫死一致（24h） */
const JWT_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** 登入成功或已登入時的安全站內導向路徑（防 open redirect） */
export const sanitizeAuthRedirectPath = (raw: unknown): string => {
	if (typeof raw !== "string") return "/";
	const trimmed = raw.trim();
	if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
	return trimmed;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
		return JSON.parse(atob(padded)) as Record<string, unknown>;
	} catch {
		return null;
	}
};

/** 客戶端可判斷的 token 失效（格式錯誤或 exp 已過）；其餘仍須後端驗證 */
const isLocalTokenStale = (token: string): boolean => {
	const payload = decodeJwtPayload(token);
	if (!payload) return true;
	if (typeof payload.exp === "number") return payload.exp * 1000 <= Date.now();
	return false;
};

/** 是否應呼叫 POST /users/refresh（剩餘壽命低於閾值且尚未過期） */
const isJwtDueForRefresh = (token: string): boolean => {
	const payload = decodeJwtPayload(token);
	if (!payload || typeof payload.exp !== "number") return false;
	const remaining = payload.exp * 1000 - Date.now();
	return remaining > 0 && remaining < JWT_REFRESH_THRESHOLD_MS;
};

let sessionRefreshInFlight: Promise<void> | null = null;
let stopSessionRefresh: (() => void) | null = null;

const isAdminRole = (role: string | undefined | null): boolean => role === "admin";

/** 安裝腳本建立之平台超級管理員（bootstrap）；對齊 createAdmin.js */
export const PLATFORM_ADMIN_USERNAME = "admin" as const;

export const isPlatformAdmin = (
	user: Pick<User, "username"> | null | undefined
): boolean => user?.username === PLATFORM_ADMIN_USERNAME;

export const usePlatformAdmin = () => {
	const { user } = useAuth();
	return computed(() => isPlatformAdmin(user.value));
};

/** 設備型號管理可見性：平台管理員且未被產品環境（YSOP/YSOS）以 deviceModelsLocked 鎖定 */
export const useCanManageDeviceModels = () => {
	const platformAdmin = usePlatformAdmin();
	const config = useRuntimeConfig();
	const locked =
		String((config.public as { deviceModelsLocked?: string }).deviceModelsLocked ?? "") === "1";
	return computed(() => platformAdmin.value && !locked);
};

type UserCookiePayload = Pick<User, "id" | "username" | "role" | "status">;

const toCookieUser = (nextUser: User | null): UserCookiePayload | null => {
	if (!nextUser) return null;
	const { id, username, role, status } = nextUser;
	return { id, username, role, status };
};

const userFromCookie = (cookie: UserCookiePayload | null): User | null =>
	cookie ? { ...cookie, permissions: [] } : null;

export const useAuth = () => {
	const userApi = useUserApi();
	const config = useRuntimeConfig();

	const apiBase = config.public.apiBase || "/api";
	const secureOverride = (config.public as { secureCookie?: string }).secureCookie;
	const isSecure =
		secureOverride !== undefined && secureOverride !== ""
			? secureOverride === "true"
			: apiBase.startsWith("https://");

	const tokenCookie = useCookie<string | null>("auth_token", {
		default: () => null,
		secure: isSecure,
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 7,
		httpOnly: false
	});

	const userCookie = useCookie<UserCookiePayload | null>("auth_user", {
		default: () => null,
		secure: isSecure,
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 7,
		httpOnly: false
	});

	const user = useState<User | null>("auth_user", () => userFromCookie(userCookie.value));
	const token = useState<string | null>("auth_token", () => tokenCookie.value);

	const isAuthenticated = computed(() => !!token.value && !!user.value);

	const persistSession = (nextUser: User | null, nextToken: string | null) => {
		tokenCookie.value = nextToken;
		userCookie.value = toCookieUser(nextUser);
		token.value = nextToken;
		user.value = nextUser;
	};

	const clearSession = () => {
		try {
			disconnectGlobalWebSocket();
		} catch {
			// ignore
		}
		persistSession(null, null);
	};

	const redirectToLogin = (redirectPath?: string) => {
		const redirect = redirectPath ?? useRoute().fullPath;
		if (redirect === "/login" || redirect.startsWith("/login?")) return;
		return navigateTo({ path: "/login", query: { redirect } });
	};

	/** API 401（非登入請求）：清除 session；客戶端導向登入頁 */
	const handleUnauthorized = async (redirectPath?: string) => {
		clearSession();
		if (process.client) {
			await redirectToLogin(redirectPath);
		}
	};

	const logout = async () => {
		try {
			if (token.value) {
				await userApi.logout();
			}
		} catch {
			// 登出 API 失敗仍清除本地 session
		}
		clearSession();
	};

	const hasPermission = (code: string): boolean => {
		const u = user.value;
		if (!u) return false;
		if (isAdminRole(u.role)) return true;
		return Array.isArray(u.permissions) && u.permissions.includes(code);
	};

	const hasAnyPermission = (...codes: string[]): boolean => codes.some(code => hasPermission(code));

	const useHasPermission = (code: string) => computed(() => hasPermission(code));

	const useHasAnyPermission = (...codes: string[]) => computed(() => hasAnyPermission(...codes));

	const login = async (credentials: LoginCredentials) => {
		try {
			const response = await userApi.login(credentials);
			if (!response?.token || !response?.user) {
				throw new Error("登入回應異常，請稍後再試");
			}
			persistSession(response.user, response.token);
			return response;
		} catch (error) {
			if (token.value) {
				logout();
			} else {
				persistSession(null, null);
			}
			throw error;
		}
	};

	const fetchUser = async () => {
		const tokenAtStart = token.value;
		if (!tokenAtStart) return;

		const currentUser = await userApi.getMe();
		if (token.value !== tokenAtStart) return currentUser;
		persistSession(currentUser, tokenAtStart);
		return currentUser;
	};

	/** 中控室 7×24：剩餘壽命低於閾值時向後端換發新 JWT */
	const refreshSessionIfNeeded = async () => {
		if (!token.value || isLocalTokenStale(token.value) || !isJwtDueForRefresh(token.value)) {
			return;
		}
		if (sessionRefreshInFlight) return sessionRefreshInFlight;

		sessionRefreshInFlight = (async () => {
			try {
				const res = await userApi.refreshSession();
				if (res.refreshed && res.token) {
					persistSession(res.user, res.token);
				}
			} catch (error) {
				if (isApiUnauthorizedError(error)) {
					await handleUnauthorized();
				}
			} finally {
				sessionRefreshInFlight = null;
			}
		})();

		return sessionRefreshInFlight;
	};

	/** 啟動定期續期檢查（auth.client 呼叫一次） */
	const bootstrapSessionRefresh = () => {
		stopSessionRefresh?.();
		stopSessionRefresh = null;
		if (!import.meta.client) return;

		const tick = () => void refreshSessionIfNeeded();
		tick();
		const timer = setInterval(tick, SESSION_REFRESH_INTERVAL_MS);
		const onVisible = () => {
			if (document.visibilityState === "visible") tick();
		};
		document.addEventListener("visibilitychange", onVisible);
		stopSessionRefresh = () => {
			clearInterval(timer);
			document.removeEventListener("visibilitychange", onVisible);
			stopSessionRefresh = null;
		};
	};

	const teardownSessionRefresh = () => {
		stopSessionRefresh?.();
	};

	/** 啟動時由 auth.client 呼叫：cookie → state；非登入頁才以 /users/me 驗證 token */
	const init = async () => {
		token.value = tokenCookie.value ?? token.value;

		if (!token.value) {
			if (user.value) clearSession();
			return;
		}

		if (isLocalTokenStale(token.value)) {
			clearSession();
			return;
		}

		if (useRoute().path === "/login") {
			if (!user.value) clearSession();
			return;
		}

		try {
			await fetchUser();
		} catch {
			// 401：useApiBase → handleUnauthorized 已清 session；其餘暫時性錯誤保留 cookie
		}
	};

	return {
		user: readonly(user),
		token: readonly(token),
		isAuthenticated,
		hasPermission,
		hasAnyPermission,
		useHasPermission,
		useHasAnyPermission,
		login,
		logout,
		clearSession,
		redirectToLogin,
		handleUnauthorized,
		fetchUser,
		refreshSessionIfNeeded,
		bootstrapSessionRefresh,
		teardownSessionRefresh,
		init
	};
};

/** 平台管理員角色（users / license / env 等；見 useAccessGate PLATFORM_ADMIN_ROUTES） */
export const useAdminOnly = () => {
	const { user } = useAuth();
	return computed(() => isAdminRole(user.value?.role));
};
