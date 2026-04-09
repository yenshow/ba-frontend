import type { HvacZone, HvacLocation } from "~/types/hvac"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import { unifiedToHvacZone, hvacToUnifiedZone, hvacLocationToUnified } from "~/utils/locationAdapter"

export interface CreateHvacZoneData {
	name: string
	imageUrl?: string
	locations?: Omit<HvacLocation, "id">[]
}

export interface UpdateHvacZoneData {
	name?: string
	imageUrl?: string
	locations?: (HvacLocation | Omit<HvacLocation, "id">)[]
}

export const useHvacApi = () => {
	const zoneApi = useSystemLocationApiFactory<HvacZone, HvacLocation>({
		systemType: "hvac",
		unifiedToSystemZone: unifiedToHvacZone,
		systemToUnifiedZone: (zone) => hvacToUnifiedZone(zone as any, "hvac"),
		locationToUnified: hvacLocationToUnified,
	})

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
	}
}

