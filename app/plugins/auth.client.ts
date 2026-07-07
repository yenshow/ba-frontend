/**
 * 認證狀態初始化（僅客戶端）
 * 路由權限由 route-guard.global middleware 統一處理
 */
import { onUnmounted } from "vue";
import { useAccessGate } from "~/composables/core/useAccessGate";
import { sanitizeAuthRedirectPath, useAuth } from "~/composables/core/useAuth";
import { isApiUnauthorizedError } from "~/utils/apiError";

export default defineNuxtPlugin(() => {
	const auth = useAuth();
	const { ensureAccessReady } = useAccessGate();
	const route = useRoute();
	const appBootstrapReady = useState<boolean>("app_bootstrap_ready", () => false);
	const appBootstrapError = useState<string | null>("app_bootstrap_error", () => null);

	void (async () => {
		try {
			await auth.init();

			if (auth.isAuthenticated.value) {
				await ensureAccessReady();

				if (route.path === "/login") {
					const redirect = sanitizeAuthRedirectPath(route.query.redirect);
					await navigateTo(redirect, { replace: true });
				}
			}
		} catch (error) {
			if (!isApiUnauthorizedError(error)) {
				appBootstrapError.value = error instanceof Error ? error.message : "初始化失敗";
			}
		} finally {
			appBootstrapReady.value = true;
			auth.bootstrapSessionRefresh();
		}
	})();

	onUnmounted(() => auth.teardownSessionRefresh());
});
