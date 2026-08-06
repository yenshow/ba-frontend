import type { User, LoginCredentials } from "~/types/user";
import { useAuthSession } from "~/composables/core/useAuthSession";
import { useUserApi } from "~/composables/systems/users/useUserApi";
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
let permissionsHydrateInFlight: Promise<void> | null = null;
let stopSessionRefresh: (() => void) | null = null;

const isAdminRole = (role: string | undefined | null): boolean => role === "admin";

/** 安裝腳本建立之平台超級管理員（bootstrap）；對齊 createAdmin.js */
export const PLATFORM_ADMIN_USERNAME = "admin" as const;

export const isPlatformAdmin = (user: Pick<User, "username"> | null | undefined): boolean =>
	user?.username === PLATFORM_ADMIN_USERNAME;

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

export const useAuth = () => {
	const userApi = useUserApi();
	const {
		user,
		token,
		isAuthenticated,
		persistSession,
		clearSession,
		syncTokenFromCookie,
		redirectToLogin,
		handleUnauthorized
	} = useAuthSession();
	const isPermissionsHydrated = computed(() => Array.isArray(user.value?.permissions));

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

	/** Cookie 僅還原 role／id；permissions 須經 /users/me 載入後才可判斷模組鎖定 */
	const ensurePermissionsHydrated = async () => {
		if (isPermissionsHydrated.value) return;
		if (!token.value) return;
		if (permissionsHydrateInFlight) return permissionsHydrateInFlight;

		permissionsHydrateInFlight = (async () => {
			try {
				await fetchUser();
			} catch {
				// 401 已由 useApiBase 清 session；其餘暫時性錯誤保留未 hydrated
			} finally {
				permissionsHydrateInFlight = null;
			}
		})();

		return permissionsHydrateInFlight;
	};

	/** 中控室 7×24：剩餘壽命低於閾值時向後端換發新 JWT */
	const refreshSessionIfNeeded = async () => {
		if (!token.value) return;
		if (isLocalTokenStale(token.value)) {
			await handleUnauthorized();
			return;
		}
		if (!isJwtDueForRefresh(token.value)) {
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

	/** 啟動時由 auth.client 呼叫：同步 cookie token、驗證本地過期 */
	const init = async () => {
		syncTokenFromCookie();

		if (!token.value) {
			if (user.value) clearSession();
			return;
		}

		if (isLocalTokenStale(token.value)) {
			clearSession();
			return;
		}

		if (useRoute().path === "/login" && !user.value) {
			clearSession();
		}
	};

	return {
		user: readonly(user),
		token: readonly(token),
		isAuthenticated,
		isPermissionsHydrated,
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
		ensurePermissionsHydrated,
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
