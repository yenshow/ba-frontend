import type { SmokeAlarmZone, SmokeAlarmLocation, SmokeAlarmStatusItem } from "~/types/smoke-alarm"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToSmokeAlarmZone,
	smokeAlarmToUnifiedZone,
	smokeAlarmLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"

export const useSmokeAlarmApi = () => {
	const zoneApi = useSystemLocationApiFactory<SmokeAlarmZone, SmokeAlarmLocation>({
		systemType: "smoke_alarm",
		unifiedToSystemZone: unifiedToSmokeAlarmZone,
		systemToUnifiedZone: (zone) => smokeAlarmToUnifiedZone(zone, "smoke_alarm"),
		locationToUnified: smokeAlarmLocationToUnified,
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
			return request<{ items: SmokeAlarmStatusItem[] }>(`/smoke-alarm/status${q}`, {
				timeout: 30_000,
			})
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: SmokeAlarmStatusItem[] }>(
				`/smoke-alarm/zones/${zoneId}/status`,
				{ timeout: 30_000 }
			),
	}
}
