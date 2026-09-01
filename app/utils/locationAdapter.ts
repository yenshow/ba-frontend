/**
 * 工地前端地點／區域轉換（environment、people_counting、vehicle_access）
 *
 * 與 Central 全檔鏡像不同：Construction 僅實作 4 鍵 feature 中具地點 SSOT 的 3 系統。
 * 共用後端若同一地點含 Central 系統，`mergeFullZoneWithSystemUpdate` 會原樣保留其 systems。
 */

import type {
	UnifiedZone,
	UnifiedLocation,
	SystemType,
	SystemConfig,
	EnvironmentSystemConfig,
	PeopleCountingSystemConfig,
	VehicleAccessSystemConfig,
	LocationSystem,
	UnifiedLocationInput,
} from "~/types/location"
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment"
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting"
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess"
import { pickSortOrder } from "~/utils/sortOrder"
import {
	normalizeLogDisplayColumns,
	toStoredLogDisplayColumns,
} from "~/utils/peopleCountingLogColumns"
import { normalizeFaceSimilarityThreshold } from "~/utils/peopleCountingFaceThreshold"
import {
	normalizeVehicleLogDisplayColumns,
	toStoredVehicleLogDisplayColumns,
} from "~/utils/vehicleAccessLogColumns"

function isEnvironmentSystemConfig(config: unknown): config is EnvironmentSystemConfig {
	if (!config || typeof config !== "object") return false
	const c = config as Record<string, unknown>
	return "parameters" in c && Array.isArray(c.parameters)
}

function isPeopleCountingSystemConfig(config: unknown): config is PeopleCountingSystemConfig {
	if (!config || typeof config !== "object") return false
	const c = config as Record<string, unknown>
	if ("personGroupIds" in c && Array.isArray(c.personGroupIds)) return true
	if (c.dataSource === "isapi_camera" || c.dataSource === "access_control") return true
	if ("cameraDeviceIds" in c && Array.isArray((c as { cameraDeviceIds?: unknown }).cameraDeviceIds))
		return true
	if (
		"entryCameraDeviceIds" in c &&
		Array.isArray((c as { entryCameraDeviceIds?: unknown }).entryCameraDeviceIds)
	)
		return true
	if ("entryDoorIds" in c || "exitDoorIds" in c) return true
	if ("entryDeviceIds" in c || "exitDeviceIds" in c) return true
	return false
}

function isVehicleAccessSystemConfig(config: unknown): config is VehicleAccessSystemConfig {
	if (!config || typeof config !== "object") return false
	const c = config as Record<string, unknown>
	return (
		"entryLaneId" in c ||
		"exitLaneId" in c ||
		"dataSource" in c ||
		"entryCameraDeviceIds" in c ||
		"exitCameraDeviceIds" in c ||
		"vehicleGroupIds" in c ||
		"logDisplayColumns" in c
	)
}

export function unifiedToEnvironmentZone(zone: UnifiedZone): EnvironmentZone {
	return {
		id: zone.id,
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.flatMap((loc) => {
			const envSystem = loc.systems.find((s) => s.systemType === "environment")
			if (!envSystem || !isEnvironmentSystemConfig(envSystem.config)) {
				return []
			}

			const cfg = envSystem.config
			const deviceIds = Array.isArray(cfg.deviceIds)
				? cfg.deviceIds
				: cfg.deviceId != null
					? [cfg.deviceId]
					: []
			return [
				{
					id: loc.id,
					systemId: envSystem.id,
					name: loc.name,
					...pickSortOrder(loc.sortOrder),
					deviceId: cfg.deviceId ?? deviceIds[0],
					deviceIds: deviceIds.length ? deviceIds : undefined,
					parameters: cfg.parameters || [],
				} as EnvironmentLocation,
			]
		}),
	}
}

export function environmentToUnifiedZone(
	zone: EnvironmentZone,
	systemType: SystemType = "environment"
): Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] } {
	return {
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.map((loc) => environmentLocationToUnified(loc, systemType)),
	}
}

