export default defineNuxtRouteMiddleware((to, from) => {
	// 認證檢查由全局中間件處理，這裡只檢查管理員權限
	const { isAdmin } = useAuth();

	// 檢查是否為管理員
	if (!isAdmin.value) {
		// 權限不足，重定向到環境品質系統
		return navigateTo("/construction-monitoring/environment");
	}
});

