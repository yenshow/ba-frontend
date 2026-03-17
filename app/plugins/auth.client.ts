/**
 * 認證狀態初始化插件（僅客戶端）
 * 在應用啟動時自動恢復登入狀態
 */
import { useAuth } from "~/composables/core/useAuth";
import { useLicense } from "~/composables/core/useLicense";

export default defineNuxtPlugin(async () => {
	const { init } = useAuth();
	const { fetchLicense } = useLicense();

	// 在客戶端初始化認證狀態
	// 這樣可以確保在路由中間件執行之前就恢復了認證狀態
	await init();

	// 有登入狀態時預先載入授權（用於導航鎖頭顯示與路由守衛）
	await fetchLicense({ force: true });
});
