import type { LightingFloor, LightingArea } from "~/types/lighting";
import type { UnifiedFloor, UnifiedLocation } from "~/types/location";
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory";
import { useLocationApi } from "~/composables/systems/useLocationApi";
import {
	backendToLightingFloor,
	lightingToUnifiedFloor,
	lightingAreaToUnified
} from "~/utils/locationAdapter";

export interface CreateLightingFloorData {
	name: string;
	imageUrl?: string;
	areas?: Omit<LightingArea, "id">[];
}

export interface UpdateLightingFloorData {
	name?: string;
	imageUrl?: string;
	areas?: (LightingArea | Omit<LightingArea, "id">)[];
}

export const useLightingApi = () => {
	const locationApi = useLocationApi();

	// 使用通用 Factory 創建錯誤追蹤 API
	const errorTrackingApi = useErrorTrackingApiFactory("/lighting/areas", "無法讀取照明設備資料");

	return {
		// ========== 樓層管理 API ==========
		// 注意：區域（areas，即點位）統一通過樓層的 areas 來管理
		// 所有操作都通過統一地點管理 API 進行

		// 取得樓層列表
		getFloors: async () => {
			const response = await locationApi.getFloors("lighting");
			return {
				floors: response.floors.map(floor => backendToLightingFloor(floor))
			};
		},

		// 取得單一樓層
		getFloor: async (id: string) => {
			const response = await locationApi.getFloor(id, "lighting");
			return {
				floor: backendToLightingFloor(response.floor)
			};
		},

		// 建立樓層
		createFloor: async (data: CreateLightingFloorData) => {
			const unifiedData = lightingToUnifiedFloor(
				{ name: data.name, imageUrl: data.imageUrl, areas: data.areas || [] },
				"lighting"
			);
			const response = await locationApi.createFloor(unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				floor: backendToLightingFloor(response.floor)
			};
		},

		// 更新樓層
		updateFloor: async (id: string, data: UpdateLightingFloorData) => {
			// 直接構建統一格式資料（後端支援部分更新）
			const unifiedData: {
				name?: string;
				imageUrl?: string;
				locations?: (UnifiedLocation | Omit<UnifiedLocation, "id" | "floorId">)[];
			} = {};

			if (data.name !== undefined) {
				unifiedData.name = data.name;
			}

			if (data.imageUrl !== undefined) {
				unifiedData.imageUrl = data.imageUrl;
			}

			if (data.areas !== undefined) {
				// 將照明區域轉換為統一格式
				// 轉換函數返回 Omit<UnifiedLocation, "floorId">，符合 updateFloor 的類型要求
				unifiedData.locations = data.areas.map(area => {
					const converted = lightingAreaToUnified(area, "lighting");
					// 如果有 id，保留它；如果沒有，則符合 Omit<UnifiedLocation, "id" | "floorId">
					return converted as UnifiedLocation | Omit<UnifiedLocation, "id" | "floorId">;
				});
			}

			const response = await locationApi.updateFloor(id, unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				floor: backendToLightingFloor(response.floor)
			};
		},

		// 刪除樓層
		deleteFloor: locationApi.deleteFloor,

		// ========== 錯誤追蹤 API ==========

		// 記錄照明區域錯誤
		reportError: errorTrackingApi.reportError,

		// 清除照明區域錯誤
		clearError: errorTrackingApi.clearError
	};
};
