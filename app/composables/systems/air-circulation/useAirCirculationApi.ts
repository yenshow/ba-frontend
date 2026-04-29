import type { AirCirculationZone, AirCirculationLocation } from "~/types/air-circulation"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToAirCirculationZone,
	airCirculationToUnifiedZone,
	airCirculationLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"

export const useAirCirculationApi = () => {
	const zoneApi = useSystemLocationApiFactory<AirCirculationZone, AirCirculationLocation>({
		systemType: "air_circulation",
		unifiedToSystemZone: unifiedToAirCirculationZone,
		systemToUnifiedZone: (zone) => airCirculationToUnifiedZone(zone as any, "air_circulation"),
		locationToUnified: airCirculationLocationToUnified,
	})

	const { request } = useApiBase()

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus: (zoneIds?: string[]) => {
			const q =
				zoneIds && zoneIds.length > 0 ? `?zoneIds=${zoneIds.map(encodeURIComponent).join(",")}` : ""
			return request<{ items: any[] }>(`/air-circulation/status${q}`)
		},
		getZoneStatus: (zoneId: string) => request<{ zoneId: string; items: any[] }>(`/air-circulation/zones/${zoneId}/status`),
	}
}

