/**
 * 認證狀態初始化插件（僅客戶端）
 */
import { useAccessGate } from "~/composables/core/useAccessGate"
import { useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"

export default defineNuxtPlugin(async () => {
	const { init, isAuthenticated } = useAuth()
	const { fetchLicense } = useLicense()
	const moduleRegistry = useModuleRegistry()
	const { checkRouteAccess, handleAccessDenied } = useAccessGate()
	const route = useRoute()

	const appBootstrapReady = useState<boolean>("app_bootstrap_ready", () => false)
	const appBootstrapError = useState<string | null>("app_bootstrap_error", () => null)

	try {
		await Promise.all([
			init(),
			moduleRegistry.ensureLoaded({ force: true }),
			isAuthenticated.value ? fetchLicense({ force: true }) : Promise.resolve(),
		])

		if (isAuthenticated.value && route.path !== "/login") {
			const result = await checkRouteAccess(route.path, { mode: "interactive" })
			await handleAccessDenied(route.path, result)
		}
	} catch (error) {
		appBootstrapError.value = error instanceof Error ? error.message : "初始化失敗"
	} finally {
		appBootstrapReady.value = true
	}
})
