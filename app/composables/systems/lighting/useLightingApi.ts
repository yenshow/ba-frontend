import type { LightingZone, LightingLocation, LightingStatusSnapshotItem } from "~/types/lighting"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import { useApiBase } from "~/composables/core/useApiBase"
import {
	buildStatusSnapshotQueryString,
	type StatusSnapshotQuery,
} from "~/composables/monitoring/statusSnapshotQuery"
import {
	unifiedToLightingZone,
	lightingToUnifiedZone,
	lightingLocationToUnified,
} from "~/utils/locationAdapter"

export interface CreateLightingZoneData {
	name: string
	imageUrl?: string
	locations?: Omit<LightingLocation, "id">[]
}

export interface UpdateLightingZoneData {
	name?: string
	imageUrl?: string
	locations?: (LightingLocation | Omit<LightingLocation, "id">)[]
}

export const useLightingApi = () => {
	const { request } = useApiBase()
	const zoneApi = useSystemLocationApiFactory<LightingZone, LightingLocation>({
		systemType: "lighting",
		unifiedToSystemZone: unifiedToLightingZone,
		systemToUnifiedZone: (zone) => lightingToUnifiedZone(zone, "lighting"),
		locationToUnified: lightingLocationToUnified,
	})

	const getStatus = async (params?: StatusSnapshotQuery) => {
		const suffix = buildStatusSnapshotQueryString(params)
		return request<{ items: LightingStatusSnapshotItem[] }>(`/lighting/status${suffix}`, {
			timeout: 30_000,
		})
	}

	const getZoneStatus = async (zoneId: string | number) => {
		return request<{ zoneId: string; items: LightingStatusSnapshotItem[] }>(
			`/lighting/zones/${zoneId}/status`,
			{ timeout: 30_000 }
		)
	}

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		getStatus,
		getZoneStatus,
	}
}
