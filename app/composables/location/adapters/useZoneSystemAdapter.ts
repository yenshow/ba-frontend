/**
 * 區域系統適配器 Composable
 * 處理不同系統類型的區域和地點類型轉換
 */

import type { SystemType } from "~/types/location";
import type { LightingZone, LightingLocation } from "~/types/lighting";
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment";
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess";

export type SystemZoneType =
	| LightingZone
	| EnvironmentZone
	| PeopleCountingZone
	| VehicleAccessZone;
export type SystemLocationType =
	| LightingLocation
	| EnvironmentLocation
	| PeopleCountingLocation
	| VehicleAccessLocation;

export interface SystemConfig {
	/** @deprecated 所有系統現在都支持多個地點，此配置已不再使用 */
	singleLocationPerZone?: boolean;
	requireImageUrl?: boolean;
}

export interface ZoneSystemAdapter<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType
> {
	getLocationsProperty: (zone: TZone) => TLocation[];
	setLocationsProperty: (zone: TZone, locations: TLocation[]) => TZone;
	createNewLocation: () => TLocation;
	createNewZone: (name: string) => TZone;
	filterEmptyLocations: (zone: TZone) => TZone;
	systemConfig?: SystemConfig;
	getLocationId?: (location: TLocation, zoneName?: string) => string;
}

export function useLightingZoneAdapter(): ZoneSystemAdapter<LightingZone, LightingLocation> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true
	};

	return {
		getLocationsProperty: (zone: LightingZone) => zone.locations || [],
		setLocationsProperty: (zone: LightingZone, locations: LightingLocation[]) => ({
			...zone,
			locations
		}),
		createNewLocation: (): LightingLocation => ({
			name: ""
		}),
		createNewZone: (name: string): LightingZone => ({
			name,
			locations: []
		}),
		filterEmptyLocations: (zone: LightingZone): LightingZone => ({
			...zone,
			locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
		}),
		systemConfig,
		getLocationId: (location: LightingLocation, zoneName?: string): string => {
			return location.id || `${zoneName || "unknown"}-${location.name}`;
		}
	};
}

export function useEnvironmentZoneAdapter(): ZoneSystemAdapter<
	EnvironmentZone,
	EnvironmentLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false
	};

	return {
		getLocationsProperty: (zone: EnvironmentZone) => zone.locations || [],
		setLocationsProperty: (zone: EnvironmentZone, locations: EnvironmentLocation[]) => ({
			...zone,
			locations
		}),
		createNewLocation: (): EnvironmentLocation => ({
			name: "",
			parameters: []
		}),
		createNewZone: (name: string): EnvironmentZone => ({
			name,
			locations: []
		}),
		filterEmptyLocations: (zone: EnvironmentZone): EnvironmentZone => ({
			...zone,
			locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
		}),
		systemConfig,
		getLocationId: (location: EnvironmentLocation, zoneName?: string): string => {
			return location.id || `${zoneName || "unknown"}-${location.name}`;
		}
	};
}

export function usePeopleCountingZoneAdapter(): ZoneSystemAdapter<
	PeopleCountingZone,
	PeopleCountingLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false
	};

	return {
		getLocationsProperty: (zone: PeopleCountingZone) => zone.locations || [],
		setLocationsProperty: (zone: PeopleCountingZone, locations: PeopleCountingLocation[]) => ({
			...zone,
			locations
		}),
		createNewLocation: (): PeopleCountingLocation => ({
			name: "",
			personGroupIds: []
		}),
		createNewZone: (name: string): PeopleCountingZone => ({
			name,
			locations: []
		}),
		filterEmptyLocations: (zone: PeopleCountingZone): PeopleCountingZone => ({
			...zone,
			locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
		}),
		systemConfig,
		getLocationId: (location: PeopleCountingLocation, zoneName?: string): string => {
			if (location.id) return location.id;
			if (location.locationId) return String(location.locationId);
			return `${zoneName || "unknown"}-${location.name}`;
		}
	};
}

export function useVehicleAccessZoneAdapter(): ZoneSystemAdapter<
	VehicleAccessZone,
	VehicleAccessLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false
	};

	return {
		getLocationsProperty: (zone: VehicleAccessZone) => zone.locations || [],
		setLocationsProperty: (zone: VehicleAccessZone, locations: VehicleAccessLocation[]) => ({
			...zone,
			locations
		}),
		createNewLocation: (): VehicleAccessLocation => ({
			name: ""
		}),
		createNewZone: (name: string): VehicleAccessZone => ({
			name,
			locations: []
		}),
		filterEmptyLocations: (zone: VehicleAccessZone): VehicleAccessZone => ({
			...zone,
			locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
		}),
		systemConfig,
		getLocationId: (location: VehicleAccessLocation, zoneName?: string): string => {
			if (location.id) return location.id;
			return `${zoneName || "unknown"}-${location.name}`;
		}
	};
}

export function useZoneSystemAdapter<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType
>(systemType: SystemType): ZoneSystemAdapter<TZone, TLocation> {
	switch (systemType) {
		case "lighting":
			return useLightingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		case "environment":
			return useEnvironmentZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		case "people_counting":
			return usePeopleCountingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		case "vehicle_access":
			return useVehicleAccessZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		default:
			throw new Error(`不支援的系統類型: ${systemType}`);
	}
}

