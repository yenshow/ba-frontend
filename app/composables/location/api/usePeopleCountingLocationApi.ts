import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useSystemLocationApiFactory } from "~/composables/location/api/useSystemLocationApiFactory";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { logger } from "~/utils/logger";
import {
	unifiedToPeopleCountingZone,
	peopleCountingToUnifiedZone,
	peopleCountingLocationToUnified
} from "~/utils/locationAdapter";

const peopleCountingLogger = logger.createLogger("PeopleCounting");

const locationNameCache = new Map<number, string | null>();

export interface CreatePeopleCountingZoneData {
	name: string;
	locations?: Omit<PeopleCountingLocation, "id">[];
}

export interface UpdatePeopleCountingZoneData {
	name?: string;
	locations?: (PeopleCountingLocation | Omit<PeopleCountingLocation, "id">)[];
}

export const usePeopleCountingLocationApi = () => {
	const locationApi = useLocationApi();
	const { request } = useApiBase();

	const zoneApi = useSystemLocationApiFactory<PeopleCountingZone, PeopleCountingLocation>({
		systemType: "people_counting",
		unifiedToSystemZone: unifiedToPeopleCountingZone,
		systemToUnifiedZone: zone => peopleCountingToUnifiedZone(zone, "people_counting"),
		locationToUnified: peopleCountingLocationToUnified
	});

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,

		getLocations: async (zoneId?: string) => {
			const params: Record<string, unknown> = {};
			if (zoneId) params.zoneId = zoneId;

			const path = buildPathWithQuery("/people-counting/locations", params);
			return await request<{ locations: PeopleCountingLocation[] }>(path);
		},

		getLocation: async (id: string) => {
			return await request<{ location: PeopleCountingLocation }>(`/people-counting/locations/${id}`);
		},

		createLocation: async (data: {
			name: string;
			zoneId: string;
			personGroupIds: number[];
			entryDoorId: number;
			exitDoorId: number;
		}) => {
			return await request<{ message: string; location: PeopleCountingLocation }>(
				"/people-counting/locations",
				{
					method: "POST",
					body: JSON.stringify(data)
				}
			);
		},

		updateLocation: async (
			id: string,
			data: {
				name?: string;
				personGroupIds?: number[];
				entryDoorId?: number;
				exitDoorId?: number;
			}
		) => {
			return await request<{ message: string; location: PeopleCountingLocation }>(
				`/people-counting/locations/${id}`,
				{
					method: "PUT",
					body: JSON.stringify(data)
				}
			);
		},

		deleteLocation: async (id: string) => {
			return await request<{ message: string }>(`/people-counting/locations/${id}`, {
				method: "DELETE"
			});
		},

		getLocationName: async (locationId: number): Promise<string | null> => {
			if (locationNameCache.has(locationId)) {
				return locationNameCache.get(locationId) || null;
			}

			try {
				const zonesResponse = await locationApi.getZones("people_counting");
				const zones = zonesResponse.zones.map(zone => unifiedToPeopleCountingZone(zone));

				for (const zone of zones) {
					for (const location of zone.locations || []) {
						if (location.personGroupIds?.includes(locationId)) {
							locationNameCache.set(locationId, location.name);
							return location.name;
						}
						if (location.id === String(locationId)) {
							locationNameCache.set(locationId, location.name);
							return location.name;
						}
					}
				}

				locationNameCache.set(locationId, null);
				return null;
			} catch (error) {
				peopleCountingLogger.error("取得地點名稱失敗", { locationId, error });
				return null;
			}
		}
	};
};