export function unifiedToPeopleCountingZone(zone: UnifiedZone): PeopleCountingZone {
	return {
		id: zone.id,
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.flatMap((loc) => {
			const pcSystem = loc.systems.find((s) => s.systemType === "people_counting")
			if (!pcSystem || !isPeopleCountingSystemConfig(pcSystem.config)) {
				return []
			}
			const config = pcSystem.config as PeopleCountingSystemConfig
			return [
				{
					id: loc.id,
					name: loc.name,
					...pickSortOrder(loc.sortOrder),
					personGroupIds: config.personGroupIds || [],
					entryDoorIds: Array.isArray(config.entryDoorIds) ? config.entryDoorIds : [],
					exitDoorIds: Array.isArray(config.exitDoorIds) ? config.exitDoorIds : [],
					dataSource: config.dataSource ?? "yscp",
					entryDeviceIds: Array.isArray(config.entryDeviceIds) ? config.entryDeviceIds : [],
					exitDeviceIds: Array.isArray(config.exitDeviceIds) ? config.exitDeviceIds : [],
					cameraDeviceIds: Array.isArray(config.cameraDeviceIds)
						? config.cameraDeviceIds
						: undefined,
					entryCameraDeviceIds: Array.isArray(config.entryCameraDeviceIds)
						? config.entryCameraDeviceIds
						: undefined,
					exitCameraDeviceIds: Array.isArray(config.exitCameraDeviceIds)
						? config.exitCameraDeviceIds
						: undefined,
					cameraMode: config.cameraMode ?? undefined,
					faceSimilarityThreshold:
						config.faceSimilarityThreshold != null
							? normalizeFaceSimilarityThreshold(config.faceSimilarityThreshold)
							: undefined,
					preferRegion: config.preferRegion ?? undefined,
					accessControlGroups: config.accessControlGroups || [],
					entryEventCameraDeviceId: config.entryEventCameraDeviceId ?? undefined,
					exitEventCameraDeviceId: config.exitEventCameraDeviceId ?? undefined,
					logDisplayColumns: Array.isArray(config.logDisplayColumns)
						? config.logDisplayColumns
						: undefined,
				} as PeopleCountingLocation,
			]
		}),
	}
}

export function peopleCountingToUnifiedZone(
	zone: PeopleCountingZone,
	systemType: SystemType = "people_counting"
): Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] } {
	return {
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.map((loc) => peopleCountingLocationToUnified(loc, systemType)),
	}
}

export function unifiedToVehicleAccessZone(zone: UnifiedZone): VehicleAccessZone {
	return {
		id: zone.id,
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.flatMap((loc) => {
			const vaSystem = loc.systems.find((s) => s.systemType === "vehicle_access")
			if (!vaSystem || !isVehicleAccessSystemConfig(vaSystem.config)) {
				return []
			}

			return [
				{
					id: loc.id,
					name: loc.name,
					...pickSortOrder(loc.sortOrder),
					dataSource: vaSystem.config.dataSource ?? "yscp",
					operationMode: vaSystem.config.operationMode ?? "construction_flow",
					statsEpochStartedAt: vaSystem.config.statsEpochStartedAt,
					statsResetAt: vaSystem.config.statsResetAt,
					parkingCapacity: vaSystem.config.parkingCapacity,
					entryLaneId: vaSystem.config.entryLaneId ?? undefined,
					exitLaneId: vaSystem.config.exitLaneId ?? undefined,
					entryCameraDeviceIds: vaSystem.config.entryCameraDeviceIds ?? [],
					exitCameraDeviceIds: vaSystem.config.exitCameraDeviceIds ?? [],
					cameraChannelId: vaSystem.config.cameraChannelId ?? 1,
					vehicleGroupIds: vaSystem.config.vehicleGroupIds ?? [],
					logDisplayColumns: normalizeVehicleLogDisplayColumns(
						vaSystem.config.logDisplayColumns
					),
				} as VehicleAccessLocation,
			]
		}),
	}
}

export function vehicleAccessToUnifiedZone(
	zone: VehicleAccessZone,
	systemType: SystemType = "vehicle_access"
): Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] } {
	return {
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.map((loc) => vehicleAccessLocationToUnified(loc, systemType)),
	}
}

export function hasSystem(location: UnifiedLocation, systemType: SystemType): boolean {
	return location.systems.some((s) => s.systemType === systemType)
}

