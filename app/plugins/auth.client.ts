/**
 * 認證狀態初始化插件（僅客戶端）
 * registry / license 由 module-registry plugin 預載；此處僅刷新使用者與首屏路由守衛
 */
import { useAccessGate } from "~/composables/core/useAccessGate"
import { useAuth } from "~/composables/core/useAuth"

export default defineNuxtPlugin(async () => {
	const { init, isAuthenticated } = useAuth()
	const { checkRouteAccess, handleAccessDenied } = useAccessGate()
	const route = useRoute()

	const appBootstrapReady = useState<boolean>("app_bootstrap_ready", () => false)
	const appBootstrapError = useState<string | null>("app_bootstrap_error", () => null)

	try {
		await init()

		if (isAuthenticated.value && route.path !== "/login") {
			const result = await checkRouteAccess(route.path)
			await handleAccessDenied(route.path, result)
		}
	} catch (error) {
		appBootstrapError.value = error instanceof Error ? error.message : "初始化失敗"
	} finally {
		appBootstrapReady.value = true
	}
})
