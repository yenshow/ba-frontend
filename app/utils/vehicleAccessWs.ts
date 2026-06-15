import type { VehicleAccessWsEventPayload } from "~/types/websocket"

/** 自 WS payload 解析受影響的地點 ID；YSCP 廣播事件回傳 null（表示全站） */
export const parseVehicleAccessEventLocationIds = (payload?: unknown): number[] | null => {
	if (!payload || typeof payload !== "object") return null
	const p = payload as VehicleAccessWsEventPayload
	if (Array.isArray(p.locationIds) && p.locationIds.length > 0) {
		return [
			...new Set(
				p.locationIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
			),
		]
	}
	const single = Number(p.locationId)
	if (Number.isFinite(single) && single > 0) return [single]
	return null
}
