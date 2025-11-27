/**
 * 認證狀態初始化插件（僅客戶端）
 * 在應用啟動時自動恢復登入狀態
 */
export default defineNuxtPlugin(async () => {
	const { init } = useAuth();
	
	// 在客戶端初始化認證狀態
	// 這樣可以確保在路由中間件執行之前就恢復了認證狀態
	await init();
});

