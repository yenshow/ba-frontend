import { useAccessGate } from "~/composables/core/useAccessGate";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { isApiRateLimitError, isApiUnauthorizedError, MSG_RATE_LIMIT } from "~/utils/apiError";

export default defineNuxtRouteMiddleware(async to => {
	if (to.path === "/login") return;

	const { isAuthenticated, redirectToLogin } = useAuth();

	if (!isAuthenticated.value) {
		return redirectToLogin(to.fullPath);
	}

	const { checkRouteAccess, handleAccessDenied } = useAccessGate();

	try {
		const result = await checkRouteAccess(to.path);
		return handleAccessDenied(to.path, result);
	} catch (error) {
		if (isApiUnauthorizedError(error)) {
			return redirectToLogin(to.fullPath);
		}
		if (isApiRateLimitError(error)) {
			if (process.client) useToast().warning(MSG_RATE_LIMIT);
			return;
		}
		throw error;
	}
});
