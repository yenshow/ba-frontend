import type { Ref } from "vue"
import type { LightingZone } from "~/types/lighting"
import { findLocationInZonesByUiKey, getLocationUiKey } from "~/utils/locationUiId"
import { useLightingApi } from "~/composables/systems/lighting/useLightingApi"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

export const useLightingZonePersistence = (
	lightingZones: Ref<LightingZone[]>,
	selectedCategory: Ref<string>,
	locationStatuses: Ref<
		Record<string, { isRunning: boolean; status: "normal" | "warning" | "error" }>
	>,
	isEditMode: Ref<boolean>
) => {
	const lightingApi = useLightingApi()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const handleDeleteCategory = async (locationId: string) => {
		if (!isEditMode.value) return
		if (!confirm("確定要刪除這個點位嗎？")) return

		try {
			const found = findLocationInZonesByUiKey(lightingZones.value, locationId)
			if (!found) {
				throw new Error("找不到要刪除的點位")
			}

			const { zone: targetZone, locationIndex: targetLocationIndex } = found

			const updatedLocations = targetZone.locations.filter(
				(_, index) => index !== targetLocationIndex
			)

			const result = await lightingApi.updateZone(targetZone.id!, {
				name: targetZone.name,
				imageUrl: targetZone.imageUrl,
				locations: updatedLocations,
			})

			const index = lightingZones.value.findIndex((z) => z.id === targetZone.id)
			if (index > -1) {
				lightingZones.value[index] = result.zone
			}

			if (selectedCategory.value === locationId) {
				selectedCategory.value = ""
			}
			delete locationStatuses.value[locationId]

			toast.success("點位已刪除")
		} catch (error) {
			handleError(error, "刪除點位失敗")
		}
	}

	const saveLocationPosition = async (locationId: string, x: number, y: number) => {
		const found = findLocationInZonesByUiKey(lightingZones.value, locationId)
		if (!found) return

		const { zone: targetZone, locationIndex: targetLocationIndex } = found

		const updatedLocations = targetZone.locations.map((location, index) => {
			if (index === targetLocationIndex) {
				return { ...location, location: { x, y } }
			}
			return location
		})

		try {
			const result = await lightingApi.updateZone(targetZone.id!, {
				name: targetZone.name,
				imageUrl: targetZone.imageUrl,
				locations: updatedLocations,
			})

			const index = lightingZones.value.findIndex((z) => z.id === targetZone.id)
			if (index > -1) {
				lightingZones.value[index] = result.zone
			}
		} catch (error) {
			handleError(error, "更新位置失敗")
		}
	}

	const saveBatchPositions = async (
		updates: Array<{ id: string; location: { x: number; y: number } }>
	) => {
		try {
			const updatesByZone = new Map<string, typeof updates>()
			for (const update of updates) {
				for (const zone of lightingZones.value) {
					const locationIndex = zone.locations.findIndex(
						(location, idx) => getLocationUiKey({ zone, location, locationIndex: idx }) === update.id
					)
					if (locationIndex !== -1) {
						const zoneId = zone.id || zone.name
						if (!updatesByZone.has(zoneId)) {
							updatesByZone.set(zoneId, [])
						}
						updatesByZone.get(zoneId)!.push(update)
						break
					}
				}
			}

			for (const [zoneId, zoneUpdates] of updatesByZone.entries()) {
				const zone = lightingZones.value.find((z) => (z.id || z.name) === zoneId)
				if (!zone) continue

				const updatedLocations = zone.locations.map((location, index) => {
					const locId = getLocationUiKey({ zone, location, locationIndex: index })
					const u = zoneUpdates.find((item) => item.id === locId)
					if (u) {
						return { ...location, location: u.location }
					}
					return location
				})

				const result = await lightingApi.updateZone(zone.id!, {
					name: zone.name,
					imageUrl: zone.imageUrl,
					locations: updatedLocations,
				})

				const index = lightingZones.value.findIndex((z) => z.id === zone.id)
				if (index > -1) {
					lightingZones.value[index] = result.zone
				}
			}
		} catch (error) {
			handleError(error, "批次更新位置失敗")
			throw error
		}
	}

	return {
		handleDeleteCategory,
		saveLocationPosition,
		saveBatchPositions,
	}
}
