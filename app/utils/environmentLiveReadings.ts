import type { DeviceConnectivityStatus } from "~/types/device"

/** 與 environmentMonitor 寫入間隔對齊：超過此時間視為過期（非即時） */
export const ENVIRONMENT_READING_STALE_MS = 10 * 60 * 1000

export const SENSOR_DISPLAY_OFFLINE = "--"

export type DeviceConnectivityGetter = (deviceId: number) => DeviceConnectivityStatus

/** 感測數值顯示：離線或無資料時統一為 `--` */
export const formatSensorDisplayValue = (
	value: number | null | undefined,
	options?: { offline?: boolean; fractionDigits?: number }
): string => {
	if (options?.offline || value == null || Number.isNaN(value)) {
		return SENSOR_DISPLAY_OFFLINE
	}
	const digits = options?.fractionDigits ?? 0
	return Number(value.toFixed(digits)).toString()
}

/** 地點即時狀態：設備全 online 且最近一筆讀數未過期 */
export const isEnvironmentLocationLive = (params: {
	deviceIds: number[]
	readingTimestamp?: string | null
	getDeviceStatus: DeviceConnectivityGetter
	nowMs?: number
	staleMs?: number
}): boolean => {
	const { deviceIds, readingTimestamp, getDeviceStatus } = params
	const staleMs = params.staleMs ?? ENVIRONMENT_READING_STALE_MS
	const nowMs = params.nowMs ?? Date.now()

	if (deviceIds.length === 0 || !deviceIds.every((id) => getDeviceStatus(id) === "online")) {
		return false
	}
	if (!readingTimestamp) return false
	const recordedAt = Date.parse(readingTimestamp)
	if (!Number.isFinite(recordedAt)) return false
	return nowMs - recordedAt < staleMs
}
