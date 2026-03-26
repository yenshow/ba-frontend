/**
 * 系統地點 API 工廠函數
 * 統一處理所有系統的區域管理 API，減少代碼重複
 */

import type { SystemType, UnifiedZone, UnifiedLocationInput } from "~/types/location";
import type { SystemZoneType, SystemLocationType } from "~/composables/location/adapters/useZoneSystemAdapter";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { buildUnifiedZoneUpdateData, mergeFullZoneWithSystemUpdate } from "~/utils/locationAdapter";

/**
 * 系統 API 配置
 */
export interface SystemApiConfig<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType
> {
	systemType: SystemType;
	unifiedToSystemZone: (zone: UnifiedZone) => TZone;
	systemToUnifiedZone: (
		zone: Omit<TZone, "id"> & { locations?: (TLocation | Omit<TLocation, "id">)[] }
	) => Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] };
	locationToUnified: (
		location: TLocation | Omit<TLocation, "id">,
		systemType: SystemType
	) => UnifiedLocationInput;
}

export type CreateZoneData<TZone extends SystemZoneType> = Omit<TZone, "id">;
export type UpdateZoneData<TZone extends SystemZoneType> = Partial<TZone>;

export function useSystemLocationApiFactory<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType
>(config: SystemApiConfig<TZone, TLocation>) {
	const locationApi = useLocationApi();

	return {
		getZones: async () => {
			const response = await locationApi.getZones(config.systemType);
			return {
				zones: response.zones.map(zone => config.unifiedToSystemZone(zone))
			};
		},

		getZone: async (id: string) => {
			const response = await locationApi.getZone(id, config.systemType);
			return {
				zone: config.unifiedToSystemZone(response.zone)
			};
		},

		createZone: async (data: CreateZoneData<TZone>) => {
			const zoneData = data as Omit<TZone, "id"> & {
				locations?: (TLocation | Omit<TLocation, "id">)[];
			};
			const unifiedData = config.systemToUnifiedZone(zoneData);
			const response = await locationApi.createZone(unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: config.unifiedToSystemZone(response.zone)
			};
		},

		updateZone: async (id: string, data: UpdateZoneData<TZone>) => {
			const hasLocations = "locations" in data && Array.isArray(data.locations);
			let unifiedData: Parameters<typeof locationApi.updateZone>[1];

			if (hasLocations) {
				const fullZoneResponse = await locationApi.getZone(id);
				const fullZone = fullZoneResponse.zone;
				unifiedData = mergeFullZoneWithSystemUpdate(fullZone, data as Partial<TZone>, {
					systemType: config.systemType,
					locationConverter: config.locationToUnified
				});
			} else {
				unifiedData = buildUnifiedZoneUpdateData(data, {
					systemType: config.systemType,
					locationConverter: config.locationToUnified
				});
			}

			const response = await locationApi.updateZone(id, unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: config.unifiedToSystemZone(response.zone)
			};
		},

		deleteZone: locationApi.deleteZone
	};
}

