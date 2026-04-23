import type {
	UnifiedZone,
	UnifiedLocation,
	SystemType,
	SystemConfig,
	EnvironmentSystemConfig,
	PeopleCountingSystemConfig,
	VehicleAccessSystemConfig,
	LocationSystem,
	LocationSystemInput,
	UnifiedLocationInput
} from "~/types/location";
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment";
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess";
import { pickSortOrder } from "~/utils/sortOrder";

/**
 * 後端返回的地點格式（新架構：包含 systems 陣列）
 */
export type BackendLocation = {
	id: string;
	zoneId: string;
	name: string;
	description?: string;
	createdAt?: string;
	sortOrder?: number;
	systems: Array<{
		id: string;
		systemType: SystemType;
		config: {
			// environment 系統配置
			deviceId?: number;
			parameters?: Array<{ type: string; enabled: boolean }>;
			// people_counting 系統配置
			personGroupIds?: number[];
			entryDoorIds?: number[];
			exitDoorIds?: number[];
			entryDeviceIds?: number[];
			exitDeviceIds?: number[];
			// vehicle_access 系統配置（entryLaneId / exitLaneId）
		};
	}>;
};

/**
 * 後端返回的區域格式
 */
export type BackendZone = {
	id: string;
	name: string;
	buildingId?: number;
	imageUrl?: string;
	description?: string;
	sortOrder?: number;
	locations: BackendLocation[];
};

/**
 * 將後端返回的區域格式轉換為統一區域格式
 * 注意：後端已經做了格式化，這裡只需要類型轉換
 */
export function backendToUnifiedZone(backendZone: BackendZone): UnifiedZone {
	// 後端 formatZone 已經返回正確格式，直接轉換即可
	return {
		id: backendZone.id,
		name: backendZone.name,
		buildingId: backendZone.buildingId,
		imageUrl: backendZone.imageUrl,
		description: backendZone.description,
		...pickSortOrder(backendZone.sortOrder),
		locations: backendZone.locations.map(backendToUnifiedLocation)
	};
}

/**
 * 類型守衛：檢查是否為環境監測系統配置
 */
function isEnvironmentSystemConfig(config: unknown): config is EnvironmentSystemConfig {
	if (!config || typeof config !== "object") return false;
	const c = config as Record<string, unknown>;
	return "parameters" in c && Array.isArray(c.parameters);
}

/**
 * 類型守衛：檢查是否為排水系統配置（與照明同時具備 location/modbus 時優先判斷）
 */
/**
 * 類型守衛：檢查是否為人流統計系統配置
 */
function isPeopleCountingSystemConfig(config: unknown): config is PeopleCountingSystemConfig {
	if (!config || typeof config !== "object") return false;
	const c = config as Record<string, unknown>;
	if ("personGroupIds" in c && Array.isArray(c.personGroupIds)) return true;
	if (c.dataSource === "isapi_camera" || c.dataSource === "access_control") return true;
	if (typeof c.cameraDeviceId === "number" && Number.isFinite(c.cameraDeviceId)) return true;
	if ("cameraDeviceIds" in c && Array.isArray((c as { cameraDeviceIds?: unknown }).cameraDeviceIds))
		return true;
	if ("entryDoorIds" in c || "exitDoorIds" in c) return true;
	if ("entryDeviceIds" in c || "exitDeviceIds" in c) return true;
	return false;
}

/**
 * 類型守衛：檢查是否為車輛進出系統配置
 */
function isVehicleAccessSystemConfig(config: unknown): config is VehicleAccessSystemConfig {
	if (!config || typeof config !== "object") return false;
	const c = config as Record<string, unknown>;
	return "entryLaneId" in c || "exitLaneId" in c;
}

/**
 * 將後端返回的系統配置轉換為正確的類型
 * 如果配置不符合預期類型，返回該系統類型的預設配置
 */
function parseSystemConfig(systemType: SystemType, config: unknown): SystemConfig {
	switch (systemType) {
		case "environment":
			if (isEnvironmentSystemConfig(config)) return config;
			return { parameters: [] };
		case "people_counting":
			if (isPeopleCountingSystemConfig(config)) return config;
			return { personGroupIds: [] };
		case "vehicle_access":
			if (isVehicleAccessSystemConfig(config)) return config;
			return { entryLaneId: undefined, exitLaneId: undefined };
		default:
			// SystemType 是有限的聯合類型，理論上不會執行到這裡
			// 但為了類型安全，返回空配置
			console.warn(`未知的系統類型: ${systemType}`);
			return { parameters: [] };
	}
}

