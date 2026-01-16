import type { UnifiedFloor, UnifiedLocation, SystemType, LocationSystem } from "~/types/location";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

/**
 * 統一地點管理 API（多系統架構）
 */
export const useLocationApi = () => {
	const { request } = useApiBase();

	/**
	 * 構建系統類型參數（輔助函數，避免重複邏輯）
	 */
	const buildSystemTypeParams = (systemType?: SystemType): Record<string, unknown> => {
		const params: Record<string, unknown> = {};
		if (systemType) {
			params.locationType = systemType; // 後端仍使用 locationType 參數名
		}
		return params;
	};

	return {
		/**
		 * 取得樓層列表
		 * @param systemType 可選：篩選特定系統類型的地點
		 */
		getFloors: (systemType?: SystemType) => {
			const params = buildSystemTypeParams(systemType);
			const path = buildPathWithQuery("/locations/floors", params);
			return request<{ floors: UnifiedFloor[] }>(path);
		},

		/**
		 * 取得單一樓層
		 */
		getFloor: (id: string, systemType?: SystemType) => {
			const params = buildSystemTypeParams(systemType);
			const path = buildPathWithQuery(`/locations/floors/${id}`, params);
			return request<{ floor: UnifiedFloor }>(path);
		},

		/**
		 * 建立樓層
		 */
		createFloor: (data: {
			name: string;
			buildingId?: number;
			floorNumber?: number;
			imageUrl?: string;
			description?: string;
			locations?: Omit<UnifiedLocation, "id" | "floorId">[];
		}) => {
			return request<{ merged: boolean; message: string; floor: UnifiedFloor }>("/locations/floors", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		/**
		 * 更新樓層
		 */
		updateFloor: (
			id: string,
			data: {
				name?: string;
				buildingId?: number;
				floorNumber?: number;
				imageUrl?: string;
				description?: string;
				locations?: (UnifiedLocation | Omit<UnifiedLocation, "id" | "floorId">)[];
			}
		) => {
			return request<{ merged: boolean; message: string; floor: UnifiedFloor }>(
				`/locations/floors/${id}`,
				{
					method: "PUT",
					body: JSON.stringify(data)
				}
			);
		},

		/**
		 * 刪除樓層
		 */
		deleteFloor: (id: string) => {
			return request<{ message: string }>(`/locations/floors/${id}`, {
				method: "DELETE"
			});
		},

		/**
		 * 取得單一地點（含所有系統）
		 */
		getLocation: (id: string) => {
			return request<{ location: UnifiedLocation }>(`/locations/${id}`);
		},

		/**
		 * 建立地點（含系統）
		 */
		createLocation: (data: {
			floorId: string;
			name: string;
			description?: string;
			systems?: Omit<LocationSystem, "id">[];
		}) => {
			return request<{ message: string; location: UnifiedLocation }>("/locations", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		/**
		 * 更新地點（含系統）
		 */
		updateLocation: (
			id: string,
			data: {
				name?: string;
				description?: string;
				systems?: (LocationSystem | Omit<LocationSystem, "id">)[];
			}
		) => {
			return request<{ message: string; location: UnifiedLocation }>(`/locations/${id}`, {
				method: "PUT",
				body: JSON.stringify(data)
			});
		},

		/**
		 * 刪除地點
		 */
		deleteLocation: (id: string) => {
			return request<{ message: string }>(`/locations/${id}`, {
				method: "DELETE"
			});
		}
	};
};
