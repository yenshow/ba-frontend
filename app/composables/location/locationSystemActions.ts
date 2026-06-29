import type { SystemType, LocationSystemInput, UnifiedLocation } from "~/types/location"
import { useLocationApi } from "~/composables/location/api/useLocationApi"

export type RemoveLocationResult =
	| { action: "no-op"; reason: "missing-id" | "not-in-system" }
	| { action: "deleted" }
	| { action: "updated"; systems: LocationSystemInput[] }

/**
 * 地點刪除（統一規則，見 docs/50-systems/zone-location-system.md §11.1）：
 * - 未存檔（無 id）：不呼叫 API
 * - 有 id + 有 systemType：只移除該 system；若移除後無系統，刪整筆
 * - 有 id + 無 systemType：刪整筆
 */
export const removeLocationFromSystemOrDelete = async (args: {
	locationId: string | null | undefined
	systemType?: SystemType
}): Promise<RemoveLocationResult> => {
	const id = args.locationId ? String(args.locationId) : ""
	if (!id) return { action: "no-op", reason: "missing-id" }

	const locationApi = useLocationApi()
	const { systemType } = args

	if (!systemType) {
		await locationApi.deleteLocation(id)
		return { action: "deleted" }
	}

	const { location: fullLocation } = await locationApi.getLocation(id)
	const hasTargetSystem = (fullLocation.systems || []).some((s) => s.systemType === systemType)
	if (!hasTargetSystem) {
		return { action: "no-op", reason: "not-in-system" }
	}

	const otherSystems = (fullLocation.systems || []).filter((s) => s.systemType !== systemType)
	if (otherSystems.length === 0) {
		await locationApi.deleteLocation(id, systemType)
		return { action: "deleted" }
	}

	await locationApi.updateLocation(id, { systems: otherSystems }, systemType)
	return { action: "updated", systems: otherSystems }
}

export type DeleteZoneResult =
	| { action: "deleted-zone" }
	| { action: "removed-system-from-zone"; remainingLocations: UnifiedLocation[] }

/**
 * 區域刪除（統一規則，見 docs/50-systems/zone-location-system.md §11.2）：
 * - 無 systemType：直接刪除整個區域
 * - 有 systemType：
 *   - 若該區域只有當前 systemType 使用 → 刪除整個區域
 *   - 否則 → 更新區域 locations，移除當前 systemType；若地點 systems 變空則移除該地點
 */
export const deleteZoneWithSystemAwareness = async (args: {
	zoneId: string
	systemType?: SystemType
}): Promise<DeleteZoneResult> => {
	const zoneId = String(args.zoneId || "").trim()
	if (!zoneId) {
		throw new Error("zoneId 不能為空")
	}

	// 未存檔（temp-）的區域不應打後端 API；由呼叫端自行做本地移除
	if (zoneId.startsWith("temp-")) {
		return { action: "deleted-zone" }
	}

	const locationApi = useLocationApi()

	if (!args.systemType) {
		await locationApi.deleteZone(zoneId);
		return { action: "deleted-zone" };
	}

	const { zone: fullZone } = await locationApi.getZone(zoneId)

	const allSystemTypes = new Set<SystemType>()
	for (const location of fullZone.locations || []) {
		for (const system of location.systems || []) {
			allSystemTypes.add(system.systemType)
		}
	}

	const isOnlyCurrentSystem =
		allSystemTypes.size === 1 && allSystemTypes.has(args.systemType)

	const remainingLocations: UnifiedLocation[] =
		(fullZone.locations || [])
			.map((location) => {
				const filteredSystems = (location.systems || []).filter(
					(system) => system.systemType !== args.systemType
				)
				if (filteredSystems.length === 0) return null
				return { ...location, systems: filteredSystems } as UnifiedLocation
			})
			.filter((location): location is UnifiedLocation => location !== null)

	if (isOnlyCurrentSystem || remainingLocations.length === 0) {
		await locationApi.deleteZone(zoneId, args.systemType)
		return { action: "deleted-zone" }
	}

	await locationApi.updateZone(zoneId, { locations: remainingLocations }, args.systemType)
	return { action: "removed-system-from-zone", remainingLocations }
}
