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
