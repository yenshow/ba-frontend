import type { ElevatorZone, ElevatorLocation } from "~/types/elevator"
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory"
import { useApiBase } from "~/composables/core/useApiBase"
import { buildPathWithQuery } from "~/utils/apiUtils"
import {
	unifiedToElevatorZone,
	elevatorToUnifiedZone,
	elevatorLocationToUnified,
} from "~/utils/locationAdapter"

export const useElevatorLocationApi = () => {
	const { request } = useApiBase()

	const zoneApi = useSystemLocationApiFactory<ElevatorZone, ElevatorLocation>({
		systemType: "elevator",
		unifiedToSystemZone: unifiedToElevatorZone,
		systemToUnifiedZone: (zone) => elevatorToUnifiedZone(zone, "elevator"),
		locationToUnified: elevatorLocationToUnified,
	})

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,

		getLocations: async (zoneId?: string) => {
			const params: Record<string, unknown> = {}
			if (zoneId) params.zoneId = zoneId
			const path = buildPathWithQuery("/elevator/locations", params)
			return request<{ locations: ElevatorLocation[] }>(path)
		},

		createLocation: async (data: {
			name: string
			zoneId: number
			deviceIds: number[]
			logDisplayColumns?: string[]
		}) => {
			return request<{ message: string; location: ElevatorLocation }>("/elevator/locations", {
				method: "POST",
				body: data,
			})
		},

		updateLocation: async (
			id: number,
			data: Partial<{
				name: string
				deviceIds: number[]
				logDisplayColumns: string[]
			}>,
		) => {
			return request<{ message: string; location: ElevatorLocation }>(`/elevator/locations/${id}`, {
				method: "PUT",
				body: data,
			})
		},

		deleteLocation: async (id: number) => {
			return request<{ message: string }>(`/elevator/locations/${id}`, {
				method: "DELETE",
			})
		},
	}
}
