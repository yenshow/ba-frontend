/**
 * 即時／WebSocket／後備輪詢 Timing SSOT（前端）
 * @see docs/30-contracts/websocket.md
 */

/** Socket.IO client */
export const SOCKET_CLIENT_TIMEOUT_MS = 20_000
export const SOCKET_RECONNECTION_DELAY_MS = 1000
export const SOCKET_RECONNECTION_DELAY_MAX_MS = 5000
export const SOCKET_RANDOMIZATION_FACTOR = 0.5

/** WS 斷線後備（唯一業務後備間隔） */
export const FALLBACK_POLL_MS = 30_000

/** 警報基準：alert:count／badge／防抖重拉 */
export const EVENT_COALESCE_MS = 500

/** 操作層防抖（toggle／警報驅動 refresh） */
export const UI_ACTION_DEBOUNCE_MS = 300
export const TOGGLE_ROUNDTRIP_DELAY_MS = 450
export const TOGGLE_SNAPSHOT_HOLD_MS = 8000
export const DEVICE_CONNECTIVITY_DEBOUNCE_MS = 150

/** 電梯 UI 補間（≠ 後端 poll） */
export const ELEVATOR_FLOOR_STEP_MS = 1500

/** 環境讀數顯示過期門檻 */
export const ENVIRONMENT_READING_STALE_MS = 10 * 60 * 1000

/** 能源表計讀數顯示過期門檻 */
export const ENERGY_READING_STALE_MS = 10 * 60 * 1000

/** Modbus status GET */
export const STATUS_API_TIMEOUT_MS = 30_000

/** 門禁事件調閱攝影機跳窗（非警報 modal）；可經 system_settings 覆寫秒數 */
export const ACCESS_EVENT_CAMERA_POPUP_MS_DEFAULT = 8_000
export const ACCESS_EVENT_CAMERA_POPUP_MS_MIN = 5_000
export const ACCESS_EVENT_CAMERA_POPUP_MS_MAX = 10_000
export const ACCESS_EVENT_CAMERA_POPUP_SETTING_KEY = "access_event_camera_popup_duration_sec"

export const clampAccessEventCameraPopupMs = (ms: number): number =>
	Math.min(
		ACCESS_EVENT_CAMERA_POPUP_MS_MAX,
		Math.max(ACCESS_EVENT_CAMERA_POPUP_MS_MIN, Math.round(ms))
	)

export const parseAccessEventCameraPopupMs = (
	raw: string | number | null | undefined
): number => {
	if (raw == null || raw === "") return ACCESS_EVENT_CAMERA_POPUP_MS_DEFAULT
	const sec = Number(String(raw).trim())
	if (!Number.isFinite(sec) || sec <= 0) return ACCESS_EVENT_CAMERA_POPUP_MS_DEFAULT
	return clampAccessEventCameraPopupMs(sec * 1000)
}
