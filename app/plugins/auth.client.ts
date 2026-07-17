/**
 * 認證狀態初始化（僅客戶端）
 * 路由權限由 route-guard.global middleware 統一處理
 */
import { getCurrentScope, onScopeDispose } from "vue"
import { useAccessGate } from "~/composables/core/useAccessGate"
import { sanitizeAuthRedirectPath, useAuth } from "~/composables/core/useAuth"
import { useEnvironmentParameterCatalog } from "~/composables/systems/environment/useEnvironmentParameterCatalog"
import { isApiRateLimitError, isApiUnauthorizedError } from "~/utils/apiError"

export default defineNuxtPlugin(() => {
	const auth = useAuth()
	const { ensureAccessReady } = useAccessGate()
	const route = useRoute()
	const appBootstrapReady = useState<boolean>("app_bootstrap_ready", () => false)
	const appBootstrapError = useState<string | null>("app_bootstrap_error", () => null)

	void (async () => {
		try {
			await auth.init()

			if (auth.isAuthenticated.value) {
				await ensureAccessReady()
				void useEnvironmentParameterCatalog()
					.load()
					.catch(() => undefined)

				if (route.path === "/login") {
					const redirect = sanitizeAuthRedirectPath(route.query.redirect)
					await navigateTo(redirect, { replace: true })
				}
			}
		} catch (error) {
			if (!isApiUnauthorizedError(error) && !isApiRateLimitError(error)) {
				appBootstrapError.value = error instanceof Error ? error.message : "初始化失敗"
			}
		} finally {
			appBootstrapReady.value = true
			auth.bootstrapSessionRefresh()
		}
	})()

	if (import.meta.client && getCurrentScope()) {
		onScopeDispose(() => auth.teardownSessionRefresh())
	}
})
