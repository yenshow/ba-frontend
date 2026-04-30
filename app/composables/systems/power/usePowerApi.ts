import type { PowerZone, PowerLocation, PowerStatusItem } from "~/types/power"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToPowerZone,
	powerToUnifiedZone,
	powerLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"

export const usePowerApi = () => {
	const zoneApi = useSystemLocationApiFactory<PowerZone, PowerLocation>({
		systemType: "power",
		unifiedToSystemZone: unifiedToPowerZone,
		systemToUnifiedZone: (zone) => powerToUnifiedZone(zone, "power"),
		locationToUnified: powerLocationToUnified,
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
			return request<{ items: PowerStatusItem[] }>(`/power/status${q}`)
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: PowerStatusItem[] }>(`/power/zones/${zoneId}/status`),
	}
}
