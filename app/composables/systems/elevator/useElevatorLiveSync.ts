import { toValue, watch, type MaybeRefOrGetter, type Ref } from "vue"
import type { ElevatorLocation, ElevatorLiveState } from "~/types/elevator"
import { useAccessGate } from "~/composables/core/useAccessGate"
import { PERM } from "~/config/permissionCodes"
import { useWebSocketEventSubscription } from "~/composables/websocket/useWebSocket"
import { useVisibilitySnapshotSync } from "~/composables/monitoring/useVisibilitySnapshotSync"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"

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
	const elevatorApi = useElevatorApi()
	const { useWsModuleGate } = useAccessGate()
	const canSubscribe = useWsModuleGate("elevator", { permissionCode: PERM.elevator.module })

	const applyElevatorLive = (locationId: number, live: ElevatorLiveState) => {
		const idx = options.locations.value.findIndex((l) => l.locationId === locationId)
		if (idx >= 0) {
			options.locations.value[idx] = { ...options.locations.value[idx], live }
		}
		if (options.selectedLocation.value?.locationId === locationId) {
			options.selectedLocation.value = { ...options.selectedLocation.value, live }
		}
	}

	const refreshLive = async () => {
		const id = toValue(options.selectedLocationId)
		if (id == null) return
		try {
			const res = await elevatorApi.getLiveState(id)
			if (res?.live) applyElevatorLive(id, res.live)
		} catch {
			/* 補拉失敗時仍依 WS */
		}
	}

	const visibility = useVisibilitySnapshotSync({
		start: () => {},
		stop: () => {},
		onVisible: refreshLive,
	})

	watch(
		() => toValue(options.selectedLocationId),
		(id) => {
			visibility.stop()
			if (id != null) {
				void refreshLive()
				visibility.start()
			}
		},
		{ immediate: true },
	)

	useWebSocketEventSubscription(
		"elevator:runtime:update",
		(payload: ElevatorRuntimeWsPayload) => {
			if (!payload?.locationId) return
			const parsed = parseRuntimeWsPayload(payload)
			applyElevatorLive(parsed.locationId, parsed.live)
		},
		{ enabled: canSubscribe },
	)

	return { applyElevatorLive, refreshLive }
}
