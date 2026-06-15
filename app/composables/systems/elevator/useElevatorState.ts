import { ref } from "vue"
import { setupDebouncedRefetchListeners } from "~/composables/websocket/useWebSocket"
import type { ElevatorLocation, ElevatorLog, ElevatorZone } from "~/types/elevator"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

const LADDER_SDK_EVENT = "ladder-sdk:event"

export const useElevatorState = () => {
	const elevatorApi = useElevatorApi()
	const { handleError } = useErrorHandler()

	const locations = ref<ElevatorLocation[]>([])
	const selectedLocation = ref<ElevatorLocation | null>(null)
	const logs = ref<ElevatorLog[]>([])
	const elevatorZones = ref<ElevatorZone[]>([])
	const isLoadingLocations = ref(false)
	const isLoadingZones = ref(false)

	const loadLocations = async (existingZones?: { zones: ElevatorZone[] }) => {
		isLoadingLocations.value = true
		try {
			const result = await elevatorApi.getLocations(existingZones)
			locations.value = result.locations
			if (result.zones?.length) {
				elevatorZones.value = result.zones
			}

			if (selectedLocation.value?.locationId) {
				const updated = locations.value.find(
					(loc) => loc.locationId === selectedLocation.value?.locationId,
				)
				if (updated) {
					selectedLocation.value = {
						...selectedLocation.value,
						...updated,
					}
				}
			}
		} catch (error) {
			handleError(error, "載入地點列表失敗")
			throw error
		} finally {
			isLoadingLocations.value = false
		}
	}

	const loadLocationDetail = async (locationId: number) => {
		try {
			const detail = await elevatorApi.getLocationDetail(locationId, locations.value)
			selectedLocation.value = detail
			logs.value = detail.latestLogs ?? []
		} catch (error) {
			handleError(error, "載入地點詳情失敗")
			throw error
		}
	}

	const loadZones = async () => {
		if (isLoadingZones.value) return
		isLoadingZones.value = true
		try {
			const result = await elevatorApi.getZones()
			elevatorZones.value = result.zones || []
		} catch (error) {
			handleError(error, "載入區域列表失敗")
			throw error
		} finally {
			isLoadingZones.value = false
		}
	}

	const getLocationZone = (location: ElevatorLocation): string | null => {
		const zone = elevatorZones.value.find((z) =>
			z.locations?.some((loc) => {
				if (!loc.id) return false
				return Number(loc.id) === location.locationId
			}),
		)
		return zone?.name || null
	}

	const setupEventListeners = (onRefetch: () => void | Promise<void>, debounceMs = 500) =>
		setupDebouncedRefetchListeners(
			onRefetch,
			[{ event: LADDER_SDK_EVENT }],
			debounceMs,
			"Elevator WebSocket",
		)

	return {
		locations,
		selectedLocation,
		logs,
		elevatorZones,
		isLoadingLocations,
		isLoadingZones,
		loadLocations,
		loadLocationDetail,
		loadZones,
		getLocationZone,
		setupEventListeners,
	}
}
