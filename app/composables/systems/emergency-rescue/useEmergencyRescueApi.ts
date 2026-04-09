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

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus: (zoneIds?: string[]) => {
			const q =
				zoneIds && zoneIds.length > 0 ? `?zoneIds=${zoneIds.map(encodeURIComponent).join(",")}` : ""
			return request<{ items: EmergencyRescueStatusItem[] }>(`/emergency-rescue/status${q}`)
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: EmergencyRescueStatusItem[] }>(
				`/emergency-rescue/zones/${zoneId}/status`
			),
	}
}
