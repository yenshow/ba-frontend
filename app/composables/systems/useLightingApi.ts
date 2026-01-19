import type { LightingZone, LightingLocation } from "~/types/lighting";
import type { UnifiedZone, UnifiedLocation } from "~/types/location";
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import {
	backendToLightingZone,
	lightingToUnifiedZone,
	lightingLocationToUnified
} from "~/utils/locationAdapter";

export interface CreateLightingZoneData {
	name: string;
	imageUrl?: string;
	locations?: Omit<LightingLocation, "id">[];
}

export interface UpdateLightingZoneData {
	name?: string;
	imageUrl?: string;
	locations?: (LightingLocation | Omit<LightingLocation, "id">)[];
}


export const useLightingApi = () => {
	const locationApi = useLocationApi();

	// 使用通用 Factory 創建錯誤追蹤 API
	const errorTrackingApi = useErrorTrackingApiFactory("/lighting/locations", "無法讀取照明設備資料");

	return {
		// ========== 區域管理 API ==========
		// 注意：地點（locations，即點位）統一通過區域的 locations 來管理
		// 所有操作都通過統一地點管理 API 進行

		// 取得區域列表
		getZones: async () => {
			const response = await locationApi.getZones("lighting");
			return {
				zones: response.zones.map(zone => backendToLightingZone(zone))
			};
		},

		// 取得單一區域
		getZone: async (id: string) => {
			const response = await locationApi.getZone(id, "lighting");
			return {
				zone: backendToLightingZone(response.zone)
			};
		},

		// 建立區域
		createZone: async (data: CreateLightingZoneData) => {
			const unifiedData = lightingToUnifiedZone(
				{ name: data.name, imageUrl: data.imageUrl, locations: data.locations || [] },
				"lighting"
			);
			const response = await locationApi.createZone(unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: backendToLightingZone(response.zone)
			};
		},

		// 更新區域
		updateZone: async (id: string, data: UpdateLightingZoneData) => {
			// 直接構建統一格式資料（後端支援部分更新）
			const unifiedData: {
				name?: string;
				imageUrl?: string;
				locations?: (UnifiedLocation | Omit<UnifiedLocation, "id" | "zoneId">)[];
			} = {};

			if (data.name !== undefined) {
				unifiedData.name = data.name;
			}

			if (data.imageUrl !== undefined) {
				unifiedData.imageUrl = data.imageUrl;
			}

			if (data.locations !== undefined) {
				// 將照明地點轉換為統一格式
				// 轉換函數返回 Omit<UnifiedLocation, "zoneId">，符合 updateZone 的類型要求
				unifiedData.locations = data.locations.map(location => {
					const converted = lightingLocationToUnified(location, "lighting");
					// 如果有 id，保留它；如果沒有，則符合 Omit<UnifiedLocation, "id" | "zoneId">
					return converted as UnifiedLocation | Omit<UnifiedLocation, "id" | "zoneId">;
				});
			}

			const response = await locationApi.updateZone(id, unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: backendToLightingZone(response.zone)
			};
		},

		// 刪除區域
		deleteZone: locationApi.deleteZone,

		// ========== 錯誤追蹤 API ==========

		// 記錄照明區域錯誤
		reportError: errorTrackingApi.reportError,

		// 清除照明區域錯誤
		clearError: errorTrackingApi.clearError
	};
};
