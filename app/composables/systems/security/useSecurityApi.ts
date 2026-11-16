import type { SecurityZone, SecurityLocation, SecurityStatusItem } from "~/types/security"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import {
	unifiedToSecurityZone,
	securityToUnifiedZone,
	securityLocationToUnified,
} from "~/utils/locationAdapter"
import { useApiBase } from "~/composables/core/useApiBase"
import {
	buildStatusSnapshotQueryString,
	type StatusSnapshotQuery,
} from "~/composables/monitoring/statusSnapshotQuery"

export const useSecurityApi = () => {
	const zoneApi = useSystemLocationApiFactory<SecurityZone, SecurityLocation>({
		systemType: "security",
		unifiedToSystemZone: unifiedToSecurityZone,
		systemToUnifiedZone: (zone) => securityToUnifiedZone(zone, "security"),
		locationToUnified: securityLocationToUnified,
	})

	const { request } = useApiBase()

	type StatusQuery = StatusSnapshotQuery
	type ScheduleRule = {
		id: number
		locationId: number
		name: string
		daysOfWeek: number[]
		windowStart: string
		windowEnd: string
		enabled: boolean
	}

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus: (query?: StatusQuery) => {
			const q = buildStatusSnapshotQueryString(query)
			return request<{ items: SecurityStatusItem[] }>(`/security/status${q}`, {
				timeout: 30_000,
			})
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: SecurityStatusItem[] }>(
				`/security/zones/${zoneId}/status`,
				{ timeout: 30_000 }
			),
		getSchedules: (locationId: number | string) =>
			request<{ rules: ScheduleRule[] }>(`/security/locations/${locationId}/schedules`),
		putSchedules: (
			locationId: number | string,
			rules: Array<{
				name?: string
				daysOfWeek?: number[]
				windowStart: string
				windowEnd: string
				enabled?: boolean
			}>
		) =>
			request<{ rules: ScheduleRule[] }>(`/security/locations/${locationId}/schedules`, {
				method: "PUT",
				body: { rules },
			}),
	}
}
