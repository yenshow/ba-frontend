import type { FireZone, FireLocation, FireStatusItem } from "~/types/fire"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import { unifiedToFireZone, fireToUnifiedZone, fireLocationToUnified } from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"

export const useFireApi = () => {
	const zoneApi = useSystemLocationApiFactory<FireZone, FireLocation>({
		systemType: "fire",
		unifiedToSystemZone: unifiedToFireZone,
		systemToUnifiedZone: (zone) => fireToUnifiedZone(zone, "fire"),
		locationToUnified: fireLocationToUnified,
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
			return request<{ items: FireStatusItem[] }>(`/fire/status${q}`)
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: FireStatusItem[] }>(`/fire/zones/${zoneId}/status`),
	}
}
