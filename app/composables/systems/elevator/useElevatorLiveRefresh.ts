import { computed, toValue, watch, type MaybeRefOrGetter } from "vue"
import type { ElevatorLiveState } from "~/types/elevator"
import { useVisibilityAutoRefresh } from "~/composables/monitoring/useVisibilityAutoRefresh"
import {
	ELEVATOR_POLL_MOVING_MS,
	ELEVATOR_RUNTIME_POLL_MS,
	isElevatorPollAccelerated,
} from "~/utils/elevatorFloorModel"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"

type UseElevatorLiveRefreshOptions = {
	locationId: MaybeRefOrGetter<number | null | undefined>
	live: MaybeRefOrGetter<ElevatorLiveState | null | undefined>
	onLive: (live: ElevatorLiveState) => void
}

export const useElevatorLiveRefresh = (options: UseElevatorLiveRefreshOptions) => {
	const elevatorApi = useElevatorApi()
	let timer: ReturnType<typeof setInterval> | null = null

	const pollIntervalMs = computed(() => {
		const state = toValue(options.live)
		return isElevatorPollAccelerated(state) ? ELEVATOR_POLL_MOVING_MS : ELEVATOR_RUNTIME_POLL_MS
	})

	const refreshLive = async () => {
		const id = toValue(options.locationId)
		if (id == null) return
		try {
			const res = await elevatorApi.getLiveState(id)
			if (res?.live) options.onLive(res.live)
		} catch {
			/* 補拉失敗略過，WS 為主 */
		}
	}

	const stopTimer = () => {
		if (timer) {
			clearInterval(timer)
			timer = null
		}
	}

	const startTimer = () => {
		stopTimer()
		const id = toValue(options.locationId)
		if (id == null) return
		timer = setInterval(() => void refreshLive(), pollIntervalMs.value)
	}

	watch(pollIntervalMs, () => {
		if (timer) startTimer()
	})

	const visibility = useVisibilityAutoRefresh({
		start: startTimer,
		stop: stopTimer,
		onVisible: refreshLive,
	})

	watch(
		() => toValue(options.locationId),
		(id) => {
			visibility.stop()
			if (id != null) {
				void refreshLive()
				visibility.start()
			}
		},
		{ immediate: true },
	)

	return {
		refreshLive,
		...visibility,
	}
}
