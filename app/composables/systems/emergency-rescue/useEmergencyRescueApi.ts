import type {
	EmergencyRescueZone,
	EmergencyRescueLocation,
	EmergencyRescueStatusItem,
} from "~/types/emergency-rescue"
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory"
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

	const errorTrackingApi = useErrorTrackingApiFactory(
		"/emergency-rescue/systems",
		"無法讀取緊急求救設備資料"
	)

	const { request } = useApiBase()

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		reportError: errorTrackingApi.reportError,
		clearError: errorTrackingApi.clearError,
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
