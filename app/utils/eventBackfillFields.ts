/** 訂閱漏推補齊：與後端 isapiEventBackfillCommon 視窗範圍對齊 */
export const EVENT_BACKFILL_DEFAULT_WINDOW_SEC = 5
export const EVENT_BACKFILL_MIN_WINDOW_SEC = 1
export const EVENT_BACKFILL_MAX_WINDOW_SEC = 30

export const clampEventBackfillWindowSec = (raw: unknown): number => {
	const n = Math.trunc(Number(raw))
	if (!Number.isFinite(n)) return EVENT_BACKFILL_DEFAULT_WINDOW_SEC
	return Math.min(
		EVENT_BACKFILL_MAX_WINDOW_SEC,
		Math.max(EVENT_BACKFILL_MIN_WINDOW_SEC, n)
	)
}

/** 寫回後端時：未開則 false；秒數一律 clamp */
export const toStoredEventBackfillConfig = (loc: {
	eventBackfillEnabled?: boolean
	eventBackfillWindowSec?: number
}) => ({
	eventBackfillEnabled: loc.eventBackfillEnabled === true,
	eventBackfillWindowSec: clampEventBackfillWindowSec(
		loc.eventBackfillWindowSec ?? EVENT_BACKFILL_DEFAULT_WINDOW_SEC
	),
})