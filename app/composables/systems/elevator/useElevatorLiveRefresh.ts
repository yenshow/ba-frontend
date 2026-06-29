import { toValue, watch, type MaybeRefOrGetter } from "vue"
import type { ElevatorLiveState } from "~/types/elevator"
import { useVisibilitySnapshotSync } from "~/composables/monitoring/useVisibilitySnapshotSync"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"

type UseElevatorLiveRefreshOptions = {
	locationId: MaybeRefOrGetter<number | null | undefined>
	onLive: (live: ElevatorLiveState) => void
}

/**
 * ?? live ????????????????????WS ????? interval ????
 */
export const useElevatorLiveRefresh = (options: UseElevatorLiveRefreshOptions) => {
	const elevatorApi = useElevatorApi()

	const refreshLive = async () => {
		const id = toValue(options.locationId)
		if (id == null) return
		try {
			const res = await elevatorApi.getLiveState(id)
			if (res?.live) options.onLive(res.live)
		} catch {
			/* ???????WS ?? */
		}
	}

	const visibility = useVisibilitySnapshotSync({
		start: () => {},
		stop: () => {},
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
		{ immediate: true }
	)

	return {
		refreshLive,
		...visibility,
	}
}
