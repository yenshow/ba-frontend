import type { EnvironmentReadingNewEvent } from "~/types/websocket"

/** 快照視為 live、以及 bootstrap 可採用 reading 的最大年齡（兩者共用，避免先 bootstrap 再被判定離線） */
export const ENVIRONMENT_READING_STALE_MS = 10 * 60 * 1000
/** WS 斷線後備：stale reconcile 輪詢間隔（連線中不啟動） */
export const ENVIRONMENT_STALE_CHECK_INTERVAL_MS = 30_000
export const SENSOR_DISPLAY_OFFLINE = "--"

export const ENVIRONMENT_SENSOR_PARAM_KEYS = [
	"pm25",
	"pm10",
	"tvoc",
	"hcho",
	"humidity",
	"temperature",
	"co2",
	"noise",
	"wind",
] as const

export type EnvironmentSensorParamKey = (typeof ENVIRONMENT_SENSOR_PARAM_KEYS)[number]
export type EnvironmentSensorReadings = Record<EnvironmentSensorParamKey, number | null>

export const createEmptySensorReadings = (): EnvironmentSensorReadings =>
	Object.fromEntries(ENVIRONMENT_SENSOR_PARAM_KEYS.map((k) => [k, null])) as EnvironmentSensorReadings

export const fillSensorReadingsFromValues = (
	target: EnvironmentSensorReadings,
	values: Record<string, number | null | undefined>
) => {
	for (const key of ENVIRONMENT_SENSOR_PARAM_KEYS) {
		const value = values[key]
		target[key] = typeof value === "number" && Number.isFinite(value) ? value : null
	}
}

export type EnvironmentDeviceStatus = { deviceId: number; status: "online" | "offline" }

export type EnvironmentLocationSnapshot = {
	recordedAt: string | null
	data: Record<string, number | null>
	devices: Record<number, "online" | "offline">
}

export const createEmptyEnvironmentSnapshot = (): EnvironmentLocationSnapshot => ({
	recordedAt: null,
	data: {},
	devices: {},
})

const extractNumericData = (raw: Record<string, unknown>): Record<string, number | null> => {
	const out: Record<string, number | null> = {}
	for (const [key, value] of Object.entries(raw)) {
		out[key] = typeof value === "number" && Number.isFinite(value) ? value : null
	}
	return out
}

export const parseEnvironmentReadingEvent = (event: EnvironmentReadingNewEvent) => {
	const legacyReading = event.reading as Record<string, unknown> | undefined
	const nested = legacyReading?.data
	const legacyData =
		nested && typeof nested === "object" && !Array.isArray(nested)
			? (nested as Record<string, unknown>)
			: legacyReading && typeof legacyReading === "object"
				? legacyReading
				: {}

	const data =
		event.data && typeof event.data === "object" && !Array.isArray(event.data)
			? (event.data as Record<string, unknown>)
			: legacyData

	const recordedAt =
		event.recordedAt ||
		(typeof legacyReading?.timestamp === "string" ? legacyReading.timestamp : null) ||
		event.timestamp

	const devices = (event.devices ?? [])
		.map((d) => ({
			deviceId: Number(d.deviceId),
			status: d.status === "online" ? ("online" as const) : ("offline" as const),
		}))
		.filter((d) => Number.isFinite(d.deviceId))

	return { recordedAt, data, devices }
}

export const mergeEnvironmentSnapshot = (
	prev: EnvironmentLocationSnapshot,
	parsed: ReturnType<typeof parseEnvironmentReadingEvent>
): EnvironmentLocationSnapshot => {
	const next: EnvironmentLocationSnapshot = {
		recordedAt: prev.recordedAt,
		data: { ...prev.data },
		devices: { ...prev.devices },
	}

	for (const { deviceId, status } of parsed.devices) {
		next.devices[deviceId] = status
	}

	const incoming = extractNumericData(parsed.data)
	if (Object.keys(incoming).length > 0) {
		const prevMs = prev.recordedAt ? Date.parse(prev.recordedAt) : 0
		const curMs = Date.parse(parsed.recordedAt)
		const useIncoming = !prev.recordedAt || (Number.isFinite(curMs) && curMs >= prevMs)
		if (useIncoming) {
			next.recordedAt = parsed.recordedAt
			for (const [key, value] of Object.entries(incoming)) {
				if (value != null) next.data[key] = value
			}
		} else {
			for (const [key, value] of Object.entries(incoming)) {
				if (value != null && next.data[key] == null) next.data[key] = value
			}
		}
	} else if (parsed.recordedAt && !next.recordedAt) {
		next.recordedAt = parsed.recordedAt
	}

	return next
}

export const isEnvironmentSnapshotLive = (
	snapshot: EnvironmentLocationSnapshot | null | undefined,
	deviceIds: number[],
	options?: { nowMs?: number; staleMs?: number }
): boolean => {
	if (!snapshot || deviceIds.length === 0 || !snapshot.recordedAt) return false

	const staleMs = options?.staleMs ?? ENVIRONMENT_READING_STALE_MS
	const nowMs = options?.nowMs ?? Date.now()
	const recordedAt = Date.parse(snapshot.recordedAt)
	if (!Number.isFinite(recordedAt) || nowMs - recordedAt >= staleMs) return false

	// 僅當「所有」綁定設備皆被 WS 標為 offline 時視為離線（單台讀取失敗不拖垮整地點）
	if (deviceIds.every((id) => snapshot.devices[id] === "offline")) return false

	return true
}

export const formatSensorDisplayValue = (
	value: number | null | undefined,
	options?: { offline?: boolean; fractionDigits?: number }
): string => {
	if (options?.offline || value == null || Number.isNaN(value)) return SENSOR_DISPLAY_OFFLINE
	const digits = options?.fractionDigits ?? 0
	return Number(value.toFixed(digits)).toString()
}

/** 由首頁／卡片顯示字串還原儀表弧形用的數值（離線 "--" 回傳 null） */
export const parseSensorGaugeValue = (value: number | string): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value
	if (typeof value !== "string" || value === SENSOR_DISPLAY_OFFLINE) return null
	const parsed = Number.parseFloat(value)
	return Number.isFinite(parsed) ? parsed : null
}

export const buildBootstrapSnapshot = (params: {
	deviceIds: number[]
	timestamp: string
	data: Record<string, unknown>
}): EnvironmentLocationSnapshot | null => {
	const recordedMs = Date.parse(params.timestamp)
	if (
		!Number.isFinite(recordedMs) ||
		Date.now() - recordedMs >= ENVIRONMENT_READING_STALE_MS
	) {
		return null
	}
	return {
		recordedAt: params.timestamp,
		data: extractNumericData(params.data),
		devices: Object.fromEntries(params.deviceIds.map((id) => [id, "online" as const])),
	}
}
