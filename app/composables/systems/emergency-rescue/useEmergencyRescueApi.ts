import type {
	EmergencyRescueZone,
	EmergencyRescueLocation,
	EmergencyRescueStatusItem,
} from "~/types/emergency-rescue"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToEmergencyRescueZone,
	emergencyRescueToUnifiedZone,
	emergencyRescueLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"

export const useEmergencyRescueApi = () => {
	const zoneApi = useSystemLocationApiFactory<EmergencyRescueZone, EmergencyRescueLocation>({
		systemType: "emergency_rescue",
		unifiedToSystemZone: unifiedToEmergencyRescueZone,
		systemToUnifiedZone: (zone) => emergencyRescueToUnifiedZone(zone, "emergency_rescue"),
		locationToUnified: emergencyRescueLocationToUnified,
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
			return request<{ items: EmergencyRescueStatusItem[] }>(`/emergency-rescue/status${q}`, {
				timeout: 30_000,
			})
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: EmergencyRescueStatusItem[] }>(
				`/emergency-rescue/zones/${zoneId}/status`,
				{ timeout: 30_000 }
			),
	}
}
