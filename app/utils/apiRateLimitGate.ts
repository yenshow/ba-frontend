/**
 * 全站 API 429 暫停閘門（模組級；供 useApiBase／後備輪詢共用）
 */

const DEFAULT_BACKOFF_MS = 45_000
const MIN_BACKOFF_MS = 5_000

let rateLimitedUntilMs = 0

const parseRetryAfterMs = (raw: unknown): number | null => {
	if (raw == null) return null
	const sec = Number.parseInt(String(raw).trim(), 10)
	if (!Number.isFinite(sec) || sec <= 0) return null
	return Math.max(MIN_BACKOFF_MS, sec * 1000)
}

const readRetryAfterHeader = (error: unknown): unknown => {
	const headers = (error as { response?: { headers?: Headers | Record<string, string> } })
		?.response?.headers
	if (!headers) return undefined
	if (typeof (headers as Headers).get === "function") {
		return (headers as Headers).get("retry-after")
	}
	const map = headers as Record<string, string>
	return map["retry-after"] ?? map["Retry-After"]
}

export const isApiRateLimitedNow = (): boolean => Date.now() < rateLimitedUntilMs

export const markApiRateLimited = (retryAfterHeader?: unknown): void => {
	const waitMs = parseRetryAfterMs(retryAfterHeader) ?? DEFAULT_BACKOFF_MS
	rateLimitedUntilMs = Math.max(rateLimitedUntilMs, Date.now() + waitMs)
}

/** 自 ofetch／fetch 錯誤標記 429 退避 */
export const markApiRateLimitedFromError = (error: unknown): void => {
	markApiRateLimited(readRetryAfterHeader(error))
}
