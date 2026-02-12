/**
 * 車輛進出地點 API（統一 location API，systemType: vehicle_access）
 */

import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess";
import { useSystemLocationApiFactory } from "~/composables/systems/location/useSystemLocationApiFactory";
import {
	unifiedToVehicleAccessZone,
	vehicleAccessToUnifiedZone,
	vehicleAccessLocationToUnified
} from "~/utils/locationAdapter";
import type { UnifiedZone } from "~/types/location";

export const useVehicleAccessLocationApi = () => {
	const zoneApi = useSystemLocationApiFactory<VehicleAccessZone, VehicleAccessLocation>({
		systemType: "vehicle_access",
		unifiedToSystemZone: (zone: UnifiedZone) => unifiedToVehicleAccessZone(zone),
		systemToUnifiedZone: zone => vehicleAccessToUnifiedZone(zone, "vehicle_access"),
		locationToUnified: (loc, systemType) => vehicleAccessLocationToUnified(loc, systemType)
	});

	return {
		getZones: zoneApi.getZones,
		getZone: zoneApi.getZone,
		createZone: zoneApi.createZone,
		updateZone: zoneApi.updateZone,
		deleteZone: zoneApi.deleteZone
	};
};
