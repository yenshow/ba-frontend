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

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus: (zoneIds?: string[]) => {
			const q =
				zoneIds && zoneIds.length > 0 ? `?zoneIds=${zoneIds.map(encodeURIComponent).join(",")}` : ""
			return request<{ items: PowerStatusItem[] }>(`/power/status${q}`)
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: PowerStatusItem[] }>(`/power/zones/${zoneId}/status`),
	}
}
