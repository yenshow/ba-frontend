import type {
	UnifiedZone,
	UnifiedLocation,
	SystemType,
	SystemConfig,
	EnvironmentSystemConfig,
	LightingSystemConfig,
	PeopleCountingSystemConfig,
	LocationSystem
} from "~/types/location";
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment";
import type { LightingZone, LightingLocation } from "~/types/lighting";
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";

type LocationSystemInput = LocationSystem | Omit<LocationSystem, "id">;
type UnifiedLocationInput = Omit<UnifiedLocation, "zoneId" | "systems"> & { systems: LocationSystemInput[] };

/**
 * 後端返回的地點格式（新架構：包含 systems 陣列）
 */
export type BackendLocation = {
	id: string;
	zoneId: string;
	name: string;
	description?: string;
	systems: Array<{
		id: string;
		systemType: SystemType;
		config: {
			// environment 系統配置
			deviceId?: number;
			parameters?: Array<{ type: string; enabled: boolean }>;
			// lighting 系統配置
			location?: { x: number; y: number };
			modbus?: any;
			// people_counting 系統配置
			personGroupIds?: number[];
			entryDoorId?: number;
			exitDoorId?: number;
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
	zoneNumber?: number;
	imageUrl?: string;
	description?: string;
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
		zoneNumber: backendZone.zoneNumber,
		imageUrl: backendZone.imageUrl,
		description: backendZone.description,
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
 * 類型守衛：檢查是否為照明系統配置
 */
function isLightingSystemConfig(config: unknown): config is LightingSystemConfig {
	if (!config || typeof config !== "object") return false;
	const c = config as Record<string, unknown>;
	return "location" in c || "modbus" in c || "deviceId" in c;
}

/**
 * 類型守衛：檢查是否為人流統計系統配置
 */
function isPeopleCountingSystemConfig(config: unknown): config is PeopleCountingSystemConfig {
	if (!config || typeof config !== "object") return false;
	const c = config as Record<string, unknown>;
	return "personGroupIds" in c && Array.isArray(c.personGroupIds);
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
		case "lighting":
			if (isLightingSystemConfig(config)) return config;
			return {};
		case "people_counting":
			if (isPeopleCountingSystemConfig(config)) return config;
			return { personGroupIds: [] };
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
		systems: backendLoc.systems.map((sys) => ({
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
		locations: zone.locations
			.flatMap((loc) => {
				const envSystem = loc.systems.find((s) => s.systemType === "environment");
				if (!envSystem || !isEnvironmentSystemConfig(envSystem.config)) {
					return [];
				}

				return [
					{
						id: loc.id,
						systemId: envSystem.id,
						name: loc.name,
						deviceId: envSystem.config.deviceId,
						parameters: envSystem.config.parameters || []
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
		locations: zone.locations.map((loc) => environmentLocationToUnified(loc, systemType))
	};
}


/**
 * 將後端返回的區域格式直接轉換為照明區域格式
 */
export function backendToLightingZone(backendZone: BackendZone): LightingZone {
	return unifiedToLightingZone(backendToUnifiedZone(backendZone));
}

/**
 * 將統一區域轉換為照明區域
 */
export function unifiedToLightingZone(zone: UnifiedZone): LightingZone {
	return {
		id: zone.id,
		name: zone.name,
		imageUrl: zone.imageUrl,
		description: zone.description,
		locations: zone.locations
			.flatMap((loc) => {
				const lightingSystem = loc.systems.find((s) => s.systemType === "lighting");
				if (!lightingSystem || !isLightingSystemConfig(lightingSystem.config)) {
					return [];
				}

				return [
					{
						id: loc.id,
						systemId: lightingSystem.id,
						name: loc.name,
						location: lightingSystem.config.location,
						deviceId: lightingSystem.config.deviceId,
						modbus: lightingSystem.config.modbus
					} as LightingLocation
				];
			})
	};
}

/**
 * 將照明區域轉換為統一區域（用於傳送給後端）
 */
export function lightingToUnifiedZone(
	zone: LightingZone,
	systemType: SystemType = "lighting"
): Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] } {
	return {
		name: zone.name,
		...(zone.imageUrl !== undefined && { imageUrl: zone.imageUrl }),
		...(zone.description !== undefined && { description: zone.description }),
		locations: zone.locations.map((location) => lightingLocationToUnified(location, systemType))
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
 */
export function unifiedToPeopleCountingZone(zone: UnifiedZone): PeopleCountingZone {
	return {
		id: zone.id,
		name: zone.name,
		locations: zone.locations
			.flatMap((loc) => {
				const pcSystem = loc.systems.find((s) => s.systemType === "people_counting");
				if (!pcSystem || !isPeopleCountingSystemConfig(pcSystem.config)) {
					return [];
				}

				return [
					{
						id: loc.id,
						name: loc.name,
						personGroupIds: pcSystem.config.personGroupIds || [],
						entryDoorId: pcSystem.config.entryDoorId || 0,
						exitDoorId: pcSystem.config.exitDoorId || 0
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
		locations: zone.locations.map((loc) => peopleCountingLocationToUnified(loc, systemType))
	};
}


/**
 * 輔助函數：檢查地點是否有指定類型的系統
 */
export function hasSystem(location: UnifiedLocation, systemType: SystemType): boolean {
	return location.systems.some((s) => s.systemType === systemType);
}

/**
 * 輔助函數：獲取地點的指定類型系統
 */
export function getSystem(location: UnifiedLocation, systemType: SystemType): LocationSystem | undefined {
	return location.systems.find((s) => s.systemType === systemType);
}

/**
 * 輔助函數：檢查地點是否有照明系統的座標
 */
export function hasLightingCoordinates(location: UnifiedLocation): boolean {
	const lightingSystem = getSystem(location, "lighting");
	if (!lightingSystem || !isLightingSystemConfig(lightingSystem.config)) return false;
	
	const config = lightingSystem.config;
	return config.location?.x !== undefined && config.location?.y !== undefined;
}

/**
 * 輔助函數：獲取照明系統的座標樣式
 */
export function getLightingLocationStyle(location: UnifiedLocation): { left: string; top: string } | {} {
	const lightingSystem = getSystem(location, "lighting");
	if (!lightingSystem || !isLightingSystemConfig(lightingSystem.config)) return {};
	
	const config = lightingSystem.config;
	if (config.location && config.location.x !== undefined && config.location.y !== undefined) {
		return {
			left: `${config.location.x}%`,
			top: `${config.location.y}%`
		};
	}
	return {};
}

/**
 * 輔助函數：將環境監測地點轉換為統一地點格式
 */
export function environmentLocationToUnified(
	loc: EnvironmentLocation | Omit<EnvironmentLocation, "id">,
	systemType: SystemType = "environment"
): UnifiedLocationInput {
	const hasId = "id" in loc && loc.id;
	const hasSystemId = "systemId" in loc && loc.systemId;
	return {
		...(hasId && { id: loc.id! }),
		name: loc.name,
		systems: [
			{
				...(hasSystemId && { id: loc.systemId! }),
				systemType,
				config: {
					deviceId: loc.deviceId,
					parameters: loc.parameters || []
				} as EnvironmentSystemConfig
			}
		]
	};
}

/**
 * 輔助函數：將照明地點轉換為統一地點格式
 */
export function lightingLocationToUnified(
	location: LightingLocation | Omit<LightingLocation, "id">,
	systemType: SystemType = "lighting"
): UnifiedLocationInput {
	const hasId = "id" in location && location.id;
	const hasSystemId = "systemId" in location && location.systemId;
	return {
		...(hasId && { id: location.id! }),
		name: location.name,
		...(location.description && { description: location.description }),
		systems: [
			{
				...(hasSystemId && { id: location.systemId! }),
				systemType,
				config: {
					deviceId: location.deviceId,
					location: location.location,
					modbus: location.modbus
				} as LightingSystemConfig
			}
		]
	};
}

/**
 * 輔助函數：將人流統計地點轉換為統一地點格式
 */
export function peopleCountingLocationToUnified(
	loc: PeopleCountingLocation | Omit<PeopleCountingLocation, "id">,
	systemType: SystemType = "people_counting"
): UnifiedLocationInput {
	const hasId = "id" in loc && loc.id;
	return {
		...(hasId && { id: loc.id! }),
		name: loc.name,
		systems: [
			{
				systemType,
				config: {
					personGroupIds: loc.personGroupIds || [],
					entryDoorId: loc.entryDoorId,
					exitDoorId: loc.exitDoorId
				} as PeopleCountingSystemConfig
			}
		]
	};
}
