/** 同源 WHEP → MediaMTX（HTTPS 頁避免 mixed content；ICE 仍走 :8889） */
export default defineEventHandler(async (event) => {
	const parsed = Number.parseInt(String(process.env.MEDIAMTX_WEBRTC_PORT || "8889"), 10);
	const webrtcPort =
		Number.isFinite(parsed) && parsed > 0 && parsed <= 65535 ? parsed : 8889;
	const suffix = event.path.replace(/^\/mediamtx/, "") || "/";
	return proxyRequest(event, `http://127.0.0.1:${webrtcPort}${suffix}`);
});
