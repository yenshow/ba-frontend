import type {
	AirCirculationZone,
	AirCirculationLocation,
	AirCirculationStatusItem,
} from "~/types/air-circulation"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToAirCirculationZone,
	airCirculationToUnifiedZone,
	airCirculationLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"
import {
	buildStatusSnapshotQueryString,
	type StatusSnapshotQuery,
} from "~/composables/monitoring/statusSnapshotQuery"

export const useAirCirculationApi = () => {
	const zoneApi = useSystemLocationApiFactory<AirCirculationZone, AirCirculationLocation>({
		systemType: "air_circulation",
		unifiedToSystemZone: unifiedToAirCirculationZone,
		systemToUnifiedZone: (zone) => airCirculationToUnifiedZone(zone, "air_circulation"),
		locationToUnified: airCirculationLocationToUnified,
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
			return request<{ items: AirCirculationStatusItem[] }>(`/air-circulation/status${q}`, {
				timeout: 30_000,
			})
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: AirCirculationStatusItem[] }>(
				`/air-circulation/zones/${zoneId}/status`,
				{ timeout: 30_000 }
			),
	}
}
