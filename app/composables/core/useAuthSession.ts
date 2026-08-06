import type { User } from "~/types/user";

type UserCookiePayload = Pick<User, "id" | "username" | "role" | "status">;

const toCookieUser = (nextUser: User | null): UserCookiePayload | null => {
	if (!nextUser) return null;
	const { id, username, role, status } = nextUser;
	return { id, username, role, status };
};

const userFromCookie = (cookie: UserCookiePayload | null): User | null =>
	cookie ? { ...cookie } : null;

/**
 * Session 狀態 SSOT（Cookie + useState）。
 * 獨立於 useAuth / useUserApi，供 useApiBase 401 處理使用，避免循環依賴。
 */
export const useAuthSession = () => {
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
		persistSession(null, null);
		if (import.meta.client) {
			void import("~/composables/websocket/useWebSocket").then(({ disconnectGlobalWebSocket }) => {
				try {
					disconnectGlobalWebSocket();
				} catch {
					// ignore
				}
			});
		}
	};

	const syncTokenFromCookie = () => {
		token.value = tokenCookie.value ?? token.value;
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

	return {
		user,
		token,
		isAuthenticated,
		persistSession,
		clearSession,
		syncTokenFromCookie,
		redirectToLogin,
		handleUnauthorized
	};
};
