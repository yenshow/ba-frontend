/**
 * 區域系統適配器 Composable
 * 處理不同系統類型的區域和地點類型轉換
 */

import type { SystemType } from "~/types/location"
import type { LightingZone, LightingLocation } from "~/types/lighting"
import type { HvacZone, HvacLocation } from "~/types/hvac"
import type { AirCirculationZone, AirCirculationLocation } from "~/types/air-circulation"
import type { EnvironmentZone, EnvironmentLocation } from "~/types/environment"
import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting"
import type { VehicleAccessZone, VehicleAccessLocation } from "~/types/vehicleAccess"
import type { DrainageZone, DrainageLocation } from "~/types/drainage"
import type { PowerZone, PowerLocation } from "~/types/power"
import type { FireZone, FireLocation } from "~/types/fire"
import type { EmergencyRescueZone, EmergencyRescueLocation } from "~/types/emergency-rescue"
import type { SmokeAlarmZone, SmokeAlarmLocation } from "~/types/smoke-alarm"
import { getLocationUiKey } from "~/utils/locationUiId"

export type SystemZoneType =
	| LightingZone
	| HvacZone
	| AirCirculationZone
	| EnvironmentZone
	| PeopleCountingZone
	| VehicleAccessZone
	| DrainageZone
	| PowerZone
	| FireZone
	| EmergencyRescueZone
	| SmokeAlarmZone
export type SystemLocationType =
	| LightingLocation
	| HvacLocation
	| AirCirculationLocation
	| EnvironmentLocation
	| PeopleCountingLocation
	| VehicleAccessLocation
	| DrainageLocation
	| PowerLocation
	| FireLocation
	| EmergencyRescueLocation
	| SmokeAlarmLocation

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
 * 照明系統適配器
 */
