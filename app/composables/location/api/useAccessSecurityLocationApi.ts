import type { AccessSecurityZone, AccessSecurityLocation } from "~/types/accessSecurity"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToAccessSecurityZone,
	accessSecurityToUnifiedZone,
	accessSecurityLocationToUnified,
} from "~/utils/locationAdapter"

export const useAccessSecurityLocationApi = () => {
	const zoneApi = useSystemLocationApiFactory<AccessSecurityZone, AccessSecurityLocation>({
		systemType: "access_security",
		unifiedToSystemZone: unifiedToAccessSecurityZone,
		systemToUnifiedZone: (zone) => accessSecurityToUnifiedZone(zone, "access_security"),
		locationToUnified: accessSecurityLocationToUnified,
	})

	return {
		getZones: zoneApi.getZones,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
	}
}
