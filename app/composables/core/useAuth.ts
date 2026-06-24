import type { User, LoginCredentials } from "~/types/user"
import { useUserApi } from "~/composables/systems/users/useUserApi"
import { disconnectGlobalWebSocket } from "~/composables/websocket/useWebSocket"
import { isLocalTokenStale } from "~/utils/authSession"

const isAdminRole = (role: string | undefined | null): boolean => role === "admin"

/** 安裝腳本建立之平台超級管理員（bootstrap）；對齊 createAdmin.js */
export const PLATFORM_ADMIN_USERNAME = "admin" as const

export const isPlatformAdmin = (
	user: Pick<User, "username"> | null | undefined
): boolean => user?.username === PLATFORM_ADMIN_USERNAME

export const usePlatformAdmin = () => {
	const { user } = useAuth()
	return computed(() => isPlatformAdmin(user.value))
}

export const useAuth = () => {
	const userApi = useUserApi()
	const config = useRuntimeConfig()

	const apiBase = config.public.apiBase || "/api"
	const secureOverride = (config.public as { secureCookie?: string }).secureCookie
	const isSecure =
		secureOverride !== undefined && secureOverride !== ""
			? secureOverride === "true"
			: apiBase.startsWith("https://")

	const tokenCookie = useCookie<string | null>("auth_token", {
		default: () => null,
		secure: isSecure,
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 7,
		httpOnly: false,
	})

	const userCookie = useCookie<User | null>("auth_user", {
		default: () => null,
		secure: isSecure,
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 7,
		httpOnly: false,
	})

	const user = useState<User | null>("auth_user", () => userCookie.value)
	const token = useState<string | null>("auth_token", () => tokenCookie.value)

	const isAuthenticated = computed(() => !!token.value && !!user.value)

	const persistSession = (nextUser: User | null, nextToken: string | null) => {
		tokenCookie.value = nextToken
		userCookie.value = nextUser
		token.value = nextToken
		user.value = nextUser
	}

	const clearSession = () => {
		try {
			disconnectGlobalWebSocket()
		} catch {
			// ignore
		}
		persistSession(null, null)
	}

	const logout = async () => {
		try {
			if (token.value) {
				await userApi.logout()
			}
		} catch {
			// 登出 API 失敗仍清除本地 session
		}
		clearSession()
	}

	const hasPermission = (code: string): boolean => {
		const u = user.value
		if (!u) return false
		if (isAdminRole(u.role)) return true
		return Array.isArray(u.permissions) && u.permissions.includes(code)
	}

	const hasAnyPermission = (...codes: string[]): boolean =>
		codes.some((code) => hasPermission(code))

	const useHasPermission = (code: string) => computed(() => hasPermission(code))

	const useHasAnyPermission = (...codes: string[]) => computed(() => hasAnyPermission(...codes))

	const login = async (credentials: LoginCredentials) => {
		try {
			const response = await userApi.login(credentials)
			if (!response?.token || !response?.user) {
				throw new Error("登入回應異常，請稍後再試")
			}
			persistSession(response.user, response.token)
			return response
		} catch (error) {
			if (token.value) {
				logout()
			} else {
				persistSession(null, null)
			}
			throw error
		}
	}

	const fetchUser = async () => {
		const tokenAtStart = token.value
		if (!tokenAtStart) return

		const currentUser = await userApi.getMe()
		if (token.value !== tokenAtStart) return currentUser
		persistSession(currentUser, tokenAtStart)
		return currentUser
	}

	/** 啟動時由 auth.client 呼叫：cookie → state；非登入頁才以 /users/me 驗證 token */
	const init = async () => {
		token.value = tokenCookie.value ?? token.value
		user.value = userCookie.value ?? user.value

		if (!token.value) {
			if (user.value) clearSession()
			return
		}

		if (isLocalTokenStale(token.value)) {
			clearSession()
			return
		}

		if (useRoute().path === "/login") {
			if (!user.value) clearSession()
			return
		}

		try {
			await fetchUser()
		} catch {
			// 驗證失敗時保留 cookie 供重試；使用者可手動登出
		}
	}

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
		fetchUser,
		init,
	}
}

/** 平台管理員角色（users / license / env 等；見 useAccessGate PLATFORM_ADMIN_ROUTES） */
export const useAdminOnly = () => {
	const { user } = useAuth()
	return computed(() => isAdminRole(user.value?.role))
}
