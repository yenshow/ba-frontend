/**
 * 區域系統適配器 Composable
 * 處理不同系統類型的區域和地點類型轉換
 */

import type { UnifiedZone, SystemType } from "~/types/location";
import type { LightingZone, LightingLocation } from "~/types/lighting";
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment";
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";
import {
	backendToLightingZone,
	lightingToUnifiedZone,
	backendToEnvironmentZone,
	environmentToUnifiedZone,
	backendToPeopleCountingZone,
	peopleCountingToUnifiedZone
} from "~/utils/locationAdapter";

export type SystemZoneType = LightingZone | EnvironmentZone | PeopleCountingZone;
export type SystemLocationType = LightingLocation | EnvironmentLocation | PeopleCountingLocation;

export interface ZoneSystemAdapter<TZone extends SystemZoneType, TLocation extends SystemLocationType> {
	// 從 UnifiedZone 轉換為系統特定類型
	unifiedToSystem: (zone: UnifiedZone) => TZone;
	// 從系統特定類型轉換為 UnifiedZone
	systemToUnified: (zone: TZone) => Omit<UnifiedZone, "id">;
	// 從後端格式轉換為系統特定類型
	backendToSystem: (zone: UnifiedZone) => TZone;
	// 取得地點列表的屬性名（例如：areas, locations）
	getLocationsProperty: (zone: TZone) => TLocation[];
	// 設定地點列表
	setLocationsProperty: (zone: TZone, locations: TLocation[]) => TZone;
	// 建立新的地點
	createNewLocation: () => TLocation;
	// 建立新的區域
	createNewZone: (name: string) => TZone;
	// 過濾空地點
	filterEmptyLocations: (zone: TZone) => TZone;
}

/**
 * 照明系統適配器
 */
export function useLightingZoneAdapter(): ZoneSystemAdapter<LightingZone, LightingLocation> {
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
	setLocationsProperty: (zone: LightingZone, locations: LightingLocation[]) => ({
		...zone,
		locations
	}),
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
		})
	};
}

/**
 * 環境監測系統適配器
 */
export function useEnvironmentZoneAdapter(): ZoneSystemAdapter<EnvironmentZone, EnvironmentLocation> {
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
			// 環境監測系統每個區域只有一個地點
			return {
				...zone,
				locations: locations.length > 0 ? [locations[0]] : []
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
		})
	};
}

/**
 * 人流統計系統適配器
 */
export function usePeopleCountingZoneAdapter(): ZoneSystemAdapter<
	PeopleCountingZone,
	PeopleCountingLocation
> {
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
		setLocationsProperty: (zone: PeopleCountingZone, locations: PeopleCountingLocation[]) => ({
			...zone,
			locations
		}),
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
		})
	};
}

/**
 * 根據系統類型取得適配器
 */
export function useZoneSystemAdapter<TZone extends SystemZoneType, TLocation extends SystemLocationType>(
	systemType: SystemType
): ZoneSystemAdapter<TZone, TLocation> {
	switch (systemType) {
		case "lighting":
			return useLightingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		case "environment":
			return useEnvironmentZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		case "people_counting":
			return usePeopleCountingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>;
		default:
			throw new Error(`不支援的系統類型: ${systemType}`);
	}
}

