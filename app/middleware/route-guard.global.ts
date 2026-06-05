import { useAccessGate } from "~/composables/core/useAccessGate"
import { useAuth } from "~/composables/core/useAuth"

const PUBLIC_ROUTES = ["/login"] as const

export default defineNuxtRouteMiddleware(async (to) => {
	if ((PUBLIC_ROUTES as readonly string[]).includes(to.path)) return

	const { isAuthenticated } = useAuth()
	if (!isAuthenticated.value) {
		return navigateTo({
			path: "/login",
			query: { redirect: to.fullPath },
		})
	}

	const { checkRouteAccess, handleAccessDenied } = useAccessGate()
	const result = await checkRouteAccess(to.path, { mode: "middleware" })
	return handleAccessDenied(to.path, result)
})
