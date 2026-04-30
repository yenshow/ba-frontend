import type { DrainageZone, DrainageLocation, DrainageStatusItem } from "~/types/drainage"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToDrainageZone,
	drainageToUnifiedZone,
	drainageLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"

export const useDrainageApi = () => {
	const zoneApi = useSystemLocationApiFactory<DrainageZone, DrainageLocation>({
		systemType: "drainage",
		unifiedToSystemZone: unifiedToDrainageZone,
		systemToUnifiedZone: (zone) => drainageToUnifiedZone(zone, "drainage"),
		locationToUnified: drainageLocationToUnified,
	})

	const { request } = useApiBase()

	type StatusQuery = { zoneIds?: string[]; syncAlerts?: boolean }

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus: (query?: StatusQuery) => {
			const zoneIds = query?.zoneIds
			const syncAlerts = query?.syncAlerts
			const params = new URLSearchParams()
			if (zoneIds && zoneIds.length > 0) params.set("zoneIds", zoneIds.join(","))
			if (syncAlerts !== undefined) params.set("syncAlerts", syncAlerts ? "true" : "false")
			const q = params.toString() ? `?${params.toString()}` : ""
			return request<{ items: DrainageStatusItem[] }>(`/drainage/status${q}`)
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: DrainageStatusItem[] }>(`/drainage/zones/${zoneId}/status`),
	}
}

