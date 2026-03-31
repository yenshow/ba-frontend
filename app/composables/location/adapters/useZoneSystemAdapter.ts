/**
 * 區域系統適配器 Composable
 * 處理不同系統類型的區域和地點類型轉換
 */

import type { SystemType } from "~/types/location"
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment"
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting"
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess"
import { getLocationUiKey } from "~/utils/locationUiId"

export type SystemZoneType =
	| EnvironmentZone
	| PeopleCountingZone
	| VehicleAccessZone
export type SystemLocationType =
	| EnvironmentLocation
	| PeopleCountingLocation
	| VehicleAccessLocation

/**
 * 系統配置
 * 用於標記系統特性，實現配置驅動的架構
 */
export interface SystemConfig {
	// 是否每個區域只允許一個地點（已廢棄：所有系統現在都支持多個地點）
	/** @deprecated 所有系統現在都支持多個地點，此配置已不再使用 */
	singleLocationPerZone?: boolean
	// 是否需要示意圖（用於照明系統）
	requireImageUrl?: boolean
}

/**
 * 區域系統適配器接口
 * 提供 UI 層的地點列表讀寫、建立空地點/區域、過濾空地點與取得地點 ID，供 ZoneManagementDialog 使用。
 * 區域與後端的轉換由 useSystemLocationApiFactory 與 locationAdapter 負責。
 */
export interface ZoneSystemAdapter<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType,
> {
	getLocationsProperty: (zone: TZone) => TLocation[]
	setLocationsProperty: (zone: TZone, locations: TLocation[]) => TZone
	createNewLocation: () => TLocation
	createNewZone: (name: string) => TZone
	filterEmptyLocations: (zone: TZone) => TZone
	systemConfig?: SystemConfig
	getLocationId?: (args: { zone: TZone; location: TLocation; locationIndex: number }) => string
}

/**
 * 環境監測系統適配器
 */
export function useEnvironmentZoneAdapter(): ZoneSystemAdapter<
	EnvironmentZone,
	EnvironmentLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false, // 環境監測系統不需要示意圖
	}

	return {
		getLocationsProperty: (zone: EnvironmentZone) => zone.locations || [],
		setLocationsProperty: (zone: EnvironmentZone, locations: EnvironmentLocation[]) => {
			// 環境監測系統現在支持多個地點
			return {
				...zone,
				locations,
			}
		},
		createNewLocation: (): EnvironmentLocation => ({
			name: "",
			parameters: [],
		}),
		createNewZone: (name: string): EnvironmentZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: EnvironmentZone): EnvironmentZone => ({
			...zone,
			locations: (zone.locations || []).filter((loc) => loc.name && loc.name.trim().length > 0),
		}),
		systemConfig,
		getLocationId: ({ zone, location, locationIndex }): string => {
			return getLocationUiKey({ zone, location, locationIndex })
		},
	}
}

/**
 * 人流統計系統適配器
 */
export function usePeopleCountingZoneAdapter(): ZoneSystemAdapter<
	PeopleCountingZone,
	PeopleCountingLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false, // 人流統計系統不需要示意圖
	}

	return {
		getLocationsProperty: (zone: PeopleCountingZone) => zone.locations || [],
		setLocationsProperty: (zone: PeopleCountingZone, locations: PeopleCountingLocation[]) => {
			// 人流統計系統現在支持多個地點
			return {
				...zone,
				locations,
			}
		},
		createNewLocation: (): PeopleCountingLocation => ({
			name: "",
			personGroupIds: [],
		}),
		createNewZone: (name: string): PeopleCountingZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: PeopleCountingZone): PeopleCountingZone => ({
			...zone,
			locations: (zone.locations || []).filter((loc) => loc.name && loc.name.trim().length > 0),
		}),
		systemConfig,
		getLocationId: ({ zone, location, locationIndex }): string => {
			// PeopleCountingLocation 可能同時存在 locationId（業務層數字）；但 UI 穩定 key 仍以 DB id 優先，
			// 未存檔則統一走 zoneKey + index，避免 rename 造成 key 變動。
			return getLocationUiKey({ zone, location, locationIndex })
		},
	}
}

/**
 * 車輛進出系統適配器
 */
export function useVehicleAccessZoneAdapter(): ZoneSystemAdapter<
	VehicleAccessZone,
	VehicleAccessLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: false,
	}

	return {
		getLocationsProperty: (zone: VehicleAccessZone) => zone.locations || [],
		setLocationsProperty: (zone: VehicleAccessZone, locations: VehicleAccessLocation[]) => ({
			...zone,
			locations,
		}),
		createNewLocation: (): VehicleAccessLocation => ({
			name: "",
		}),
		createNewZone: (name: string): VehicleAccessZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: VehicleAccessZone): VehicleAccessZone => ({
			...zone,
			locations: (zone.locations || []).filter((loc) => loc.name && loc.name.trim().length > 0),
		}),
		systemConfig,
		getLocationId: ({ zone, location, locationIndex }): string => {
			return getLocationUiKey({ zone, location, locationIndex })
		},
	}
}

/**
 * 根據系統類型取得適配器
 */
export function useZoneSystemAdapter<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType,
>(systemType: SystemType): ZoneSystemAdapter<TZone, TLocation> {
	switch (systemType) {
		case "environment":
			return useEnvironmentZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "people_counting":
			return usePeopleCountingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "vehicle_access":
			return useVehicleAccessZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		default:
			throw new Error(`不支援的系統類型: ${systemType}`)
	}
}

