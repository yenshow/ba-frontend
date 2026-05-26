/**
 * 系統地點 API 工廠函數
 * 統一處理所有系統的區域管理 API，減少代碼重複
 */

import type { SystemType, UnifiedZone, UnifiedLocationInput } from "~/types/location"
import type { SystemZoneType, SystemLocationType } from "~/composables/location/adapters/useZoneSystemAdapter"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { buildUnifiedZoneUpdateData, mergeFullZoneWithSystemUpdate } from "~/utils/locationAdapter"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { filterVehicleAccessLocationsForSave } from "~/utils/vehicleAccessDataSource"

/**
 * 系統 API 配置
 */
export interface SystemApiConfig<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType,
> {
	systemType: SystemType
	/** 將 API 回傳的 UnifiedZone 轉為系統區域類型 */
	unifiedToSystemZone: (zone: UnifiedZone) => TZone
	// 從系統特定類型轉換為 UnifiedZone（用於創建）
	systemToUnifiedZone: (
		zone: Omit<TZone, "id"> & { locations?: (TLocation | Omit<TLocation, "id">)[] }
	) => Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] }
	// 地點轉換函數
	locationToUnified: (
		location: TLocation | Omit<TLocation, "id">,
		systemType: SystemType
	) => UnifiedLocationInput
}

/**
 * 創建區域數據類型（簡化，使用 any 以支持不同系統的特定類型）
 */
export type CreateZoneData<TZone extends SystemZoneType> = Omit<TZone, "id">

/**
 * 更新區域數據類型（簡化，使用 any 以支持不同系統的特定類型）
 */
export type UpdateZoneData<TZone extends SystemZoneType> = Partial<TZone>

/**
 * 系統地點 API 工廠函數
 * 統一處理所有系統的區域管理 API
 */
export function useSystemLocationApiFactory<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType,
>(config: SystemApiConfig<TZone, TLocation>) {
	const locationApi = useLocationApi()
	const { enableYscpVehicleAccess } = useModuleRegistry()

	const filterSaveData = <T extends { locations?: unknown[] }>(data: T): T => {
		if (config.systemType !== "vehicle_access" || !Array.isArray(data.locations)) {
			return data
		}
		return {
			...data,
			locations: filterVehicleAccessLocationsForSave(
				data.locations as { dataSource?: string }[],
				enableYscpVehicleAccess.value
			),
		}
	}

	return {
		/**
		 * 取得區域列表
		 */
		getZones: async () => {
			const response = await locationApi.getZones(config.systemType)
			return {
				zones: response.zones.map((zone) => config.unifiedToSystemZone(zone)),
			}
		},

		/**
		 * 取得單一區域
		 */
		getZone: async (id: string) => {
			const response = await locationApi.getZone(id, config.systemType)
			return {
				zone: config.unifiedToSystemZone(response.zone),
			}
		},

		/**
		 * 建立區域
		 */
		createZone: async (data: CreateZoneData<TZone>) => {
			const zoneData = filterSaveData(
				data as Omit<TZone, "id"> & { locations?: (TLocation | Omit<TLocation, "id">)[] }
			)
			const unifiedData = config.systemToUnifiedZone(zoneData)
			const response = await locationApi.createZone(unifiedData)
			return {
				merged: response.merged,
				message: response.message,
				zone: config.unifiedToSystemZone(response.zone),
			}
		},

		/**
		 * 更新區域
		 * 先取得完整區域（含所有系統），再與當前系統的編輯資料合併後送出，避免覆蓋其他系統的地點/系統資料。
		 */
		updateZone: async (id: string, data: UpdateZoneData<TZone>) => {
			const saveData = filterSaveData(data as { locations?: unknown[] }) as UpdateZoneData<TZone>

			const hasLocations = "locations" in saveData && Array.isArray(saveData.locations)
			let unifiedData: Parameters<typeof locationApi.updateZone>[1]

			if (hasLocations) {
				const fullZoneResponse = await locationApi.getZone(id)
				const fullZone = fullZoneResponse.zone
				unifiedData = mergeFullZoneWithSystemUpdate(fullZone, saveData as Partial<TZone>, {
					systemType: config.systemType,
					locationConverter: config.locationToUnified,
				})
			} else {
				unifiedData = buildUnifiedZoneUpdateData(saveData, {
					systemType: config.systemType,
					locationConverter: config.locationToUnified,
				})
			}

			const response = await locationApi.updateZone(id, unifiedData)
			return {
				merged: response.merged,
				message: response.message,
				zone: config.unifiedToSystemZone(response.zone),
			}
		},

		/**
		 * 刪除區域
		 */
		deleteZone: locationApi.deleteZone,
	}
}

