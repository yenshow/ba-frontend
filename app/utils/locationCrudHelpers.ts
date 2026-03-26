export { removeLocationFromSystemOrDelete } from "~/services/location/locationService"

import type { SystemType, LocationSystemInput } from "~/types/location"
import { useLocationApi } from "~/composables/location/api/useLocationApi"

export type RemoveLocationResult =
	| { action: "no-op"; reason: "missing-id" }
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

	if (!args.systemType) {
		await locationApi.deleteLocation(id)
		return { action: "deleted" }
	}

	const { location: fullLocation } = await locationApi.getLocation(id)
	const otherSystems = (fullLocation.systems || []).filter((s) => s.systemType !== args.systemType)
	if (otherSystems.length === 0) {
		await locationApi.deleteLocation(id)
		return { action: "deleted" }
	}

	await locationApi.updateLocation(id, { systems: otherSystems })
	return { action: "updated", systems: otherSystems }
}

