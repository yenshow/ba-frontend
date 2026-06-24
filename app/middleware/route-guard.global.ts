import { useAccessGate } from "~/composables/core/useAccessGate";
import { useAuth } from "~/composables/core/useAuth";

const PUBLIC_ROUTES = ["/login"] as const;

export default defineNuxtRouteMiddleware(async to => {
	if ((PUBLIC_ROUTES as readonly string[]).includes(to.path)) return;

	const { isAuthenticated } = useAuth();
	const redirectToLogin = () =>
		navigateTo({ path: "/login", query: { redirect: to.fullPath } });

	if (!isAuthenticated.value) {
		return redirectToLogin();
	}

	const { checkRouteAccess, handleAccessDenied } = useAccessGate();
	const result = await checkRouteAccess(to.path);
	return handleAccessDenied(to.path, result);
});
