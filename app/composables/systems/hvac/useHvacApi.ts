import type { HvacZone, HvacLocation } from "~/types/hvac"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import { unifiedToHvacZone, hvacToUnifiedZone, hvacLocationToUnified } from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"

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

	const { request } = useApiBase()

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus: (zoneIds?: string[]) => {
			const q = zoneIds && zoneIds.length > 0 ? `?zoneIds=${zoneIds.map(encodeURIComponent).join(",")}` : ""
			return request<{ items: any[] }>(`/hvac/status${q}`)
		},
		getZoneStatus: (zoneId: string) => request<{ zoneId: string; items: any[] }>(`/hvac/zones/${zoneId}/status`),
	}
}

