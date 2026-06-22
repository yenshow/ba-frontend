import { useAccessGate } from "~/composables/core/useAccessGate"
import { useAuth } from "~/composables/core/useAuth"
import { ApiRequestError } from "~/utils/errorUtils"

const PUBLIC_ROUTES = ["/login"] as const

export default defineNuxtRouteMiddleware(async (to) => {
	if ((PUBLIC_ROUTES as readonly string[]).includes(to.path)) return

	const { isAuthenticated, clearSession } = useAuth()
	const redirectToLogin = () =>
		navigateTo({ path: "/login", query: { redirect: to.fullPath } })

	if (!isAuthenticated.value) {
		return redirectToLogin()
	}

	const { checkRouteAccess, handleAccessDenied } = useAccessGate()
	try {
		const result = await checkRouteAccess(to.path)
		return handleAccessDenied(to.path, result)
	} catch (error) {
		// token 失效（401）：清 session 並導回登入。
		// SSR（重新整理）時 throwApiRequestError 不會自行導向，僅拋錯；
		// 若不在此攔截會直接渲染伺服器錯誤頁，故統一在守衛層處理。
		if (error instanceof ApiRequestError && error.statusCode === 401) {
			clearSession()
			return redirectToLogin()
		}
		throw error
	}
})
