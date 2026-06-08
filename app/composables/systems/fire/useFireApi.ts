import type { FireZone, FireLocation, FireStatusItem } from "~/types/fire"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToFireZone,
	fireToUnifiedZone,
	fireLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"

export const useFireApi = () => {
	const zoneApi = useSystemLocationApiFactory<FireZone, FireLocation>({
		systemType: "fire",
		unifiedToSystemZone: unifiedToFireZone,
		systemToUnifiedZone: (zone) => fireToUnifiedZone(zone, "fire"),
		locationToUnified: fireLocationToUnified,
	})

	const { request } = useApiBase()

	type StatusQuery = { zoneIds?: string[] }

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus: (query?: StatusQuery) => {
			const zoneIds = query?.zoneIds
			const params = new URLSearchParams()
			if (zoneIds && zoneIds.length > 0) params.set("zoneIds", zoneIds.join(","))
			const q = params.toString() ? `?${params.toString()}` : ""
			return request<{ items: FireStatusItem[] }>(`/fire/status${q}`, {
				timeout: 30_000,
			})
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: FireStatusItem[] }>(`/fire/zones/${zoneId}/status`, {
				timeout: 30_000,
			}),
	}
}
