import type { EnvironmentFloor, EnvironmentLocation, SensorReading } from "~/types/environment";
import { useApiBase } from "~/composables/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { useFloorApiFactory } from "~/composables/useFloorApiFactory";
import { useErrorTrackingApiFactory } from "~/composables/useErrorTrackingApiFactory";

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

	// 使用通用 Factory 創建樓層 CRUD API
	const floorApi = useFloorApiFactory<EnvironmentFloor>("/environment");

	// 使用通用 Factory 創建錯誤追蹤 API
	const errorTrackingApi = useErrorTrackingApiFactory(
		"/environment/locations",
		"無法讀取感測器資料"
	);

	return {
		// ========== 樓層管理 API ==========
		// 注意：位置（locations）統一通過樓層的 locations 來管理
		// 所有操作都通過樓層管理 API 進行

		// 取得樓層列表
		getFloors: floorApi.getFloors,

		// 取得單一樓層
		getFloor: floorApi.getFloor,

		// 建立樓層
		createFloor: floorApi.createFloor<CreateEnvironmentFloorData>,

		// 更新樓層
		updateFloor: floorApi.updateFloor<UpdateEnvironmentFloorData>,

		// 刪除樓層
		deleteFloor: floorApi.deleteFloor,

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