/**
 * 將後端返回的地點格式轉換為統一地點格式
 * 注意：後端已經做了格式化，這裡只需要類型轉換
 */
function backendToUnifiedLocation(backendLoc: BackendLocation): UnifiedLocation {
	// 後端 formatLocation 已經返回正確格式，使用類型守衛確保類型安全
	return {
		id: backendLoc.id,
		zoneId: backendLoc.zoneId,
		name: backendLoc.name,
		description: backendLoc.description,
		...(backendLoc.createdAt && { createdAt: backendLoc.createdAt }),
		...pickSortOrder(backendLoc.sortOrder),
		systems: backendLoc.systems.map(sys => ({
			id: sys.id,
			systemType: sys.systemType,
			config: parseSystemConfig(sys.systemType, sys.config)
		}))
	};
}

/**
 * 將後端返回的區域格式直接轉換為環境監測區域格式
 */
export function backendToEnvironmentZone(backendZone: BackendZone): EnvironmentZone {
	return unifiedToEnvironmentZone(backendToUnifiedZone(backendZone));
}

/**
 * 將統一區域轉換為環境監測區域
 */
export function unifiedToEnvironmentZone(zone: UnifiedZone): EnvironmentZone {
	return {
		id: zone.id,
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.flatMap(loc => {
			const envSystem = loc.systems.find(s => s.systemType === "environment");
			if (!envSystem || !isEnvironmentSystemConfig(envSystem.config)) {
				return [];
			}

			const cfg = envSystem.config;
			const deviceIds = Array.isArray(cfg.deviceIds)
				? cfg.deviceIds
				: cfg.deviceId != null
					? [cfg.deviceId]
					: [];
			return [
				{
					id: loc.id,
					systemId: envSystem.id,
					name: loc.name,
					...pickSortOrder(loc.sortOrder),
					deviceId: cfg.deviceId ?? deviceIds[0],
					deviceIds: deviceIds.length ? deviceIds : undefined,
					parameters: cfg.parameters || []
				} as EnvironmentLocation
			];
		})
	};
}

/**
 * 將環境監測區域轉換為統一區域（用於傳送給後端）
 */
export function environmentToUnifiedZone(
	zone: EnvironmentZone,
	systemType: SystemType = "environment"
): Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] } {
	return {
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.map(loc => environmentLocationToUnified(loc, systemType))
	};
}

/**
 * 將後端返回的區域格式直接轉換為人流統計區域格式
 */
export function backendToPeopleCountingZone(backendZone: BackendZone): PeopleCountingZone {
	return unifiedToPeopleCountingZone(backendToUnifiedZone(backendZone));
}

/**
 * 將統一區域轉換為人流統計區域
 * 須包含 dataSource、entryDeviceIds、exitDeviceIds，否則門禁設備（本系統）選項會遺失
 */
export function unifiedToPeopleCountingZone(zone: UnifiedZone): PeopleCountingZone {
	return {
		id: zone.id,
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.flatMap(loc => {
			const pcSystem = loc.systems.find(s => s.systemType === "people_counting");
			if (!pcSystem || !isPeopleCountingSystemConfig(pcSystem.config)) {
				return [];
			}
			const config = pcSystem.config as PeopleCountingSystemConfig;
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
					cameraDeviceId: config.cameraDeviceId ?? undefined,
					cameraDeviceIds: Array.isArray(config.cameraDeviceIds)
						? config.cameraDeviceIds
						: config.cameraDeviceId != null
							? [config.cameraDeviceId]
							: undefined,
					cameraChannelId: config.cameraChannelId ?? undefined,
					preferRegion: config.preferRegion ?? undefined,
					accessControlGroups: config.accessControlGroups || []
				} as PeopleCountingLocation
			];
		})
	};
}

/**
 * 將人流統計區域轉換為統一區域（用於傳送給後端）
 */
