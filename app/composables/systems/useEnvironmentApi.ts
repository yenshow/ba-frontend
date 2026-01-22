import type { EnvironmentZone, EnvironmentLocation, SensorReading } from "~/types/environment";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { useErrorTrackingApiFactory } from "~/composables/factories/useErrorTrackingApiFactory";
import { useSystemLocationApiFactory } from "~/composables/systems/location/useSystemLocationApiFactory";
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

	// 使用通用 Factory 創建區域管理 API
	const zoneApi = useSystemLocationApiFactory<EnvironmentZone, EnvironmentLocation>({
		systemType: "environment",
		backendToSystemZone: backendToEnvironmentZone,
		systemToUnifiedZone: (zone) => environmentToUnifiedZone(zone, "environment"),
		locationToUnified: environmentLocationToUnified
	});

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
		getZones: zoneApi.getZones,

		// 取得單一區域
		getZone: zoneApi.getZone,

		// 建立區域
		createZone: zoneApi.createZone,

		// 更新區域
		updateZone: zoneApi.updateZone,

		// 刪除區域
		deleteZone: zoneApi.deleteZone,

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
