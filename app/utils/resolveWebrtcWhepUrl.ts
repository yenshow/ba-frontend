/** 相對 path + webrtcPort → 依目前頁面 hostname 組 WHEP；完整 URL 則原樣使用 */
export const resolveWebrtcWhepUrl = (
	webrtcUrl: string,
	webrtcPort?: number
): string => {
	if (!webrtcUrl) return "";
	if (/^https?:\/\//i.test(webrtcUrl)) return webrtcUrl;

	const port = webrtcPort ?? 8889;
	if (typeof window === "undefined") return webrtcUrl;

	const protocol = window.location.protocol === "https:" ? "https:" : "http:";
	const host = window.location.hostname;
	const path = webrtcUrl.startsWith("/") ? webrtcUrl : `/${webrtcUrl}`;
	return `${protocol}//${host}:${port}${path}`;
};
