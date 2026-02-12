/**
 * 處理 Nuxt/Vite 動態載入模組失敗（間歇性 404）
 *
 * 情境：分頁長時間閒置後，chunk 路徑可能失效（PM2 重啟、新部署、開發伺服器重啟等），
 * 導致 "Failed to fetch dynamically imported module" 404。
 *
 * 解決：偵測到此錯誤時自動重整頁面，取得最新資產。
 */
const isChunkLoadError = (err: unknown): boolean => {
	const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : String(err);
	return (
		msg.includes("Failed to fetch dynamically imported module") ||
		msg.includes("Importing a module script failed") ||
		msg.includes("Loading chunk") ||
		msg.includes("error loading dynamically imported module")
	);
};

const handleChunkError = (source: string) => {
	console.warn(`[chunk-reload] ${source}，重整頁面取得最新資源`);
	window.location.reload();
};

export default defineNuxtPlugin((nuxtApp) => {
	if (typeof window === "undefined") return;

	// Vite 4.4+ preload 錯誤
	window.addEventListener("vite:preloadError", () => handleChunkError("Vite preload 錯誤"));

	// Vue Router：導航時載入路由元件失敗
	const router = useRouter();
	router.onError((err) => {
		if (isChunkLoadError(err)) {
			handleChunkError("路由元件載入失敗");
		} else {
			throw err;
		}
	});

	// 攔截未處理的 promise rejection（import() 失敗）
	const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
		if (isChunkLoadError(event?.reason)) {
			event.preventDefault();
			handleChunkError("動態模組載入失敗 (unhandled rejection)");
		}
	};
	window.addEventListener("unhandledrejection", handleUnhandledRejection);
});
