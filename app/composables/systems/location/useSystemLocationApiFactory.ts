/**
 * 系統地點 API 工廠函數
 * 統一處理所有系統的區域管理 API，減少代碼重複
 */

import type { SystemType, UnifiedZone, UnifiedLocationInput } from "~/types/location";
import type { SystemZoneType, SystemLocationType } from "~/composables/systems/useZoneSystemAdapter";
import { useLocationApi } from "./useLocationApi";
import {
	buildUnifiedZoneUpdateData,
	environmentLocationToUnified,
	lightingLocationToUnified,
	peopleCountingLocationToUnified
} from "~/utils/locationAdapter";

/**
 * 系統 API 配置
 */
export interface SystemApiConfig<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType
> {
	systemType: SystemType;
	// 從 UnifiedZone 轉換為系統特定類型
	backendToSystemZone: (zone: UnifiedZone) => TZone;
	// 從系統特定類型轉換為 UnifiedZone（用於創建）
	systemToUnifiedZone: (
		zone: Omit<TZone, "id"> & { locations?: (TLocation | Omit<TLocation, "id">)[] }
	) => Omit<UnifiedZone, "id" | "locations"> & { locations: UnifiedLocationInput[] };
	// 地點轉換函數
	locationToUnified: (
		location: TLocation | Omit<TLocation, "id">,
		systemType: SystemType
	) => UnifiedLocationInput;
}

/**
 * 創建區域數據類型（簡化，使用 any 以支持不同系統的特定類型）
 */
export type CreateZoneData<TZone extends SystemZoneType> = Omit<TZone, "id">;

/**
 * 更新區域數據類型（簡化，使用 any 以支持不同系統的特定類型）
 */
export type UpdateZoneData<TZone extends SystemZoneType> = Partial<TZone>;

/**
 * 系統地點 API 工廠函數
 * 統一處理所有系統的區域管理 API
 */
export function useSystemLocationApiFactory<
	TZone extends SystemZoneType,
	TLocation extends SystemLocationType
>(config: SystemApiConfig<TZone, TLocation>) {
	const locationApi = useLocationApi();

	return {
		/**
		 * 取得區域列表
		 */
		getZones: async () => {
			const response = await locationApi.getZones(config.systemType);
			return {
				zones: response.zones.map((zone) => config.backendToSystemZone(zone))
			};
		},

		/**
		 * 取得單一區域
		 */
		getZone: async (id: string) => {
			const response = await locationApi.getZone(id, config.systemType);
			return {
				zone: config.backendToSystemZone(response.zone)
			};
		},

	/**
	 * 建立區域
	 */
	createZone: async (data: CreateZoneData<TZone>) => {
		// 類型轉換：將系統特定類型轉換為統一格式
		const zoneData = data as Omit<TZone, "id"> & { locations?: (TLocation | Omit<TLocation, "id">)[] };
		const unifiedData = config.systemToUnifiedZone(zoneData);
		const response = await locationApi.createZone(unifiedData);
		return {
			merged: response.merged,
			message: response.message,
			zone: config.backendToSystemZone(response.zone)
		};
	},

		/**
		 * 更新區域
		 */
		updateZone: async (id: string, data: UpdateZoneData<TZone>) => {
			const unifiedData = buildUnifiedZoneUpdateData(data, {
				systemType: config.systemType,
				locationConverter: config.locationToUnified
			});
			const response = await locationApi.updateZone(id, unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: config.backendToSystemZone(response.zone)
			};
		},

		/**
		 * 刪除區域
		 */
		deleteZone: locationApi.deleteZone
	};
}

