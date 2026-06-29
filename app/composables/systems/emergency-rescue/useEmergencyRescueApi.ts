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
import {
	buildStatusSnapshotQueryString,
	type StatusSnapshotQuery,
} from "~/composables/monitoring/statusSnapshotQuery"

export const useEmergencyRescueApi = () => {
	const zoneApi = useSystemLocationApiFactory<EmergencyRescueZone, EmergencyRescueLocation>({
		systemType: "emergency_rescue",
		unifiedToSystemZone: unifiedToEmergencyRescueZone,
		systemToUnifiedZone: (zone) => emergencyRescueToUnifiedZone(zone, "emergency_rescue"),
		locationToUnified: emergencyRescueLocationToUnified,
	})

	const { request } = useApiBase()

	type StatusQuery = StatusSnapshotQuery

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus: (query?: StatusQuery) => {
			const q = buildStatusSnapshotQueryString(query)
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
