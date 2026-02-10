import type { LightingZone, LightingLocation } from "~/types/lighting";
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory";
import { useSystemLocationApiFactory } from "~/composables/systems/location/useSystemLocationApiFactory";
import {
	backendToLightingZone,
	lightingToUnifiedZone,
	lightingLocationToUnified
} from "~/utils/locationAdapter";

export interface CreateLightingZoneData {
	name: string;
	imageUrl?: string;
	locations?: Omit<LightingLocation, "id">[];
}

export interface UpdateLightingZoneData {
	name?: string;
	imageUrl?: string;
	locations?: (LightingLocation | Omit<LightingLocation, "id">)[];
}

export const useLightingApi = () => {
	const zoneApi = useSystemLocationApiFactory<LightingZone, LightingLocation>({
		systemType: "lighting",
		backendToSystemZone: backendToLightingZone,
		systemToUnifiedZone: (zone) => lightingToUnifiedZone(zone, "lighting"),
		locationToUnified: lightingLocationToUnified
	});

	const errorTrackingApi = useErrorTrackingApiFactory("/lighting/systems", "無法讀取照明設備資料");

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone,
		reportError: errorTrackingApi.reportError,
		clearError: errorTrackingApi.clearError
	};
};
