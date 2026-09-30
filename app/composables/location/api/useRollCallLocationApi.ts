import type { RollCallLocation, RollCallZone } from "~/types/rollCall"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	rollCallLocationToUnified,
	rollCallToUnifiedZone,
	unifiedToRollCallZone,
} from "~/utils/locationAdapter"

export const useRollCallLocationApi = () => {
	const zoneApi = useSystemLocationApiFactory<RollCallZone, RollCallLocation>({
		systemType: "roll_call",
		unifiedToSystemZone: unifiedToRollCallZone,
		systemToUnifiedZone: (zone) => rollCallToUnifiedZone(zone, "roll_call"),
		locationToUnified: rollCallLocationToUnified,
	})

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
	}
}
