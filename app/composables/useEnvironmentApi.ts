import type { EnvironmentFloor, EnvironmentLocation, SensorReading } from "~/types/environment";
import { useApiBase } from "~/composables/useApiBase";

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

	return {
		// ========== 樓層管理 API ==========
		// 注意：位置（locations）統一通過樓層的 locations 來管理
		// 所有操作都通過樓層管理 API 進行

		// 取得樓層列表
		getFloors: () => {
			return request<{ floors: EnvironmentFloor[] }>("/environment/floors");
		},

		// 取得單一樓層
		getFloor: (id: string) => {
			return request<{ floor: EnvironmentFloor }>(`/environment/floors/${id}`);
		},

		// 建立樓層
		createFloor: (data: CreateEnvironmentFloorData) => {
			return request<{ message: string; floor: EnvironmentFloor }>("/environment/floors", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		// 更新樓層
		updateFloor: (id: string, data: UpdateEnvironmentFloorData) => {
			return request<{ message: string; floor: EnvironmentFloor }>(`/environment/floors/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		// 刪除樓層
		deleteFloor: (id: string) => {
			return request<{ message: string }>(`/environment/floors/${id}`, {
				method: "DELETE"
			});
		},

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
			const params = new URLSearchParams();
			if (options?.startTime) params.append("startTime", options.startTime);
			if (options?.endTime) params.append("endTime", options.endTime);
			if (options?.limit) params.append("limit", String(options.limit));

			const queryString = params.toString();
			return request<{ readings: SensorReading[] }>(
				`/environment/readings/${locationId}${queryString ? `?${queryString}` : ""}`
			);
		},

		// ========== 錯誤追蹤 API ==========

		// 記錄環境位置錯誤
		reportError: (locationId: string | number, errorMessage?: string) => {
			return request<{ success: boolean; alertCreated: boolean }>(
				`/environment/locations/${locationId}/errors`,
				{
					method: "POST",
					body: JSON.stringify({ errorMessage: errorMessage || "無法讀取感測器資料" })
				}
			);
		},

		// 清除環境位置錯誤
		clearError: (locationId: string | number) => {
			return request<{ success: boolean }>(`/environment/locations/${locationId}/errors`, {
				method: "DELETE"
			});
		}
	};
};