export function useLightingZoneAdapter(): ZoneSystemAdapter<LightingZone, LightingLocation> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true, // 照明系統需要示意圖
	}

	return {
		getLocationsProperty: (zone: LightingZone) => zone.locations || [],
		setLocationsProperty: (zone: LightingZone, locations: LightingLocation[]) => {
			// 照明系統允許多個地點，直接使用傳入的列表
			return {
				...zone,
				locations,
			}
		},
		createNewLocation: (): LightingLocation => ({
			name: "",
		}),
		createNewZone: (name: string): LightingZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: LightingZone): LightingZone => ({
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
 * 空調系統適配器（編輯流程與照明相同；型別獨立）
 */
export function useHvacZoneAdapter(): ZoneSystemAdapter<HvacZone, HvacLocation> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true,
	}

	return {
		getLocationsProperty: (zone: HvacZone) => zone.locations || [],
		setLocationsProperty: (zone: HvacZone, locations: HvacLocation[]) => ({
			...zone,
			locations,
		}),
		createNewLocation: (): HvacLocation => ({
			name: "",
		}),
		createNewZone: (name: string): HvacZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: HvacZone): HvacZone => ({
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
 * 空氣循環系統適配器（區域／分類編輯與排水類似；點位以 `statusPoints.running` 為主）
 */
export function useAirCirculationZoneAdapter(): ZoneSystemAdapter<
	AirCirculationZone,
	AirCirculationLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true,
	}

	return {
		getLocationsProperty: (zone: AirCirculationZone) => zone.locations || [],
		setLocationsProperty: (zone: AirCirculationZone, locations: AirCirculationLocation[]) => ({
			...zone,
			locations,
		}),
		createNewLocation: (): AirCirculationLocation => ({
			name: "",
		}),
		createNewZone: (name: string): AirCirculationZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: AirCirculationZone): AirCirculationZone => ({
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
 * 電力系統適配器（與排水類似；預設檢視分類 generator）
 */
export function usePowerZoneAdapter(): ZoneSystemAdapter<PowerZone, PowerLocation> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true,
	}

	return {
		getLocationsProperty: (zone: PowerZone) => zone.locations || [],
		setLocationsProperty: (zone: PowerZone, locations: PowerLocation[]) => ({
			...zone,
			locations,
		}),
		createNewLocation: (): PowerLocation => ({
			name: "",
			equipmentKind: "generator",
			viewCategory: "",
			statusPoints: {},
			createdAt: new Date().toISOString(),
		}),
		createNewZone: (name: string): PowerZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: PowerZone): PowerZone => ({
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
 * 衛生排水系統適配器
 */
export function useDrainageZoneAdapter(): ZoneSystemAdapter<DrainageZone, DrainageLocation> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true,
	}

	return {
		getLocationsProperty: (zone: DrainageZone) => zone.locations || [],
		setLocationsProperty: (zone: DrainageZone, locations: DrainageLocation[]) => ({
			...zone,
			locations,
		}),
		createNewLocation: (): DrainageLocation => ({
			name: "",
			equipmentKind: "pump",
			viewCategory: "",
			statusPoints: {},
			createdAt: new Date().toISOString(),
		}),
		createNewZone: (name: string): DrainageZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: DrainageZone): DrainageZone => ({
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
 * 緊急求救適配器（形狀同消防；預設檢視分類 sos）
 */
export function useEmergencyRescueZoneAdapter(): ZoneSystemAdapter<
	EmergencyRescueZone,
	EmergencyRescueLocation
> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true,
	}

	return {
		getLocationsProperty: (zone: EmergencyRescueZone) => zone.locations || [],
		setLocationsProperty: (zone: EmergencyRescueZone, locations: EmergencyRescueLocation[]) => ({
			...zone,
			locations,
		}),
		createNewLocation: (): EmergencyRescueLocation => ({
			name: "",
			equipmentKind: "pump",
			viewCategory: "sos",
			statusPoints: {},
			createdAt: new Date().toISOString(),
		}),
		createNewZone: (name: string): EmergencyRescueZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: EmergencyRescueZone): EmergencyRescueZone => ({
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
 * 消防系統適配器（資料形狀同排水，預設檢視分類為灑水）
 */
export function useFireZoneAdapter(): ZoneSystemAdapter<FireZone, FireLocation> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true,
	}

	return {
		getLocationsProperty: (zone: FireZone) => zone.locations || [],
		setLocationsProperty: (zone: FireZone, locations: FireLocation[]) => ({
			...zone,
			locations,
		}),
		createNewLocation: (): FireLocation => ({
			name: "",
			equipmentKind: "pump",
			viewCategory: "sprinkler",
			statusPoints: {},
			createdAt: new Date().toISOString(),
		}),
		createNewZone: (name: string): FireZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: FireZone): FireZone => ({
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
 * 煙霧警報系統適配器（資料形狀同消防/排水，預設檢視分類為 smoke）
 */
export function useSmokeAlarmZoneAdapter(): ZoneSystemAdapter<SmokeAlarmZone, SmokeAlarmLocation> {
	const systemConfig: SystemConfig = {
		requireImageUrl: true,
	}

	return {
		getLocationsProperty: (zone: SmokeAlarmZone) => zone.locations || [],
		setLocationsProperty: (zone: SmokeAlarmZone, locations: SmokeAlarmLocation[]) => ({
			...zone,
			locations,
		}),
		createNewLocation: (): SmokeAlarmLocation => ({
			name: "",
			equipmentKind: "detector",
			viewCategory: "smoke",
			statusPoints: {},
			createdAt: new Date().toISOString(),
		}),
		createNewZone: (name: string): SmokeAlarmZone => ({
			name,
			locations: [],
		}),
		filterEmptyLocations: (zone: SmokeAlarmZone): SmokeAlarmZone => ({
			...zone,
			locations: (zone.locations || []).filter((loc) => loc.name && loc.name.trim().length > 0),
		}),
		systemConfig,
		getLocationId: ({ zone, location, locationIndex }): string => {
			return getLocationUiKey({ zone: zone as any, location: location as any, locationIndex })
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
			vehicleGroupIds: [],
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
		case "lighting":
			return useLightingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "hvac":
			return useHvacZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "air_circulation":
			return useAirCirculationZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "environment":
			return useEnvironmentZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "people_counting":
			return usePeopleCountingZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "vehicle_access":
			return useVehicleAccessZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "drainage":
			return useDrainageZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "power":
			return usePowerZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "fire":
			return useFireZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "emergency_rescue":
			return useEmergencyRescueZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		case "smoke_alarm":
			return useSmokeAlarmZoneAdapter() as ZoneSystemAdapter<TZone, TLocation>
		default:
			throw new Error(`不支援的系統類型: ${systemType}`)
	}
}

