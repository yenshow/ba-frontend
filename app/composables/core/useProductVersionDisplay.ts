const DEFAULT_PRODUCT_CODE = "YSOP"
const DEFAULT_APP_VERSION = "1.0.0"

const formatProductVersion = (productCode: string, appVersion: string) =>
	`${productCode} v${appVersion}`

/** 登入頁產品版本；打包後由 /ba-version.json 覆蓋（與 repo VERSION 同步） */
export const useProductVersionDisplay = () => {
	const config = useRuntimeConfig().public
	const productCode = String(config.productCode || DEFAULT_PRODUCT_CODE)
	const appVersion = String(config.appVersion || DEFAULT_APP_VERSION)
	const display = ref(formatProductVersion(productCode, appVersion))

	onMounted(async () => {
		try {
			const payload = await $fetch<{ productCode?: string; version?: string }>("/ba-version.json", {
				cache: "no-cache",
			})
			if (!payload?.productCode || !payload?.version) {
				return
			}

			display.value = formatProductVersion(payload.productCode, payload.version)
		} catch {
			// 開發環境或尚未打包：沿用 nuxt.config / 預設值
		}
	})

	return display
}
