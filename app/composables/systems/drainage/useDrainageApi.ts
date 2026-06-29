import type { DrainageZone, DrainageLocation, DrainageStatusItem } from "~/types/drainage"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToDrainageZone,
	drainageToUnifiedZone,
	drainageLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"
import {
	buildStatusSnapshotQueryString,
	type StatusSnapshotQuery,
} from "~/composables/monitoring/statusSnapshotQuery"

export const useDrainageApi = () => {
	const zoneApi = useSystemLocationApiFactory<DrainageZone, DrainageLocation>({
		systemType: "drainage",
		unifiedToSystemZone: unifiedToDrainageZone,
		systemToUnifiedZone: (zone) => drainageToUnifiedZone(zone, "drainage"),
		locationToUnified: drainageLocationToUnified,
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
			return request<{ items: DrainageStatusItem[] }>(`/drainage/status${q}`, {
				timeout: 30_000,
			})
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: DrainageStatusItem[] }>(
				`/drainage/zones/${zoneId}/status`,
				{ timeout: 30_000 }
			),
	}
}
