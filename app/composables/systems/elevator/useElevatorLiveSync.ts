import { computed, onScopeDispose, toValue, type MaybeRefOrGetter, type Ref } from "vue"
import type { ElevatorLocation, ElevatorLiveState } from "~/types/elevator"
import { useWebSocket } from "~/composables/websocket/useWebSocket"
import { useElevatorLiveRefresh } from "~/composables/systems/elevator/useElevatorLiveRefresh"

export type ElevatorRuntimeWsPayload = ElevatorLiveState & {
	locationId: number
	timestamp?: string
}

const parseRuntimeWsPayload = (payload: ElevatorRuntimeWsPayload) => {
	const { locationId, timestamp, ...rest } = payload
	const live: ElevatorLiveState = {
		...rest,
		updatedAt: rest.updatedAt ?? timestamp,
	}
	return { locationId, live }
}

type UseElevatorLiveSyncOptions = {
	locations: Ref<ElevatorLocation[]>
	selectedLocation: Ref<ElevatorLocation | null>
	selectedLocationId: MaybeRefOrGetter<number | null | undefined>
}

/**
 * 電梯運行態同步：WS、選中地點補拉、手動更新共用同一 patch 路徑。
 */
export const useElevatorLiveSync = (options: UseElevatorLiveSyncOptions) => {
	const applyElevatorLive = (locationId: number, live: ElevatorLiveState) => {
		const idx = options.locations.value.findIndex((l) => l.locationId === locationId)
		if (idx >= 0) {
			options.locations.value[idx] = { ...options.locations.value[idx], live }
		}
		if (options.selectedLocation.value?.locationId === locationId) {
			options.selectedLocation.value = { ...options.selectedLocation.value, live }
		}
	}

	const handleRuntimeUpdate = (
		source: number | ElevatorRuntimeWsPayload,
		live?: ElevatorLiveState,
	) => {
		if (typeof source === "number") {
			if (live) applyElevatorLive(source, live)
			return
		}
		if (!source?.locationId) return
		const parsed = parseRuntimeWsPayload(source)
		applyElevatorLive(parsed.locationId, parsed.live)
	}

	const selectedLive = computed(() => options.selectedLocation.value?.live ?? null)

	useElevatorLiveRefresh({
		locationId: options.selectedLocationId,
		live: selectedLive,
		onLive: (live) => {
			const id = toValue(options.selectedLocationId)
			if (id != null) applyElevatorLive(id, live)
		},
	})

	const { on, off } = useWebSocket()
	const wsHandler = (payload: ElevatorRuntimeWsPayload) => handleRuntimeUpdate(payload)
	on("elevator:runtime:update", wsHandler)
	onScopeDispose(() => off("elevator:runtime:update", wsHandler))

	return { applyElevatorLive, handleRuntimeUpdate }
}
