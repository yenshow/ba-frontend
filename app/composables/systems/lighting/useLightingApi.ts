import type { LightingZone, LightingLocation } from "~/types/lighting"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToLightingZone,
	lightingToUnifiedZone,
	lightingLocationToUnified,
} from "~/utils/locationAdapter"

export interface CreateLightingZoneData {
	name: string
	imageUrl?: string
	locations?: Omit<LightingLocation, "id">[]
}

export interface UpdateLightingZoneData {
	name?: string
	imageUrl?: string
	locations?: (LightingLocation | Omit<LightingLocation, "id">)[]
}

export const useLightingApi = () => {
	const zoneApi = useSystemLocationApiFactory<LightingZone, LightingLocation>({
		systemType: "lighting",
		unifiedToSystemZone: unifiedToLightingZone,
		systemToUnifiedZone: (zone) => lightingToUnifiedZone(zone, "lighting"),
		locationToUnified: lightingLocationToUnified,
	})

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
	}
}

