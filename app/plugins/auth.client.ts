/**
 * 認證狀態初始化（僅客戶端）
 * - init：cookie → state；登入頁不打 /users/me，其餘路由以 /users/me 驗證 token
 * - 已登入：預載 registry + license（首頁與導航模組判斷需要）
 * - 已登入卻在 /login：導向 redirect 或首頁
 * 路由權限由 route-guard.global middleware 統一處理
 */
import { useAccessGate } from "~/composables/core/useAccessGate"
import { useAuth } from "~/composables/core/useAuth"
import { sanitizeAuthRedirectPath } from "~/utils/authSession"

export default defineNuxtPlugin(async () => {
	const { init, isAuthenticated } = useAuth()
	const { ensureAccessReady } = useAccessGate()
	const route = useRoute()
	const appBootstrapReady = useState<boolean>("app_bootstrap_ready", () => false)
	const appBootstrapError = useState<string | null>("app_bootstrap_error", () => null)

	try {
		await init()

		if (isAuthenticated.value) {
			await ensureAccessReady()

			if (route.path === "/login") {
				const redirect = sanitizeAuthRedirectPath(route.query.redirect)
				await navigateTo(redirect, { replace: true })
			}
		}
	} catch (error) {
		appBootstrapError.value = error instanceof Error ? error.message : "初始化失敗"
	} finally {
		appBootstrapReady.value = true
	}
})
