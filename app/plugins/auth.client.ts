/**
 * 認證狀態初始化插件（僅客戶端）
 * 在應用啟動時自動恢復登入狀態
 */
import { useAuth } from "~/composables/core/useAuth";
import { useLicense } from "~/composables/core/useLicense";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";

export default defineNuxtPlugin(async () => {
	const { init } = useAuth();
	const { fetchLicense } = useLicense();
	const moduleRegistry = useModuleRegistry();

	const appBootstrapReady = useState<boolean>("app_bootstrap_ready", () => false);
	const appBootstrapError = useState<string | null>("app_bootstrap_error", () => null);

	// 在客戶端初始化認證狀態
	// 這樣可以確保在路由中間件執行之前就恢復了認證狀態
	try {
		await init();
		// module registry：路由守衛會使用（permissionCode / featureKey）
		await moduleRegistry.ensureLoaded({ force: true });
		// 有登入狀態時預先載入授權（用於導航鎖頭顯示與路由守衛）
		await fetchLicense({ force: true });
	} catch (error) {
		appBootstrapError.value = error instanceof Error ? error.message : "初始化失敗";
	} finally {
		// 不論成功與否都放行，避免卡死；守衛/頁面再各自處理錯誤提示
		appBootstrapReady.value = true;
	}
});
