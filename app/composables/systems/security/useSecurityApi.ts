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

export type SecurityScheduleRule = {
	id: number
	name: string
	daysOfWeek: number[]
	windowStart: string
	windowEnd: string
	enabled: boolean
	locationIds: number[]
}

export type SecurityScheduleRuleInput = {
	name?: string
	daysOfWeek?: number[]
	windowStart: string
	windowEnd: string
	enabled?: boolean
	locationIds: number[]
}

export const useSecurityApi = () => {
	const zoneApi = useSystemLocationApiFactory<SecurityZone, SecurityLocation>({
		systemType: "security",
		unifiedToSystemZone: unifiedToSecurityZone,
		systemToUnifiedZone: (zone) => securityToUnifiedZone(zone, "security"),
		locationToUnified: securityLocationToUnified,
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
			return request<{ items: SecurityStatusItem[] }>(`/security/status${q}`, {
				timeout: 30_000,
			})
		},
		getZoneStatus: (zoneId: string) =>
			request<{ zoneId: string; items: SecurityStatusItem[] }>(
				`/security/zones/${zoneId}/status`,
				{ timeout: 30_000 }
			),
		getSchedules: () =>
			request<{ rules: SecurityScheduleRule[] }>(`/security/schedules`),
		putSchedules: (rules: SecurityScheduleRuleInput[]) =>
			request<{ rules: SecurityScheduleRule[] }>(`/security/schedules`, {
				method: "PUT",
				body: { rules },
			}),
	}
}
