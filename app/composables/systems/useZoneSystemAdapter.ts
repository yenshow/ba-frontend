/**
 * 區域系統適配器 Composable
 * 處理不同系統類型的區域和地點類型轉換
 */

import type {
	UnifiedZone,
	SystemType,
	UnifiedLocation,
	LocationSystem,
	UnifiedLocationInput
} from "~/types/location";
import type { LightingZone, LightingLocation } from "~/types/lighting";
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment";
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess";
import {
	backendToLightingZone,
	lightingToUnifiedZone,
	backendToEnvironmentZone,
	environmentToUnifiedZone,
	backendToPeopleCountingZone,
	peopleCountingToUnifiedZone,
	backendToVehicleAccessZone,
	vehicleAccessToUnifiedZone
} from "~/utils/locationAdapter";

export type SystemZoneType =
	| LightingZone
	| EnvironmentZone
	| PeopleCountingZone
	| VehicleAccessZone;
export type SystemLocationType =
	| LightingLocation
	| EnvironmentLocation
	| PeopleCountingLocation
	| VehicleAccessLocation;

/**
 * 系統配置
 * 用於標記系統特性，實現配置驅動的架構
 */
export interface SystemConfig {
	// 是否每個區域只允許一個地點（已廢棄：所有系統現在都支持多個地點）
	/** @deprecated 所有系統現在都支持多個地點，此配置已不再使用 */
	singleLocationPerZone?: boolean;
	// 是否需要示意圖（用於照明系統）
	requireImageUrl?: boolean;
}

/**
 * 區域系統適配器接口
 * 統一處理不同系統類型的區域和地點類型轉換
 */
export interface ZoneSystemAdapter<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType
> {
	// ========== 轉換方法 ==========
	// 從 UnifiedZone 轉換為系統特定類型
	unifiedToSystem: (zone: UnifiedZone) => TZone;
	// 從系統特定類型轉換為 UnifiedZone（用於傳送給後端）
	// 注意：返回的 locations 是 UnifiedLocationInput[]，因為轉換時可能缺少 zoneId 和系統 id
	systemToUnified: (
		zone: TZone
	) => Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] };
	// 從後端格式轉換為系統特定類型
	backendToSystem: (zone: UnifiedZone) => TZone;

	// ========== 地點管理方法 ==========
	// 取得地點列表的屬性名（例如：areas, locations）
	getLocationsProperty: (zone: TZone) => TLocation[];
	// 設定地點列表（支持多個地點）
	setLocationsProperty: (zone: TZone, locations: TLocation[]) => TZone;
	// 建立新的地點
	createNewLocation: () => TLocation;
	// 建立新的區域
	createNewZone: (name: string) => TZone;
	// 過濾空地點
	filterEmptyLocations: (zone: TZone) => TZone;

	// ========== 系統配置（新增）==========
	// 系統特性配置
	systemConfig?: SystemConfig;

	// ========== 工具方法（新增）==========
	// 從地點對象獲取 ID（統一格式：字串）
	// zoneName 可選，用於生成合成 ID
	getLocationId?: (location: TLocation, zoneName?: string) => string;
}

/**
 * 照明系統適配器
 */
export function useLightingZoneAdapter(): ZoneSystemAdapter<LightingZone, LightingLocation> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true // 照明系統需要示意圖
	};

	return {
		unifiedToSystem: (zone: UnifiedZone) => {
			// 需要從 UnifiedZone 轉換，但這裡我們假設已經轉換過了
			// 實際使用時應該使用 backendToLightingZone
			return zone as unknown as LightingZone;
		},
		systemToUnified: (zone: LightingZone) => lightingToUnifiedZone(zone, "lighting"),
		backendToSystem: (zone: UnifiedZone) => {
			// 如果 zone 已經是 LightingZone 格式，直接返回
			if ("areas" in zone) {
				return zone as LightingZone;
			}
			// 否則需要轉換（這裡簡化處理，實際應該使用完整的轉換邏輯）
			return backendToLightingZone(zone as any);
		},
		getLocationsProperty: (zone: LightingZone) => {
			// 照明系統使用 locations 屬性（類型定義）
			// 但組件中可能使用 areas（向後兼容）
			return (zone as any).areas || zone.locations || [];
		},
		setLocationsProperty: (zone: LightingZone, locations: LightingLocation[]) => {
			// 照明系統允許多個地點，直接使用傳入的列表
			return {
				...zone,
				locations
			};
		},
		createNewLocation: (): LightingLocation => ({
			name: ""
		}),
		createNewZone: (name: string): LightingZone => ({
			name,
			locations: []
		}),
		filterEmptyLocations: (zone: LightingZone): LightingZone => ({
			...zone,
			locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
		}),
		systemConfig,
		getLocationId: (location: LightingLocation, zoneName?: string): string => {
			return location.id || `${zoneName || "unknown"}-${location.name}`;
		}
	};
}

/**
 * 環境監測系統適配器
 */
