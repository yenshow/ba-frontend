import type { EnvironmentFloor, EnvironmentLocation, SensorReading } from "~/types/environment";
import type { UnifiedFloor, UnifiedLocation } from "~/types/location";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory";
import { useLocationApi } from "~/composables/systems/useLocationApi";
import {
	backendToEnvironmentFloor,
	environmentToUnifiedFloor,
	environmentLocationToUnified
} from "~/utils/locationAdapter";

export interface CreateEnvironmentFloorData {
	name: string;
	locations?: Omit<EnvironmentLocation, "id">[];
}

export interface UpdateEnvironmentFloorData {
	name?: string;
	locations?: (EnvironmentLocation | Omit<EnvironmentLocation, "id">)[];
}

export interface SaveReadingData {
	locationId: string;
	timestamp: string;
	data: {
		pm25?: number | null;
		pm10?: number | null;
		tvoc?: number | null;
		hcho?: number | null;
		humidity?: number | null;
		temperature?: number | null;
		co2?: number | null;
		noise?: number | null;
		wind?: number | null;
	};
}

export interface GetReadingsOptions {
	startTime?: string;
	endTime?: string;
	limit?: number;
}

export const useEnvironmentApi = () => {
	const { request } = useApiBase();
	const locationApi = useLocationApi();

	// 使用通用 Factory 創建錯誤追蹤 API
	const errorTrackingApi = useErrorTrackingApiFactory(
		"/environment/locations",
		"無法讀取感測器資料"
	);

	return {
		// ========== 樓層管理 API ==========
		// 注意：位置（locations）統一通過樓層的 locations 來管理
		// 所有操作都通過統一地點管理 API 進行

		// 取得樓層列表
		getFloors: async () => {
			const response = await locationApi.getFloors("environment");
			return {
				floors: response.floors.map((floor) => backendToEnvironmentFloor(floor))
			};
		},

		// 取得單一樓層
		getFloor: async (id: string) => {
			const response = await locationApi.getFloor(id, "environment");
			return {
				floor: backendToEnvironmentFloor(response.floor)
			};
		},

		// 建立樓層
		createFloor: async (data: CreateEnvironmentFloorData) => {
			const unifiedData = environmentToUnifiedFloor(
				{ name: data.name, locations: data.locations || [] },
				"environment"
			);
			const response = await locationApi.createFloor(unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				floor: backendToEnvironmentFloor(response.floor)
			};
		},

		// 更新樓層
		updateFloor: async (id: string, data: UpdateEnvironmentFloorData) => {
			// 直接構建統一格式資料（後端支援部分更新）
			const unifiedData: {
				name?: string;
				locations?: (UnifiedLocation | Omit<UnifiedLocation, "id" | "floorId">)[];
			} = {};
			
			if (data.name !== undefined) {
				unifiedData.name = data.name;
			}
			
			if (data.locations !== undefined) {
				// 將環境監測地點轉換為統一格式
				// 轉換函數返回 Omit<UnifiedLocation, "floorId">，符合 updateFloor 的類型要求
				unifiedData.locations = data.locations.map((loc) => {
					const converted = environmentLocationToUnified(loc, "environment");
					// 如果有 id，保留它；如果沒有，則符合 Omit<UnifiedLocation, "id" | "floorId">
					return converted as UnifiedLocation | Omit<UnifiedLocation, "id" | "floorId">;
				});
			}

			const response = await locationApi.updateFloor(id, unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				floor: backendToEnvironmentFloor(response.floor)
			};
		},

		// 刪除樓層
		deleteFloor: locationApi.deleteFloor,

		// ========== 感測器讀數 API ==========

		// 儲存感測器讀數
		saveReading: (data: SaveReadingData) => {
			return request<{ message: string; reading: SensorReading }>("/environment/readings", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 取得歷史讀數
		getReadings: (locationId: string, options?: GetReadingsOptions) => {
			const params: Record<string, unknown> = {};
			if (options?.startTime) params.startTime = options.startTime;
			if (options?.endTime) params.endTime = options.endTime;
			if (options?.limit) params.limit = options.limit;

			const path = buildPathWithQuery(`/environment/readings/${locationId}`, params);
			return request<{ readings: SensorReading[] }>(path);
		},

		// ========== 錯誤追蹤 API ==========

		// 記錄環境位置錯誤
		reportError: errorTrackingApi.reportError,

		// 清除環境位置錯誤
		clearError: errorTrackingApi.clearError
	};
};
