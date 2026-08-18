import type { SystemType, LocationSystemInput, UnifiedLocation } from "~/types/location"
import { useLocationApi } from "~/composables/location/api/useLocationApi"

export type RemoveLocationResult =
	| { action: "no-op"; reason: "missing-id" | "not-in-system" }
	| { action: "deleted" }
	| { action: "updated"; systems: LocationSystemInput[] }

/**
 * 地點刪除（統一規則，見 docs/40-systems/zone-location-system.md §4）：
 * - 未存檔（無 id）：不呼叫 API
 * - 有 id + 有 systemType：只移除該 system；若移除後無系統，刪整筆
 * - 有 id + 無 systemType + allowedSystemTypes：只移除允許清單內的系統
 * - 有 id + 無 systemType：刪整筆
 */
export const removeLocationFromSystemOrDelete = async (args: {
	locationId: string | null | undefined
	systemType?: SystemType
	allowedSystemTypes?: SystemType[]
}): Promise<RemoveLocationResult> => {
	const id = args.locationId ? String(args.locationId) : ""
	if (!id) return { action: "no-op", reason: "missing-id" }

	const locationApi = useLocationApi()
	const { systemType, allowedSystemTypes } = args

	if (!systemType && allowedSystemTypes?.length) {
		const { location: fullLocation } = await locationApi.getLocation(id)
		const allowed = new Set(allowedSystemTypes)
		const targets = (fullLocation.systems || [])
			.map((s) => s.systemType)
			.filter((t) => allowed.has(t))
		if (targets.length === 0) return { action: "no-op", reason: "not-in-system" }

		let last: RemoveLocationResult = { action: "no-op", reason: "not-in-system" }
		for (const target of targets) {
			last = await removeLocationFromSystemOrDelete({ locationId: id, systemType: target })
			if (last.action === "deleted" || last.action === "no-op") break
		}
		return last
	}

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

	await locationApi.updateLocation(id, { systems: [] }, systemType)
	return { action: "updated", systems: otherSystems }
}

export type DeleteZoneResult =
	| { action: "deleted-zone" }
	| { action: "removed-system-from-zone"; remainingLocations: UnifiedLocation[] }

/**
 * 區域刪除（統一規則，見 docs/40-systems/zone-location-system.md §4）：
 * - 無 systemType + allowedSystemTypes：逐一移除允許清單內系統
 * - 無 systemType：直接刪除整個區域
 * - 有 systemType：
 *   - 若該區域只有當前 systemType 使用 → 刪除整個區域
 *   - 否則 → 更新區域 locations，移除當前 systemType；若地點 systems 變空則移除該地點
 */
export const deleteZoneWithSystemAwareness = async (args: {
	zoneId: string
	systemType?: SystemType
	allowedSystemTypes?: SystemType[]
}): Promise<DeleteZoneResult> => {
	const zoneId = String(args.zoneId || "").trim()
	if (!zoneId) {
		throw new Error("zoneId 不能為空")
	}

	if (zoneId.startsWith("temp-")) {
		return { action: "deleted-zone" }
	}

	const locationApi = useLocationApi()

	if (!args.systemType && args.allowedSystemTypes?.length) {
		const { zone: fullZone } = await locationApi.getZone(zoneId)
		const allowed = new Set(args.allowedSystemTypes)
		const targets = new Set<SystemType>()
		for (const location of fullZone.locations || []) {
			for (const system of location.systems || []) {
				if (allowed.has(system.systemType)) targets.add(system.systemType)
			}
		}
		if (targets.size === 0) {
			return { action: "removed-system-from-zone", remainingLocations: fullZone.locations || [] }
		}

		let last: DeleteZoneResult = {
			action: "removed-system-from-zone",
			remainingLocations: fullZone.locations || [],
		}
		for (const target of targets) {
			last = await deleteZoneWithSystemAwareness({ zoneId, systemType: target })
			if (last.action === "deleted-zone") return last
		}
		return last
	}

	if (!args.systemType) {
		await locationApi.deleteZone(zoneId)
		return { action: "deleted-zone" }
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

	const remainingLocations: UnifiedLocation[] = (fullZone.locations || [])
		.map((location) => {
			const filteredSystems = (location.systems || []).filter(
				(system) => system.systemType !== args.systemType,
			)
			if (filteredSystems.length === 0) return null
			return { ...location, systems: filteredSystems } as UnifiedLocation
		})
		.filter((location): location is UnifiedLocation => location !== null)

	if (isOnlyCurrentSystem) {
		await locationApi.deleteZone(zoneId, args.systemType)
		return { action: "deleted-zone" }
	}

	// 僅送含目標系統的地點；systems: [] 觸發後端依 locationType 移除該系統（保留其他系統）
	const locationsToStripSystem: UnifiedLocation[] = (fullZone.locations || [])
		.filter((location) =>
			(location.systems || []).some((system) => system.systemType === args.systemType),
		)
		.map((location) => ({ ...location, systems: [] }) as UnifiedLocation)

	if (locationsToStripSystem.length === 0) {
		return { action: "removed-system-from-zone", remainingLocations }
	}

	await locationApi.updateZone(
		zoneId,
		{ locations: locationsToStripSystem },
		args.systemType,
	)
	return { action: "removed-system-from-zone", remainingLocations }
}
