import type { IntercomZone, IntercomLocation } from "~/types/intercom"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToIntercomZone,
	intercomToUnifiedZone,
	intercomLocationToUnified,
} from "~/utils/locationAdapter"

export const useIntercomLocationApi = () => {
	const zoneApi = useSystemLocationApiFactory<IntercomZone, IntercomLocation>({
		systemType: "intercom",
		unifiedToSystemZone: unifiedToIntercomZone,
		systemToUnifiedZone: (zone) => intercomToUnifiedZone(zone, "intercom"),
		locationToUnified: intercomLocationToUnified,
	})

	return {
		getZones: zoneApi.getZones,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
	}
}