export function getSystem(
	location: UnifiedLocation,
	systemType: SystemType
): LocationSystem | undefined {
	return location.systems.find((s) => s.systemType === systemType)
}

export type SystemCoordinates = { x: number; y: number }

const isFiniteCoordinate = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v)

export const getSystemCoordinates = (
	location: UnifiedLocation,
	systemType: SystemType
): SystemCoordinates | null => {
	const sys = getSystem(location, systemType)
	if (!sys) return null
	const cfg = sys.config as Record<string, unknown>
	const raw = cfg.location as { x?: unknown; y?: unknown } | undefined
	if (!raw) return null
	if (!isFiniteCoordinate(raw.x) || !isFiniteCoordinate(raw.y)) return null
	return { x: raw.x, y: raw.y }
}

export const hasCoordinatesForSystem = (
	location: UnifiedLocation,
	systemType: SystemType
): boolean => getSystemCoordinates(location, systemType) != null

export const hasAnySystemCoordinates = (location: UnifiedLocation): boolean => {
	for (const s of location.systems || []) {
		if (getSystemCoordinates(location, s.systemType)) return true
	}
	return false
}

export const getLocationStyleBySystem = (
	location: UnifiedLocation,
	systemType: SystemType
): { left: string; top: string } | Record<string, never> => {
	const c = getSystemCoordinates(location, systemType)
	if (!c) return {}
	return { left: `${c.x}%`, top: `${c.y}%` }
}

export function environmentLocationToUnified(
	loc: EnvironmentLocation | Omit<EnvironmentLocation, "id">,
	systemType: SystemType = "environment"
): UnifiedLocationInput {
	const hasId = "id" in loc && loc.id
	const hasSystemId = "systemId" in loc && loc.systemId
	const deviceIds = Array.isArray(loc.deviceIds)
		? loc.deviceIds
		: loc.deviceId != null
			? [loc.deviceId]
			: []
	return {
		...(hasId && { id: loc.id! }),
		name: loc.name,
		...pickSortOrder((loc as { sortOrder?: unknown }).sortOrder),
		systems: [
			{
				...(hasSystemId && { id: loc.systemId! }),
				systemType,
				config: {
					deviceId: deviceIds[0],
					deviceIds: deviceIds.length ? deviceIds : undefined,
					parameters: loc.parameters || [],
				} as EnvironmentSystemConfig,
			},
		],
	}
}

const toStoredEventCameraDeviceId = (
	value: number | null | undefined
): number | null | undefined => {
	if (value === undefined) return undefined
	if (value === null) return null
	const n = Number(value)
	return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined
}

