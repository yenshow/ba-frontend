import { useAuth } from "~/composables/core/useAuth";

const PUBLIC_ROUTES = ["/login"];

export default defineNuxtRouteMiddleware(to => {
	if (PUBLIC_ROUTES.includes(to.path)) return;

	const { isAuthenticated } = useAuth();
	if (!isAuthenticated.value) {
		return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
	}
});
