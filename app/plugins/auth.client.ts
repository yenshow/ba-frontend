/**
 * 認證狀態初始化插件（僅客戶端）
 */
import { useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"

export default defineNuxtPlugin(async () => {
	const { init, isAuthenticated } = useAuth()
	const { fetchLicense } = useLicense()
	const moduleRegistry = useModuleRegistry()

	const appBootstrapReady = useState<boolean>("app_bootstrap_ready", () => false)
	const appBootstrapError = useState<string | null>("app_bootstrap_error", () => null)

	try {
		await Promise.all([
			init(),
			moduleRegistry.ensureLoaded({ force: true }),
			isAuthenticated.value ? fetchLicense({ force: true }) : Promise.resolve(),
		])
	} catch (error) {
		appBootstrapError.value = error instanceof Error ? error.message : "初始化失敗"
	} finally {
		appBootstrapReady.value = true
	}
})