export function peopleCountingLocationToUnified(
	loc: PeopleCountingLocation | Omit<PeopleCountingLocation, "id">,
	systemType: SystemType = "people_counting"
): UnifiedLocationInput {
	const hasId = "id" in loc && loc.id
	const cameraDeviceIds = Array.isArray((loc as PeopleCountingLocation).cameraDeviceIds)
		? (loc as PeopleCountingLocation).cameraDeviceIds!.filter(
				(id) => typeof id === "number" && Number.isFinite(id) && id > 0
			)
		: []
	const entryCameraDeviceIds = Array.isArray((loc as PeopleCountingLocation).entryCameraDeviceIds)
		? (loc as PeopleCountingLocation).entryCameraDeviceIds!.filter(
				(id) => typeof id === "number" && Number.isFinite(id) && id > 0
			)
		: []
	const exitCameraDeviceIds = Array.isArray((loc as PeopleCountingLocation).exitCameraDeviceIds)
		? (loc as PeopleCountingLocation).exitCameraDeviceIds!.filter(
				(id) => typeof id === "number" && Number.isFinite(id) && id > 0
			)
		: []
	const isFace = loc.dataSource === "isapi_camera" && loc.cameraMode === "face_recognition"
	const pcLoc = loc as PeopleCountingLocation
	return {
		...(hasId && { id: loc.id! }),
		name: loc.name,
		...pickSortOrder((loc as { sortOrder?: unknown }).sortOrder),
		systems: [
			{
				systemType,
				config: {
					personGroupIds: loc.personGroupIds || [],
					entryDoorIds: loc.entryDoorIds || [],
					exitDoorIds: loc.exitDoorIds || [],
					dataSource: loc.dataSource ?? "yscp",
					entryDeviceIds: loc.entryDeviceIds || [],
					exitDeviceIds: loc.exitDeviceIds || [],
					cameraDeviceIds: !isFace && cameraDeviceIds.length ? cameraDeviceIds : undefined,
					entryCameraDeviceIds: isFace ? entryCameraDeviceIds : undefined,
					exitCameraDeviceIds: isFace ? exitCameraDeviceIds : undefined,
					cameraMode:
						loc.dataSource === "isapi_camera"
							? (loc.cameraMode ?? "people_counting")
							: undefined,
					...(isFace
						? {
								faceSimilarityThreshold: normalizeFaceSimilarityThreshold(
									loc.faceSimilarityThreshold
								),
							}
						: {}),
					preferRegion: loc.dataSource === "isapi_camera" ? true : (loc.preferRegion ?? false),
					accessControlGroups: loc.accessControlGroups ?? [],
					...(loc.dataSource === "access_control"
						? {
								entryEventCameraDeviceId: toStoredEventCameraDeviceId(
									pcLoc.entryEventCameraDeviceId
								),
								exitEventCameraDeviceId: toStoredEventCameraDeviceId(
									pcLoc.exitEventCameraDeviceId
								),
							}
						: {}),
					logDisplayColumns: (() => {
						const stored = toStoredLogDisplayColumns(
							normalizeLogDisplayColumns(loc.logDisplayColumns)
						)
						return stored.length > 0 ? stored : undefined
					})(),
				} as PeopleCountingSystemConfig,
			},
		],
	}
}

export function vehicleAccessLocationToUnified(
	loc: VehicleAccessLocation | Omit<VehicleAccessLocation, "id">,
	systemType: SystemType = "vehicle_access"
): UnifiedLocationInput {
	const hasId = "id" in loc && loc.id
	return {
		...(hasId && { id: loc.id! }),
		name: loc.name,
		...pickSortOrder((loc as { sortOrder?: unknown }).sortOrder),
		systems: [
			{
				systemType,
				config: {
					dataSource: loc.dataSource ?? "yscp",
					operationMode: loc.operationMode ?? "construction_flow",
					statsEpochStartedAt: loc.statsEpochStartedAt,
					statsResetAt: loc.statsResetAt,
					parkingCapacity: loc.parkingCapacity,
					entryLaneId: loc.entryLaneId ?? undefined,
					exitLaneId: loc.exitLaneId ?? undefined,
					entryCameraDeviceIds: loc.entryCameraDeviceIds ?? [],
					exitCameraDeviceIds: loc.exitCameraDeviceIds ?? [],
					cameraChannelId: loc.cameraChannelId ?? 1,
					vehicleGroupIds: loc.vehicleGroupIds ?? [],
					logDisplayColumns: toStoredVehicleLogDisplayColumns(
						normalizeVehicleLogDisplayColumns(loc.logDisplayColumns)
					),
				} as VehicleAccessSystemConfig,
			},
		],
	}
}

type ConstructionLocationInput =
	| EnvironmentLocation
	| PeopleCountingLocation
	| VehicleAccessLocation
	| Omit<EnvironmentLocation, "id">
	| Omit<PeopleCountingLocation, "id">
	| Omit<VehicleAccessLocation, "id">

export function buildUnifiedZoneUpdateData<TZone extends { name?: string; locations?: unknown[] }>(
	data: Partial<TZone>,
	options: {
		systemType: SystemType
		locationConverter: (location: ConstructionLocationInput, systemType: SystemType) => UnifiedLocationInput
	}
): {
	name?: string
	buildingId?: number
	imageUrl?: string
	description?: string
	sortOrder?: number
	locations?: (UnifiedLocation | UnifiedLocationInput)[]
} {
	const unifiedData: {
		name?: string
		buildingId?: number
		imageUrl?: string
		description?: string
		sortOrder?: number
		locations?: (UnifiedLocation | UnifiedLocationInput)[]
	} = {}

	if (data.name !== undefined) {
		unifiedData.name = data.name
	}
	if ("buildingId" in data && data.buildingId !== undefined) {
		unifiedData.buildingId = data.buildingId as number
	}
	if ("imageUrl" in data && data.imageUrl !== undefined) {
		unifiedData.imageUrl = data.imageUrl as string
	}
	if ("description" in data && data.description !== undefined) {
		unifiedData.description = data.description as string
	}
	Object.assign(unifiedData, pickSortOrder((data as { sortOrder?: unknown }).sortOrder))

	if ("locations" in data && data.locations !== undefined && Array.isArray(data.locations)) {
		unifiedData.locations = data.locations.map((loc) =>
			options.locationConverter(loc as ConstructionLocationInput, options.systemType)
		)
	}

	return unifiedData
}