export function peopleCountingToUnifiedZone(
	zone: PeopleCountingZone,
	systemType: SystemType = "people_counting"
): Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] } {
	return {
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.map(loc => peopleCountingLocationToUnified(loc, systemType))
	};
}

/**
 * 將後端返回的區域格式直接轉換為車輛進出區域格式
 */
export function backendToVehicleAccessZone(backendZone: BackendZone): VehicleAccessZone {
	return unifiedToVehicleAccessZone(backendToUnifiedZone(backendZone));
}

/**
 * 將統一區域轉換為車輛進出區域
 */
export function unifiedToVehicleAccessZone(zone: UnifiedZone): VehicleAccessZone {
	return {
		id: zone.id,
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.flatMap(loc => {
			const vaSystem = loc.systems.find(s => s.systemType === "vehicle_access");
			if (!vaSystem || !isVehicleAccessSystemConfig(vaSystem.config)) {
				return [];
			}

			return [
				{
					id: loc.id,
					name: loc.name,
					...pickSortOrder(loc.sortOrder),
					entryLaneId: vaSystem.config.entryLaneId ?? undefined,
					exitLaneId: vaSystem.config.exitLaneId ?? undefined
				} as VehicleAccessLocation
			];
		})
	};
}

/**
 * 將車輛進出區域轉換為統一區域（用於傳送給後端）
 */
export function vehicleAccessToUnifiedZone(
	zone: VehicleAccessZone,
	systemType: SystemType = "vehicle_access"
): Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] } {
	return {
		name: zone.name,
		...pickSortOrder(zone.sortOrder),
		locations: zone.locations.map(loc => vehicleAccessLocationToUnified(loc, systemType))
	};
}

/**
 * 輔助函數：將車輛進出地點轉換為統一地點格式
 */
export function vehicleAccessLocationToUnified(
	loc: VehicleAccessLocation | Omit<VehicleAccessLocation, "id">,
	systemType: SystemType = "vehicle_access"
): UnifiedLocationInput {
	const hasId = "id" in loc && loc.id;
	return {
		...(hasId && { id: loc.id! }),
		name: loc.name,
		...pickSortOrder((loc as { sortOrder?: unknown }).sortOrder),
		systems: [
			{
				systemType,
				config: {
					entryLaneId: loc.entryLaneId ?? undefined,
					exitLaneId: loc.exitLaneId ?? undefined
				} as VehicleAccessSystemConfig
			}
		]
	};
}

/**
 * 輔助函數：檢查地點是否有指定類型的系統
 */
export function hasSystem(location: UnifiedLocation, systemType: SystemType): boolean {
	return location.systems.some(s => s.systemType === systemType);
}

/**
 * 輔助函數：獲取地點的指定類型系統
 */
export function getSystem(
	location: UnifiedLocation,
	systemType: SystemType
): LocationSystem | undefined {
	return location.systems.find(s => s.systemType === systemType);
}

export type SystemCoordinates = { x: number; y: number };

const isFiniteCoordinate = (v: unknown): v is number => {
	return typeof v === "number" && Number.isFinite(v);
};

/**
 * 取回某地點在指定系統下的座標（若該系統 config.location 不存在或不合法則回傳 null）。
 * 注意：construction 目前雖未使用座標，但保留此工具以便與 central 同步與未來擴充。
 */
export const getSystemCoordinates = (
	location: UnifiedLocation,
	systemType: SystemType
): SystemCoordinates | null => {
	const sys = getSystem(location, systemType);
	if (!sys) return null;
	const cfg = sys.config as Record<string, unknown>;
	const raw = cfg.location as { x?: unknown; y?: unknown } | undefined;
	if (!raw) return null;
	if (!isFiniteCoordinate(raw.x) || !isFiniteCoordinate(raw.y)) return null;
	return { x: raw.x, y: raw.y };
};

export const hasCoordinatesForSystem = (
	location: UnifiedLocation,
	systemType: SystemType
): boolean => {
	return getSystemCoordinates(location, systemType) != null;
};

export const hasAnySystemCoordinates = (location: UnifiedLocation): boolean => {
	for (const s of location.systems || []) {
		if (getSystemCoordinates(location, s.systemType)) return true;
	}
	return false;
};

