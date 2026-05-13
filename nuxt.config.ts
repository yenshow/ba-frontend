// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },

	modules: ["@nuxt/image", "@nuxt/scripts", "@nuxt/test-utils", "@nuxtjs/tailwindcss"],

	// 應用程式設定
	app: {
		head: {
			title: "Yenshow 智慧管理平台",
			meta: [
				{ charset: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ name: "description", content: "樓宇自動化監控與管理系統" },
			],
			link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
		},
	},

	// CSS 全域樣式
	css: ["~/assets/css/tailwind.css"],

	// TypeScript 配置
	typescript: {
		strict: false,
		typeCheck: false,
	},

	// 開發伺服器配置 - 開放區域網路存取
	devServer: {
		host: "0.0.0.0", // 監聽所有網路介面，允許區域網路存取
		port: 3000, // 預設端口，可根據需要修改
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
			xxl: 1536,
		},
		// 預設提供者設定
		providers: {
			// 使用內建提供者處理本地圖片
			ipx: {},
		},
		// 預設圖片設定
		defaults: {
			loading: "lazy",
			format: "webp",
		},
	},

	runtimeConfig: {
		public: {
			// 同機部署：前端一律打同源 /api，由 Nitro 反向代理到後端
			apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
			// 相對 apiBase 時 Socket.IO 直連後端（未設則用「頁面 hostname + 下列 port」）
			websocketUrl: process.env.NUXT_PUBLIC_WEBSOCKET_URL || "",
			backendHttpPort: Number(process.env.NUXT_PUBLIC_BACKEND_HTTP_PORT || 4000) || 4000,
			secureCookie: undefined,
			licenseOpenAllFeatures: process.env.NUXT_PUBLIC_LICENSE_OPEN_ALL_FEATURES === "true",
		},
	},

	nitro: {
		routeRules: {
			"/api/**": {
				proxy: process.env.NUXT_API_PROXY_TARGET || "http://127.0.0.1:4000/api/**",
			},
		},
	},
})
