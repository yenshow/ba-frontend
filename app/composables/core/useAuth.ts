import type { User, LoginCredentials } from "~/types/user"
import { useUserApi } from "~/composables/systems/users/useUserApi"

const isAdminRole = (role: string | undefined | null): boolean => role === "admin"

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
		sameSite: "strict",
		maxAge: 60 * 60 * 24 * 7,
		httpOnly: false,
	})

	const userCookie = useCookie<User | null>("auth_user", {
		default: () => null,
		secure: isSecure,
		sameSite: "strict",
		maxAge: 60 * 60 * 24 * 7,
		httpOnly: false,
	})

	const user = useState<User | null>("auth_user", () => userCookie.value)
	const token = useState<string | null>("auth_token", () => tokenCookie.value)

	const isAuthenticated = computed(() => !!token.value && !!user.value)

	const hasPermission = (code: string): boolean => {
		const u = user.value
		if (!u) return false
		if (isAdminRole(u.role)) return true
		return Array.isArray(u.permissions) && u.permissions.includes(code)
	}

	const hasAnyPermission = (...codes: string[]): boolean =>
		codes.some((code) => hasPermission(code))

	const useHasPermission = (code: string) => computed(() => hasPermission(code))

	const useHasAnyPermission = (...codes: string[]) =>
		computed(() => hasAnyPermission(...codes))

	/** 模組父層權限（PERM.xxx.module） */
	const useCanWriteModule = (moduleCode: string) => useHasPermission(moduleCode)

	const login = async (credentials: LoginCredentials) => {
		try {
			const response = await userApi.login(credentials)
			tokenCookie.value = response.token
			userCookie.value = response.user
			token.value = response.token
			user.value = response.user
			return response
		} catch (error) {
			logout()
			throw error
		}
	}

	const logout = () => {
		tokenCookie.value = null
		userCookie.value = null
		token.value = null
		user.value = null
	}

	const fetchUser = async () => {
		try {
			const currentUser = await userApi.getMe()
			userCookie.value = currentUser
			user.value = currentUser
			return currentUser
		} catch (error) {
			logout()
			throw error
		}
	}

	const init = async () => {
		if (tokenCookie.value) {
			token.value = tokenCookie.value
		}
		if (userCookie.value && !user.value) {
			user.value = userCookie.value
		}
		if (!token.value) return
		try {
			await fetchUser()
		} catch {
			// fetchUser 失敗時已 logout
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
		useCanWriteModule,
		login,
		logout,
		fetchUser,
		init,
	}
}

/** 平台管理員角色（users / license / env 等；見 config/platformAdminRoutes.ts） */
export const useAdminOnly = () => {
	const { user } = useAuth()
	return computed(() => isAdminRole(user.value?.role))
}
