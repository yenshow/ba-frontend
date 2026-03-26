export type ZoneUiKeyable = { id?: string | null; name?: string | null }

export type LocationUiKeyable = { id?: string | null }

export type LocationUiKeyParts<TZone extends ZoneUiKeyable, TLocation extends LocationUiKeyable> = {
	zone: TZone
	location: TLocation
	locationIndex: number
}

/**
 * UI 層用的 zone key（不等於 DB id；只用於組合 location 的 fallback key）
 */
export const getZoneUiKey = (zone: ZoneUiKeyable | null | undefined): string => {
	if (!zone) return "unknown-zone"
	if (zone.id != null && String(zone.id).trim() !== "") return String(zone.id)
	if (zone.name != null && String(zone.name).trim() !== "") return String(zone.name)
	return "unknown-zone"
}

/**
 * UI 層用的 location key：
 * - 優先使用 DB id（最穩定）
 * - 未存檔時 fallback：`location-${zoneKey}-${index}`（避免 rename 造成 key 改變）
 */
export const getLocationUiKey = <TZone extends ZoneUiKeyable, TLocation extends LocationUiKeyable>(
	parts: LocationUiKeyParts<TZone, TLocation>
): string => {
	const id = parts.location?.id
	if (id != null && String(id).trim() !== "") return String(id)
	return `location-${getZoneUiKey(parts.zone)}-${parts.locationIndex}`
}

export type ZoneWithLocations<TLocation extends LocationUiKeyable> = ZoneUiKeyable & {
	locations: TLocation[]
}

export const findLocationIndexInZone = <TLocation extends LocationUiKeyable>(
	zone: ZoneWithLocations<TLocation>,
	targetLocation: TLocation
): number => {
	return (zone.locations || []).findIndex((location) => {
		const a = location?.id
		const b = targetLocation?.id
		if (a != null && b != null && String(a) !== "" && String(b) !== "") return String(a) === String(b)
		return location === targetLocation
	})
}

export const findLocationInZonesByUiKey = <
	TLocation extends LocationUiKeyable,
	TZone extends ZoneWithLocations<TLocation>,
>(
	zones: TZone[] | null | undefined,
	locationUiKey: string,
	options?: { requireDbId?: boolean }
): { zone: TZone; location: TLocation; locationIndex: number } | null => {
	if (!zones?.length) return null
	if (!locationUiKey) return null

	for (const zone of zones) {
		const locs = zone.locations || []
		for (let i = 0; i < locs.length; i++) {
			const location = locs[i]!
			const computed = getLocationUiKey({ zone, location, locationIndex: i })
			if (computed !== locationUiKey) continue
			if (options?.requireDbId && !location.id) continue
			return { zone, location, locationIndex: i }
		}
	}

	return null
}

