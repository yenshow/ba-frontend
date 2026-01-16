import type {
	UnifiedFloor,
	UnifiedLocation,
	SystemType,
	EnvironmentSystemConfig,
	LightingSystemConfig,
	PeopleCountingSystemConfig,
	LocationSystem
} from "~/types/location";
import type { EnvironmentFloor, EnvironmentLocation } from "~/types/environment";
import type { LightingFloor, LightingArea } from "~/types/lighting";
import type { PeopleCountingFloor, PeopleCountingLocation } from "~/types/peopleCounting";

/**
 * 後端返回的地點格式（新架構：包含 systems 陣列）
 */
export type BackendLocation = {
	id: string;
	floorId: string;
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
 * 後端返回的樓層格式
 */
export type BackendFloor = {
	id: string;
	name: string;
	buildingId?: number;
	floorNumber?: number;
	imageUrl?: string;
	description?: string;
	locations: BackendLocation[];
};

/**
 * 將後端返回的樓層格式轉換為統一樓層格式
 * 注意：後端已經做了格式化，這裡只需要類型轉換
 */
export function backendToUnifiedFloor(backendFloor: BackendFloor): UnifiedFloor {
	// 後端 formatFloor 已經返回正確格式，直接轉換即可
	return {
		id: backendFloor.id,
		name: backendFloor.name,
		buildingId: backendFloor.buildingId,
		floorNumber: backendFloor.floorNumber,
		imageUrl: backendFloor.imageUrl,
		description: backendFloor.description,
		locations: backendFloor.locations.map(backendToUnifiedLocation)
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
			return config as SystemConfig;
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
		floorId: backendLoc.floorId,
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
 * 將後端返回的樓層格式直接轉換為環境監測樓層格式
 */
export function backendToEnvironmentFloor(backendFloor: BackendFloor): EnvironmentFloor {
	return unifiedToEnvironmentFloor(backendToUnifiedFloor(backendFloor));
}

/**
 * 將統一樓層轉換為環境監測樓層
 */
export function unifiedToEnvironmentFloor(floor: UnifiedFloor): EnvironmentFloor {
	return {
		id: floor.id,
		name: floor.name,
		locations: floor.locations
			.flatMap((loc) => {
				// 找到環境監測系統
				const envSystem = loc.systems.find((s) => s.systemType === "environment");
				if (!envSystem) return [];

				// 使用類型守衛確保類型安全
				if (!isEnvironmentSystemConfig(envSystem.config)) {
					console.warn(`地點 ${loc.id} 的環境監測系統配置格式不正確`);
					return [];
				}

				return [
					{
						id: loc.id,
						systemId: envSystem.id, // 添加 systemId 用於錯誤追蹤
						name: loc.name,
						deviceId: envSystem.config.deviceId,
						parameters: envSystem.config.parameters || []
					} as EnvironmentLocation
				];
			})
	};
}

/**
 * 將環境監測樓層轉換為統一樓層（用於傳送給後端）
 */
export function environmentToUnifiedFloor(
	floor: EnvironmentFloor,
	systemType: SystemType = "environment"
): Omit<UnifiedFloor, "id"> {
	return {
		...(floor.name !== undefined && { name: floor.name }),
		locations: floor.locations.map((loc) => environmentLocationToUnified(loc, systemType))
	};
}

/**
 * 將後端返回的樓層格式直接轉換為照明樓層格式
 */
export function backendToLightingFloor(backendFloor: BackendFloor): LightingFloor {
	return unifiedToLightingFloor(backendToUnifiedFloor(backendFloor));
}

/**
 * 將統一樓層轉換為照明樓層
 */
export function unifiedToLightingFloor(floor: UnifiedFloor): LightingFloor {
	return {
		id: floor.id,
		name: floor.name,
		imageUrl: floor.imageUrl,
		description: floor.description,
		areas: floor.locations
			.flatMap((loc) => {
				// 找到照明系統
				const lightingSystem = loc.systems.find((s) => s.systemType === "lighting");
				if (!lightingSystem) return [];

				// 使用類型守衛確保類型安全
				if (!isLightingSystemConfig(lightingSystem.config)) {
					console.warn(`地點 ${loc.id} 的照明系統配置格式不正確`);
					return [];
				}

				return [
					{
						id: loc.id,
						systemId: lightingSystem.id, // 添加 systemId 用於錯誤追蹤
						name: loc.name,
						location: lightingSystem.config.location,
						deviceId: lightingSystem.config.deviceId,
						modbus: lightingSystem.config.modbus
					} as LightingArea
				];
			})
	};
}

/**
 * 將照明樓層轉換為統一樓層（用於傳送給後端）
 */
export function lightingToUnifiedFloor(
	floor: LightingFloor,
	systemType: SystemType = "lighting"
): Omit<UnifiedFloor, "id"> {
	return {
		name: floor.name,
		...(floor.imageUrl !== undefined && { imageUrl: floor.imageUrl }),
		...(floor.description !== undefined && { description: floor.description }),
		locations: floor.areas.map((area) => lightingAreaToUnified(area, systemType))
	};
}

/**
 * 將後端返回的樓層格式直接轉換為人流統計樓層格式
 */
export function backendToPeopleCountingFloor(backendFloor: BackendFloor): PeopleCountingFloor {
	return unifiedToPeopleCountingFloor(backendToUnifiedFloor(backendFloor));
}

/**
 * 將統一樓層轉換為人流統計樓層
 */
export function unifiedToPeopleCountingFloor(floor: UnifiedFloor): PeopleCountingFloor {
	return {
		id: floor.id,
		name: floor.name,
		locations: floor.locations
			.flatMap((loc) => {
				// 找到人流統計系統
				const pcSystem = loc.systems.find((s) => s.systemType === "people_counting");
				if (!pcSystem) return [];

				// 使用類型守衛確保類型安全
				if (!isPeopleCountingSystemConfig(pcSystem.config)) {
					console.warn(`地點 ${loc.id} 的人流統計系統配置格式不正確`);
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
 * 將人流統計樓層轉換為統一樓層（用於傳送給後端）
 */
export function peopleCountingToUnifiedFloor(
	floor: PeopleCountingFloor,
	systemType: SystemType = "people_counting"
): Omit<UnifiedFloor, "id"> {
	return {
		name: floor.name,
		locations: floor.locations.map((loc) => peopleCountingLocationToUnified(loc, systemType))
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
): Omit<UnifiedLocation, "floorId"> {
	const hasId = "id" in loc && loc.id;
	return {
		...(hasId && { id: loc.id! }),
		name: loc.name,
		systems: [
			{
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
 * 輔助函數：將照明區域轉換為統一地點格式
 */
export function lightingAreaToUnified(
	area: LightingArea | Omit<LightingArea, "id">,
	systemType: SystemType = "lighting"
): Omit<UnifiedLocation, "floorId"> {
	const hasId = "id" in area && area.id;
	return {
		...(hasId && { id: area.id! }),
		name: area.name,
		...(area.description !== undefined && { description: area.description }),
		systems: [
			{
				systemType,
				config: {
					deviceId: area.deviceId,
					location: area.location,
					modbus: area.modbus
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
): Omit<UnifiedLocation, "floorId"> {
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