export function useEnvironmentZoneAdapter(): ZoneSystemAdapter<
	EnvironmentZone,
	EnvironmentLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false // 環境監測系統不需要示意圖
	};

	return {
		unifiedToSystem: (zone: UnifiedZone) => {
			return zone as unknown as EnvironmentZone;
		},
		systemToUnified: (zone: EnvironmentZone) => environmentToUnifiedZone(zone, "environment"),
		backendToSystem: (zone: UnifiedZone) => {
			if ("locations" in zone && Array.isArray(zone.locations)) {
				return zone as unknown as EnvironmentZone;
			}
			return backendToEnvironmentZone(zone as any);
		},
		getLocationsProperty: (zone: EnvironmentZone) => zone.locations || [],
		setLocationsProperty: (zone: EnvironmentZone, locations: EnvironmentLocation[]) => {
			// 環境監測系統現在支持多個地點
			return {
				...zone,
				locations
			};
		},
		createNewLocation: (): EnvironmentLocation => ({
			name: "",
			parameters: []
		}),
		createNewZone: (name: string): EnvironmentZone => ({
			name,
			locations: []
		}),
		filterEmptyLocations: (zone: EnvironmentZone): EnvironmentZone => ({
			...zone,
			locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
		}),
		systemConfig,
		getLocationId: (location: EnvironmentLocation, zoneName?: string): string => {
			return location.id || `${zoneName || "unknown"}-${location.name}`;
		}
	};
}

/**
 * 人流統計系統適配器
 */
export function usePeopleCountingZoneAdapter(): ZoneSystemAdapter<
	PeopleCountingZone,
	PeopleCountingLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false // 人流統計系統不需要示意圖
	};

	return {
		unifiedToSystem: (zone: UnifiedZone) => {
			return zone as unknown as PeopleCountingZone;
		},
		systemToUnified: (zone: PeopleCountingZone) =>
			peopleCountingToUnifiedZone(zone, "people_counting"),
		backendToSystem: (zone: UnifiedZone) => {
			if ("locations" in zone && Array.isArray(zone.locations)) {
				return zone as unknown as PeopleCountingZone;
			}
			return backendToPeopleCountingZone(zone as any);
		},
		getLocationsProperty: (zone: PeopleCountingZone) => zone.locations || [],
		setLocationsProperty: (zone: PeopleCountingZone, locations: PeopleCountingLocation[]) => {
			// 人流統計系統現在支持多個地點
			return {
				...zone,
				locations
			};
		},
		createNewLocation: (): PeopleCountingLocation => ({
			name: "",
			personGroupIds: []
		}),
		createNewZone: (name: string): PeopleCountingZone => ({
			name,
			locations: []
		}),
		filterEmptyLocations: (zone: PeopleCountingZone): PeopleCountingZone => ({
			...zone,
			locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
		}),
		systemConfig,
		getLocationId: (location: PeopleCountingLocation, zoneName?: string): string => {
			// 優先使用 id（字串格式）
			if (location.id) return location.id;
			// 如果有 locationId（數字格式），轉換為字串
			if (location.locationId) return String(location.locationId);
			// 最後使用 zone 名稱和地點名稱組合
			return `${zoneName || "unknown"}-${location.name}`;
		}
	};
}

/**
 * 車輛進出系統適配器
 */
export function useVehicleAccessZoneAdapter(): ZoneSystemAdapter<
	VehicleAccessZone,
	VehicleAccessLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false
	};

	return {
		unifiedToSystem: (zone: UnifiedZone) => zone as unknown as VehicleAccessZone,
		systemToUnified: (zone: VehicleAccessZone) => vehicleAccessToUnifiedZone(zone, "vehicle_access"),
		backendToSystem: (zone: UnifiedZone) => {
			if ("locations" in zone && Array.isArray(zone.locations)) {
				return zone as unknown as VehicleAccessZone;
			}
			return backendToVehicleAccessZone(zone as any);
		},
		getLocationsProperty: (zone: VehicleAccessZone) => zone.locations || [],
		setLocationsProperty: (zone: VehicleAccessZone, locations: VehicleAccessLocation[]) => ({
			...zone,
			locations
		}),
		createNewLocation: (): VehicleAccessLocation => ({
			name: ""
		}),
		createNewZone: (name: string): VehicleAccessZone => ({
			name,
			locations: []
		}),
		filterEmptyLocations: (zone: VehicleAccessZone): VehicleAccessZone => ({
			...zone,
			locations: (zone.locations || []).filter(loc => loc.name && loc.name.trim().length > 0)
		}),
		systemConfig,
		getLocationId: (location: VehicleAccessLocation, zoneName?: string): string => {
			if (location.id) return location.id;
			return `${zoneName || "unknown"}-${location.name}`;
		}
	};
}

/**
 * 根據系統類型取得適配器
 */
export function useZoneSystemAdapter<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType
>(systemType: SystemType): ZoneSystemAdapter<TZone, TLocation> {
	switch (systemType) {
		case "lighting":
			return useLightingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		case "environment":
			return useEnvironmentZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		case "people_counting":
			return usePeopleCountingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		case "vehicle_access":
			return useVehicleAccessZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		default:
			throw new Error(`不支援的系統類型: ${systemType}`);
	}
}
