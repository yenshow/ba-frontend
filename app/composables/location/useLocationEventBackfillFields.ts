import { computed, type Ref } from "vue"
import {
	EVENT_BACKFILL_DEFAULT_WINDOW_SEC,
	clampEventBackfillWindowSec,
} from "~/utils/eventBackfillFields"

type EventBackfillLocationFields = {
	eventBackfillEnabled?: boolean
	eventBackfillWindowSec?: number
}

/**
 * 地點表單：訂閱漏推補齊開關／秒數（人流門禁・人臉・車牌共用）
 */
export const useLocationEventBackfillFields = <T extends EventBackfillLocationFields>(
	localLocation: Ref<T>
) => {
	const eventBackfillEnabledInput = computed({
		get: () => Boolean(localLocation.value.eventBackfillEnabled),
		set: (v: boolean) => {
			localLocation.value.eventBackfillEnabled = Boolean(v)
			if (v && localLocation.value.eventBackfillWindowSec == null) {
				localLocation.value.eventBackfillWindowSec = EVENT_BACKFILL_DEFAULT_WINDOW_SEC
			}
		},
	})

	const eventBackfillWindowSecInput = computed({
		get: () =>
			clampEventBackfillWindowSec(
				localLocation.value.eventBackfillWindowSec ?? EVENT_BACKFILL_DEFAULT_WINDOW_SEC
			),
		set: (raw: number | string) => {
			localLocation.value.eventBackfillWindowSec = clampEventBackfillWindowSec(raw)
		},
	})

	return {
		eventBackfillEnabledInput,
		eventBackfillWindowSecInput,
		EVENT_BACKFILL_DEFAULT_WINDOW_SEC,
	}
}
