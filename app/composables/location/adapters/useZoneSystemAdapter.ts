/**
 * 區域系統適配器（工地：environment、people_counting、vehicle_access）
 */

import type { SystemType } from "~/types/location"
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment"
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting"
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess"
import { getLocationUiKey } from "~/utils/locationUiId"

export type SystemZoneType = EnvironmentZone | PeopleCountingZone | VehicleAccessZone
export type SystemLocationType =
	| EnvironmentLocation
	| PeopleCountingLocation
	| VehicleAccessLocation

export interface SystemConfig {
	/** @deprecated 所有系統現在都支持多個地點 */
	singleLocationPerZone?: boolean
	requireImageUrl?: boolean
}

export interface ZoneSystemAdapter<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType,
> {
	getLocationsProperty: (zone: TZone) => TLocation[]
	setLocationsProperty: (zone: TZone, locations: TLocation[]) => TZone
	createNewLocation: () => TLocation
	createNewZone: (name: string) => TZone
	filterEmptyLocations: (zone: TZone) => TZone
	systemConfig?: SystemConfig
	getLocationId?: (args: { zone: TZone; location: TLocation; locationIndex: number }) => string
}

export function useEnvironmentZoneAdapter(): ZoneSystemAdapter<
	EnvironmentZone,
	EnvironmentLocation
> {
	return {
		getLocationsProperty: (zone) => zone.locations || [],
		setLocationsProperty: (zone, locations) => ({ ...zone, locations }),
		createNewLocation: () => ({
			name: "",
			parameters: [],
		}),
		createNewZone: (name) => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone) => ({
			...zone,
			locations: (zone.locations || []).filter((loc) => loc.name && loc.name.trim().length > 0),
		}),
		systemConfig: { requireImageUrl: false },
		getLocationId: ({ zone, location, locationIndex }) =>
			getLocationUiKey({ zone, location, locationIndex }),
	}
}

export function usePeopleCountingZoneAdapter(): ZoneSystemAdapter<
	PeopleCountingZone,
	PeopleCountingLocation
> {
	return {
		getLocationsProperty: (zone) => zone.locations || [],
		setLocationsProperty: (zone, locations) => ({ ...zone, locations }),
		createNewLocation: () => ({
			name: "",
			personGroupIds: [],
		}),
		createNewZone: (name) => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone) => ({
			...zone,
			locations: (zone.locations || []).filter((loc) => loc.name && loc.name.trim().length > 0),
		}),
		systemConfig: { requireImageUrl: false },
		getLocationId: ({ zone, location, locationIndex }) =>
			getLocationUiKey({ zone, location, locationIndex }),
	}
}

export function useVehicleAccessZoneAdapter(): ZoneSystemAdapter<
	VehicleAccessZone,
	VehicleAccessLocation
> {
	return {
		getLocationsProperty: (zone) => zone.locations || [],
		setLocationsProperty: (zone, locations) => ({ ...zone, locations }),
		createNewLocation: () => ({
			name: "",
			vehicleGroupIds: [],
		}),
		createNewZone: (name) => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone) => ({
			...zone,
			locations: (zone.locations || []).filter((loc) => loc.name && loc.name.trim().length > 0),
		}),
		systemConfig: { requireImageUrl: false },
		getLocationId: ({ zone, location, locationIndex }) =>
			getLocationUiKey({ zone, location, locationIndex }),
	}
}

export function useZoneSystemAdapter<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType,
>(systemType: SystemType): ZoneSystemAdapter<TZone, TLocation> {
	switch (systemType) {
		case "environment":
			return useEnvironmentZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "people_counting":
			return usePeopleCountingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "vehicle_access":
			return useVehicleAccessZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		default:
			throw new Error(`工地前端不支援的區域系統類型: ${systemType}`)
	}
}
