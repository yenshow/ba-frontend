import { logger } from "~/utils/logger"

const RELOAD_GUARD_KEY = "chunk-reload:last-reload-at"
const RELOAD_COOLDOWN_MS = 10_000

/**
 * 處理 Nuxt/Vite 動態載入模組失敗（間歇性 404）
 *
 * 情境：分頁長時間閒置後，chunk 路徑可能失效（服務重啟、新部署、開發伺服器重啟等），
 * 導致 "Failed to fetch dynamically imported module" 404。
 *
 * 解決：偵測到此錯誤時自動重整頁面，取得最新資源。
 * 以 sessionStorage 節流，避免連續失敗時無限重整。
 */
const isChunkLoadError = (err: unknown): boolean => {
	const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : String(err)
	return (
		msg.includes("Failed to fetch dynamically imported module") ||
		msg.includes("Importing a module script failed") ||
		msg.includes("Loading chunk") ||
		msg.includes("error loading dynamically imported module")
	)
}

let reloadScheduled = false

const canAutoReload = (): boolean => {
	try {
		const lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0)
		return Date.now() - lastReloadAt > RELOAD_COOLDOWN_MS
	} catch {
		return true
	}
}

const markReloadAttempt = () => {
	try {
		sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
	} catch {
		// sessionStorage 不可用時仍嘗試重整
	}
}

const handleChunkError = (source: string, err?: unknown) => {
	if (reloadScheduled) return

	if (!canAutoReload()) {
		logger.error(
			`[chunk-reload] ${source}，已於 ${RELOAD_COOLDOWN_MS / 1000}s 內自動重整過，請手動重新整理`,
			err
		)
		return
	}

	reloadScheduled = true
	markReloadAttempt()
	logger.warn(`[chunk-reload] ${source}，重整頁面取得最新資源`)
	window.location.reload()
}

export default defineNuxtPlugin(() => {
	if (typeof window === "undefined") return

	window.addEventListener("vite:preloadError", (event: Event) => {
		event.preventDefault()
		handleChunkError("Vite preload 錯誤")
	})

	const router = useRouter()
	router.onError((err) => {
		if (isChunkLoadError(err)) {
			handleChunkError("路由元件載入失敗", err)
		} else {
			throw err
		}
	})

	const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
		if (isChunkLoadError(event?.reason)) {
			event.preventDefault()
			handleChunkError("動態模組載入失敗 (unhandled rejection)", event.reason)
		}
	}
	window.addEventListener("unhandledrejection", handleUnhandledRejection)
})
