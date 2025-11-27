// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },

	modules: ["@nuxt/image", "@nuxt/scripts", "@nuxt/test-utils", "@nuxtjs/tailwindcss"],

	// 應用程式設定
	app: {
		head: {
			title: "BA 系統 - 樓宇自動化管理平台",
			meta: [
				{ charset: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ name: "description", content: "樓宇自動化監控與管理系統" }
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
		port: 3000 // 預設端口，可根據需要修改
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
			apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:4000/api",
			modbusRequestTimeout: Number(process.env.NUXT_PUBLIC_MODBUS_TIMEOUT ?? 5000)
		}
	}
});
