import type { ElevatorZone, ElevatorLocation } from "~/types/elevator"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToElevatorZone,
	elevatorToUnifiedZone,
	elevatorLocationToUnified,
} from "~/utils/locationAdapter"

export const useElevatorLocationApi = () => {
	const zoneApi = useSystemLocationApiFactory<ElevatorZone, ElevatorLocation>({
		systemType: "elevator",
		unifiedToSystemZone: unifiedToElevatorZone,
		systemToUnifiedZone: (zone) => elevatorToUnifiedZone(zone, "elevator"),
		locationToUnified: elevatorLocationToUnified,
	})

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
	}
}
