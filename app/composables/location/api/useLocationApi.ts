import type { UnifiedZone, UnifiedLocation, SystemType, LocationSystem, UnifiedLocationInput } from "~/types/location";
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
		 * 取得區域列表
		 * @param systemType 可選：篩選特定系統類型的地點
		 */
		getZones: (systemType?: SystemType) => {
			const params = buildSystemTypeParams(systemType);
			const path = buildPathWithQuery("/locations/zones", params);
			return request<{ zones: UnifiedZone[] }>(path);
		},

		/**
		 * 取得單一區域
		 */
		getZone: (id: string, systemType?: SystemType) => {
			const params = buildSystemTypeParams(systemType);
			const path = buildPathWithQuery(`/locations/zones/${id}`, params);
			return request<{ zone: UnifiedZone }>(path);
		},

		/**
		 * 建立區域
		 */
		createZone: (data: {
			name: string;
			buildingId?: number;
			imageUrl?: string;
			description?: string;
			sortOrder?: number;
			locations?: UnifiedLocationInput[];
		}) => {
			return request<{ merged: boolean; message: string; zone: UnifiedZone }>("/locations/zones", {
				method: "POST",
				body: JSON.stringify(data)
			});
		},

		/**
		 * 更新區域
		 */
		updateZone: (
			id: string,
			data: {
				name?: string;
				buildingId?: number;
				imageUrl?: string;
				description?: string;
				sortOrder?: number;
				locations?: (UnifiedLocation | UnifiedLocationInput)[];
			}
		) => {
			return request<{ merged: boolean; message: string; zone: UnifiedZone }>(
				`/locations/zones/${id}`,
				{
					method: "PUT",
					body: JSON.stringify(data)
				}
			);
		},

		/**
		 * 刪除區域
		 */
		deleteZone: (id: string) => {
			return request<{ message: string }>(`/locations/zones/${id}`, {
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
			zoneId: string;
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

