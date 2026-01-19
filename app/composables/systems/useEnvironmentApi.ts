import type { EnvironmentZone, EnvironmentLocation, SensorReading } from "~/types/environment";
import type { UnifiedZone, UnifiedLocation } from "~/types/location";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import {
	backendToEnvironmentZone,
	environmentToUnifiedZone,
	environmentLocationToUnified
} from "~/utils/locationAdapter";

export interface CreateEnvironmentZoneData {
	name: string;
	locations?: Omit<EnvironmentLocation, "id">[];
}

export interface UpdateEnvironmentZoneData {
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
		// ========== 區域管理 API ==========
		// 注意：位置（locations）統一通過區域的 locations 來管理
		// 所有操作都通過統一地點管理 API 進行

		// 取得區域列表
		getZones: async () => {
			const response = await locationApi.getZones("environment");
			return {
				zones: response.zones.map((zone) => backendToEnvironmentZone(zone))
			};
		},

		// 取得單一區域
		getZone: async (id: string) => {
			const response = await locationApi.getZone(id, "environment");
			return {
				zone: backendToEnvironmentZone(response.zone)
			};
		},

		// 建立區域
		createZone: async (data: CreateEnvironmentZoneData) => {
			const unifiedData = environmentToUnifiedZone(
				{ name: data.name, locations: data.locations || [] },
				"environment"
			);
			const response = await locationApi.createZone(unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: backendToEnvironmentZone(response.zone)
			};
		},

		// 更新區域
		updateZone: async (id: string, data: UpdateEnvironmentZoneData) => {
			// 直接構建統一格式資料（後端支援部分更新）
			const unifiedData: {
				name?: string;
				locations?: (UnifiedLocation | Omit<UnifiedLocation, "id" | "zoneId">)[];
			} = {};
			
			if (data.name !== undefined) {
				unifiedData.name = data.name;
			}
			
			if (data.locations !== undefined) {
				// 將環境監測地點轉換為統一格式
				unifiedData.locations = data.locations.map((loc) => {
					const converted = environmentLocationToUnified(loc, "environment");
					return converted as UnifiedLocation | Omit<UnifiedLocation, "id" | "zoneId">;
				});
			}

			const response = await locationApi.updateZone(id, unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: backendToEnvironmentZone(response.zone)
			};
		},

		// 刪除區域
		deleteZone: locationApi.deleteZone,

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
