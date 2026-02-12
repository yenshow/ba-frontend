// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },

	modules: ["@nuxt/image", "@nuxt/scripts", "@nuxt/test-utils", "@nuxtjs/tailwindcss"],

	// 應用程式設定
	app: {
		head: {
			title: "Yenshow 工地管理平台",
			meta: [
				{ charset: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ name: "description", content: "智慧工地管理與監控平台" }
			],
			link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }]
		}
	},

	// CSS 全域樣式
	css: ["~/assets/css/tailwind.css"],

	// TypeScript 配置
	typescript: {
		strict: false,
		typeCheck: false
	},

	// 開發伺服器配置 - 開放區域網路存取
	devServer: {
		host: "0.0.0.0", // 監聽所有網路介面，允許區域網路存取
		port: 3001 // B 版本端口，避免與 A 版本衝突
	},

	// Nuxt Image 配置
	image: {
		// 啟用現代圖片格式（WebP、AVIF）
		format: ["webp", "avif", "jpg", "png"],
		// 圖片品質設定
		quality: 80,
		// 響應式圖片尺寸
		screens: {
			xs: 320,
			sm: 640,
			md: 768,
			lg: 1024,
			xl: 1280,
			xxl: 1536
		},
		// 預設提供者設定
		providers: {
			// 使用內建提供者處理本地圖片
			ipx: {}
		},
		// 預設圖片設定
		defaults: {
			loading: "lazy",
			format: "webp"
		}
	},

	runtimeConfig: {
		public: {
			apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://192.168.2.8:4000/api",
			// 強制覆寫 cookie secure：未設定時依 apiBase 協定自動判斷（https→true, http→false）
			secureCookie: process.env.NUXT_PUBLIC_SECURE_COOKIE || undefined,
			// MediaMTX 服務 URL（HLS 和 WebRTC）
			mediamtxHlsUrl: process.env.NUXT_PUBLIC_MEDIAMTX_HLS_URL || "http://localhost:8888",
			mediamtxWebrtcUrl: process.env.NUXT_PUBLIC_MEDIAMTX_WEBRTC_URL || "http://localhost:8889",
			// WebSocket 配置（可選，預設從 apiBase 推導）
			websocketUrl: process.env.NUXT_PUBLIC_WEBSOCKET_URL || undefined,
			websocketEnabled: process.env.NUXT_PUBLIC_WEBSOCKET_ENABLED !== "false"
		}
	}
});
