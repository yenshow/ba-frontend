export default defineNuxtRouteMiddleware((to, from) => {
	// 公開路由列表（不需要認證）
	const publicRoutes = ["/login"];

	// 如果是公開路由，直接放行
	if (publicRoutes.includes(to.path)) {
		return;
	}

	// 檢查認證狀態
	const { isAuthenticated } = useAuth();

	// 如果未認證，重定向到登入頁
	if (!isAuthenticated.value) {
		return navigateTo({
			path: "/login",
			query: {
				redirect: to.fullPath
			}
		});
	}
});