export const getLocationStyleBySystem = (
	location: UnifiedLocation,
	systemType: SystemType
): { left: string; top: string } | {} => {
	const c = getSystemCoordinates(location, systemType);
	if (!c) return {};
	return { left: `${c.x}%`, top: `${c.y}%` };
};

/**
 * 輔助函數：將環境監測地點轉換為統一地點格式
 */
export function environmentLocationToUnified(
	loc: EnvironmentLocation | Omit<EnvironmentLocation, "id">,
	systemType: SystemType = "environment"
): UnifiedLocationInput {
	const hasId = "id" in loc && loc.id;
	const hasSystemId = "systemId" in loc && loc.systemId;
	const deviceIds = Array.isArray(loc.deviceIds)
		? loc.deviceIds
		: loc.deviceId != null
			? [loc.deviceId]
			: [];
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
					parameters: loc.parameters || []
				} as EnvironmentSystemConfig
			}
		]
	};
}

/**
 * 輔助函數：將人流統計地點轉換為統一地點格式
 * 須送出 dataSource、entryDeviceIds、exitDeviceIds，否則門禁設備（本系統）儲存後會遺失
 */
export function peopleCountingLocationToUnified(
	loc: PeopleCountingLocation | Omit<PeopleCountingLocation, "id">,
	systemType: SystemType = "people_counting"
): UnifiedLocationInput {
	const hasId = "id" in loc && loc.id;
	const cameraDeviceIds = Array.isArray((loc as PeopleCountingLocation).cameraDeviceIds)
		? (loc as PeopleCountingLocation).cameraDeviceIds!.filter(
				id => typeof id === "number" && Number.isFinite(id) && id > 0
			)
		: loc.cameraDeviceId != null
			? [loc.cameraDeviceId]
			: [];
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
					cameraDeviceId: cameraDeviceIds[0] ?? undefined,
					cameraDeviceIds: cameraDeviceIds.length ? cameraDeviceIds : undefined,
					cameraChannelId:
						loc.cameraChannelId != null && loc.cameraChannelId > 0 ? loc.cameraChannelId : 1,
					preferRegion: loc.dataSource === "isapi_camera" ? true : (loc.preferRegion ?? false),
					accessControlGroups: loc.accessControlGroups ?? []
				} as PeopleCountingSystemConfig
			}
		]
	};
}

/**
 * 統一區域更新數據構建輔助函數
 * 統一處理不同系統的更新邏輯，減少代碼重複
 *
 * @param data - 系統特定的區域更新數據
 * @param options - 轉換選項
 * @returns 統一格式的區域更新數據
 */
export function buildUnifiedZoneUpdateData<TZone extends { name?: string; locations?: any[] }>(
	data: Partial<TZone>,
	options: {
		systemType: SystemType;
		locationConverter: (
			location:
				| EnvironmentLocation
				| PeopleCountingLocation
				| VehicleAccessLocation
				| Omit<EnvironmentLocation, "id">
				| Omit<PeopleCountingLocation, "id">
				| Omit<VehicleAccessLocation, "id">,
			systemType: SystemType
		) => UnifiedLocationInput;
	}
): {
	name?: string;
	buildingId?: number;
	imageUrl?: string;
	description?: string;
	sortOrder?: number;
	locations?: (UnifiedLocation | UnifiedLocationInput)[];
} {
	const unifiedData: {
		name?: string;
		buildingId?: number;
		imageUrl?: string;
		description?: string;
		sortOrder?: number;
		locations?: (UnifiedLocation | UnifiedLocationInput)[];
	} = {};

	// 處理基本字段
	if (data.name !== undefined) {
		unifiedData.name = data.name;
	}

	// 處理可選字段（使用類型守衛檢查）
	if ("buildingId" in data && data.buildingId !== undefined) {
		unifiedData.buildingId = data.buildingId as number;
	}

	if ("imageUrl" in data && data.imageUrl !== undefined) {
		unifiedData.imageUrl = data.imageUrl as string;
	}

	if ("description" in data && data.description !== undefined) {
		unifiedData.description = data.description as string;
	}

	Object.assign(unifiedData, pickSortOrder((data as { sortOrder?: unknown }).sortOrder));

	// 處理地點轉換
	if ("locations" in data && data.locations !== undefined && Array.isArray(data.locations)) {
		unifiedData.locations = data.locations.map(loc =>
			options.locationConverter(loc, options.systemType)
		);
	}

	return unifiedData;
}

