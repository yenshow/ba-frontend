/** 相對 path → 同源 `/mediamtx` WHEP；完整 URL 原樣使用 */
export const resolveWebrtcWhepUrl = (webrtcUrl: string): string => {
	if (!webrtcUrl) return ""
	if (/^https?:\/\//i.test(webrtcUrl)) return webrtcUrl
	const path = webrtcUrl.startsWith("/") ? webrtcUrl : `/${webrtcUrl}`
	return `/mediamtx${path}`
}
