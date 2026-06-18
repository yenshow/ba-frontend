/** 登入成功或已登入時的安全站內導向路徑（防 open redirect） */
export const sanitizeAuthRedirectPath = (raw: unknown): string => {
	if (typeof raw !== "string") return "/"
	const trimmed = raw.trim()
	if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/"
	return trimmed
}