/**
 * 將「完整區域」與「單一系統的編輯資料」合併，避免更新時覆蓋其他系統的地點/系統資料。
 * 用於系統頁面（環境、照明、人流、車輛）儲存區域時：先取回完整區域，只改動當前系統的系統資料，再送出。
 *
 * @param fullZone 後端回傳的完整區域（含所有系統）
 * @param data 當前系統的區域編輯資料（僅含該系統的 locations）
 * @param options systemType 與 locationConverter
 * @returns 合併後的統一格式更新資料，可安全傳給 locationApi.updateZone
 */
export function mergeFullZoneWithSystemUpdate<TZone extends { name?: string; locations?: any[] }>(
	fullZone: UnifiedZone,
	data: Partial<TZone>,
	options: {
		systemType: SystemType;
		locationConverter: (location: any, systemType: SystemType) => UnifiedLocationInput;
	}
): {
	name?: string;
	buildingId?: number;
	imageUrl?: string;
	description?: string;
	sortOrder?: number;
	locations?: (UnifiedLocation | UnifiedLocationInput)[];
} {
	const result: {
		name?: string;
		buildingId?: number;
		imageUrl?: string;
		description?: string;
		sortOrder?: number;
		locations?: (UnifiedLocation | UnifiedLocationInput)[];
	} = {};

	if (data.name !== undefined) {
		result.name = data.name;
	}
	if ("buildingId" in data && data.buildingId !== undefined) {
		result.buildingId = data.buildingId as number;
	}
	if ("imageUrl" in data && data.imageUrl !== undefined) {
		result.imageUrl = data.imageUrl as string;
	}
	if ("description" in data && data.description !== undefined) {
		result.description = data.description as string;
	}
	Object.assign(result, pickSortOrder((data as { sortOrder?: unknown }).sortOrder));

	const systemType = options.systemType;
	const locationConverter = options.locationConverter;
	const fullLocations = fullZone.locations ?? [];

	if ("locations" in data && Array.isArray(data.locations)) {
		const systemLocations = data.locations;
		const resolveFullLocationMatch = (sl: {
			id?: string | null;
			name?: string | null;
		}): UnifiedLocation | undefined => {
			const slId = sl.id != null && String(sl.id).trim() !== "" ? String(sl.id) : "";
			const isPersistedId = Boolean(slId && !slId.startsWith("temp-"));
			if (isPersistedId) {
				const byId = fullLocations.find(fl => fl.id != null && String(fl.id) === slId);
				if (byId) return byId;
			}
			const trimmedName = sl.name != null ? String(sl.name).trim() : "";
			if (!trimmedName) return undefined;
			return fullLocations.find(fl => (fl.name || "").trim() === trimmedName);
		};
		const mergedFirst: (UnifiedLocation | UnifiedLocationInput)[] = systemLocations.map(
			(sl: { id?: string; name?: string }) => {
				const fullMatch = resolveFullLocationMatch(sl);
				if (fullMatch) {
					const otherSystems = (fullMatch.systems ?? []).filter(s => s.systemType !== systemType);
					const ourUnified = locationConverter(sl, systemType);
					const mergedSystems = [...otherSystems, ...(ourUnified.systems ?? [])];
					// 地點層欄位（名稱、描述、排序等）必須取自編輯結果，否則只合併 systems 會永遠送出舊 name
					return {
						...fullMatch,
						...(ourUnified.name !== undefined ? { name: ourUnified.name } : {}),
						...(ourUnified.description !== undefined ? { description: ourUnified.description } : {}),
						...(ourUnified.createdAt !== undefined ? { createdAt: ourUnified.createdAt } : {}),
						...pickSortOrder((ourUnified as { sortOrder?: unknown }).sortOrder),
						systems: mergedSystems
					};
				}
				return locationConverter(sl, systemType);
			}
		);
		const mergedIds = new Set(
			mergedFirst
				.map(fl => fl.id)
				.filter(Boolean)
				.map(id => String(id))
		);
		const rest = fullLocations.filter(fl => !mergedIds.has(String(fl.id)));
		result.locations = [...mergedFirst, ...rest];
	}

	return result;
}
