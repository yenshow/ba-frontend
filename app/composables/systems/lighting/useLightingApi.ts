import type { LightingZone, LightingLocation, LightingStatusSnapshotItem } from "~/types/lighting"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import { useApiBase } from "~/composables/core/useApiBase"
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

	const getStatus = async (params?: { zoneIds?: string[] | number[] }) => {
		const query = new URLSearchParams()
		const zoneIds = params?.zoneIds ?? []
		if (zoneIds.length > 0) {
			query.set("zoneIds", zoneIds.map((id) => String(id)).join(","))
		}
		const suffix = query.toString() ? `?${query.toString()}` : ""
		return request<{ items: LightingStatusSnapshotItem[] }>(`/lighting/status${suffix}`)
	}

	const getZoneStatus = async (zoneId: string | number) => {
		return request<{ zoneId: string; items: LightingStatusSnapshotItem[] }>(
			`/lighting/zones/${zoneId}/status`
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