export function mergeFullZoneWithSystemUpdate<TZone extends { name?: string; locations?: unknown[] }>(
	fullZone: UnifiedZone,
	data: Partial<TZone>,
	options: {
		systemType: SystemType
		locationConverter: (location: ConstructionLocationInput, systemType: SystemType) => UnifiedLocationInput
	}
): {
	name?: string
	buildingId?: number
	imageUrl?: string
	description?: string
	sortOrder?: number
	locations?: (UnifiedLocation | UnifiedLocationInput)[]
} {
	const result: {
		name?: string
		buildingId?: number
		imageUrl?: string
		description?: string
		sortOrder?: number
		locations?: (UnifiedLocation | UnifiedLocationInput)[]
	} = {}

	if (data.name !== undefined) {
		result.name = data.name
	}
	if ("buildingId" in data && data.buildingId !== undefined) {
		result.buildingId = data.buildingId as number
	}
	if ("imageUrl" in data && data.imageUrl !== undefined) {
		result.imageUrl = data.imageUrl as string
	}
	if ("description" in data && data.description !== undefined) {
		result.description = data.description as string
	}
	Object.assign(result, pickSortOrder((data as { sortOrder?: unknown }).sortOrder))

	const systemType = options.systemType
	const locationConverter = options.locationConverter
	const fullLocations = fullZone.locations ?? []

	if ("locations" in data && Array.isArray(data.locations)) {
		const systemLocations = data.locations
		const resolveFullLocationMatch = (sl: {
			id?: string | null
			name?: string | null
		}): UnifiedLocation | undefined => {
			const slId = sl.id != null && String(sl.id).trim() !== "" ? String(sl.id) : ""
			const isPersistedId = Boolean(slId && !slId.startsWith("temp-"))
			if (isPersistedId) {
				const byId = fullLocations.find((fl) => fl.id != null && String(fl.id) === slId)
				if (byId) return byId
			}
			const trimmedName = sl.name != null ? String(sl.name).trim() : ""
			if (!trimmedName) return undefined
			return fullLocations.find((fl) => (fl.name || "").trim() === trimmedName)
		}
		const mergedFirst: (UnifiedLocation | UnifiedLocationInput)[] = systemLocations.map(
			(sl: { id?: string; name?: string }) => {
				const fullMatch = resolveFullLocationMatch(sl)
				if (fullMatch) {
					const otherSystems = (fullMatch.systems ?? []).filter((s) => s.systemType !== systemType)
					const ourUnified = locationConverter(sl as ConstructionLocationInput, systemType)
					const mergedSystems = [...otherSystems, ...(ourUnified.systems ?? [])]
					return {
						...fullMatch,
						...(ourUnified.name !== undefined ? { name: ourUnified.name } : {}),
						...(ourUnified.description !== undefined
							? { description: ourUnified.description }
							: {}),
						...(ourUnified.createdAt !== undefined ? { createdAt: ourUnified.createdAt } : {}),
						...pickSortOrder((ourUnified as { sortOrder?: unknown }).sortOrder),
						systems: mergedSystems,
					}
				}
				return locationConverter(sl as ConstructionLocationInput, systemType)
			}
		)
		const mergedIds = new Set(
			mergedFirst
				.map((fl) => fl.id)
				.filter(Boolean)
				.map((id) => String(id))
		)
		const rest = fullLocations.filter((fl) => !mergedIds.has(String(fl.id)))
		result.locations = [...mergedFirst, ...rest]
	}

	return result
}
