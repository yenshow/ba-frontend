import { useAdminOnly } from "~/composables/core/useAuth"

export default defineNuxtRouteMiddleware(() => {
	const canAdmin = useAdminOnly()
	if (!canAdmin.value) {
		return navigateTo("/")
	}
})
