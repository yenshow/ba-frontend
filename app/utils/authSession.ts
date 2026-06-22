/** 登入成功或已登入時的安全站內導向路徑（防 open redirect） */
export const sanitizeAuthRedirectPath = (raw: unknown): string => {
	if (typeof raw !== "string") return "/"
	const trimmed = raw.trim()
	if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/"
	return trimmed
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
	try {
		const parts = token.split(".")
		if (parts.length !== 3) return null
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
		const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
		return JSON.parse(atob(padded)) as Record<string, unknown>
	} catch {
		return null
	}
}

/** 客戶端可判斷的 token 失效（格式錯誤或 exp 已過）；其餘仍須後端驗證 */
export const isLocalTokenStale = (token: string): boolean => {
	const payload = decodeJwtPayload(token)
	if (!payload) return true
	if (typeof payload.exp === "number") return payload.exp * 1000 <= Date.now()
	return false
}
