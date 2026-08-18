import { computed, type MaybeRefOrGetter, toValue } from "vue"
import type { AccessSecuritySiteZone } from "~/types/accessSecurity"
import { groupAccessSecurityLocationsByFloor } from "~/utils/accessSecurityFloor"

export const useAccessSecurityZoneView = (options: {
	zones: MaybeRefOrGetter<AccessSecuritySiteZone[]>
	selectedZoneId: MaybeRefOrGetter<number | null>
}) => {
	const selectedZone = computed(() => {
		const id = toValue(options.selectedZoneId)
		if (id == null) return null
		return toValue(options.zones).find((z) => z.id === id) ?? null
	})

	const zoneLocations = computed(() => selectedZone.value?.locations || [])
	const groupedFloors = computed(() =>
		groupAccessSecurityLocationsByFloor(zoneLocations.value)
	)

	const findLocation = (locationId: number | null | undefined) => {
		if (locationId == null) return null
		return zoneLocations.value.find((loc) => loc.id === locationId) ?? null
	}

	return {
		selectedZone,
		zoneLocations,
		groupedFloors,
		findLocation,
	}
}
