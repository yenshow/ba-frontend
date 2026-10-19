/** 監看格子主鍵：一般攝影機或 NVR 虛擬通道 */

export const cameraViewKey = (deviceId: number): string => `cam:${deviceId}`

export const nvrChannelViewKey = (nvrId: number, proxyChannelId: number): string =>
	`nvr:${nvrId}:${proxyChannelId}`

export const parseSurveillanceViewKey = (
	viewKey: string
):
	| { kind: "camera"; deviceId: number }
	| { kind: "nvr"; nvrId: number; proxyChannelId: number }
	| null => {
	const raw = String(viewKey || "").trim()
	const cam = /^cam:(\d+)$/.exec(raw)
	if (cam) {
		return { kind: "camera", deviceId: Number(cam[1]) }
	}
	const nvr = /^nvr:(\d+):(\d+)$/.exec(raw)
	if (nvr) {
		return {
			kind: "nvr",
			nvrId: Number(nvr[1]),
			proxyChannelId: Number(nvr[2]),
		}
	}
	return null
}

export const isNvrViewKey = (viewKey: string): boolean =>
	parseSurveillanceViewKey(viewKey)?.kind === "nvr"
