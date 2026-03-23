import type { LightingLocation, LightingZone } from "~/types/lighting"

/** 與 StatusCenter / 照明頁共用：地點穩定 ID */
export const getLightingLocationId = (
	zone: LightingZone,
	location: LightingLocation,
	locationIndex: number
): string => {
	return location.id || `location-${zone.id || zone.name}-${locationIndex}`
}

export const isValidLightingMapPosition = (
	location: { x: number; y: number } | undefined | null
): boolean => {
	return (
		location !== undefined &&
		location !== null &&
		typeof location.x === "number" &&
		typeof location.y === "number" &&
		!isNaN(location.x) &&
		!isNaN(location.y)
	)
}

export const findLightingLocationIndexInZone = (
	zone: LightingZone,
	targetLocation: LightingLocation
): number => {
	return zone.locations.findIndex((location) => {
		if (location.id && targetLocation.id) return location.id === targetLocation.id
		return location === targetLocation
	})
}

export const findLightingLocationById = (
	zones: LightingZone[],
	locationId: string,
	requireDbId = false
): { location: LightingLocation; zone: LightingZone; locationIndex: number } | null => {
	for (const zone of zones) {
		for (let i = 0; i < zone.locations.length; i++) {
			const location = zone.locations[i]
			const computedLocationId = getLightingLocationId(zone, location, i)
			if (computedLocationId === locationId) {
				if (requireDbId && !location.id) continue
				return { location, zone, locationIndex: i }
			}
		}
	}
	return null
}
