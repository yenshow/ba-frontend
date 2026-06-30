// https://nuxt.com/docs/api/configuration/nuxt-config
import { toLegacyRouteRedirectRules } from "./app/config/legacyRouteRedirects"

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },

	modules: ["@nuxt/image", "@nuxt/scripts", "@nuxt/test-utils", "@nuxtjs/tailwindcss"],

	// 應用程式設定
	app: {
		head: {
			title: "YSOP 中央管理平台",
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
			// 同機部署：同源 /api，由 Nitro routeRules 代理至後端
			apiBase: "/api",
			// 相對 apiBase 時 Socket.IO 直連後端（hostname + backendHttpPort）
			websocketUrl: "",
			backendHttpPort: 4000,
			secureCookie: undefined,
			productCode: "YS One Platform",
			appVersion: "1.0.0",
			deviceModelsLocked: process.env.NODE_ENV === "production" ? "1" : "0",
		},
	},

	nitro: {
		routeRules: {
			"/api/**": {
				proxy: "http://127.0.0.1:4000/api/**",
			},
			...toLegacyRouteRedirectRules(),
		},
	},
})
