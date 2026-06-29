import type { PowerZone, PowerLocation, PowerStatusItem } from "~/types/power"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToPowerZone,
	powerToUnifiedZone,
	powerLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"
import {
	buildStatusSnapshotQueryString,
	type StatusSnapshotQuery,
} from "~/composables/monitoring/statusSnapshotQuery"

export const usePowerApi = () => {
	const zoneApi = useSystemLocationApiFactory<PowerZone, PowerLocation>({
		systemType: "power",
		unifiedToSystemZone: unifiedToPowerZone,
		systemToUnifiedZone: (zone) => powerToUnifiedZone(zone, "power"),
		locationToUnified: powerLocationToUnified,
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
			return request<{ items: PowerStatusItem[] }>(`/power/status${q}`, {
				timeout: 30_000,
			})
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: PowerStatusItem[] }>(`/power/zones/${zoneId}/status`, {
				timeout: 30_000,
			}),
	}
}
