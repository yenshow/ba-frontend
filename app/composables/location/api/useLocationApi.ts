import type { UnifiedZone, UnifiedLocation, SystemType, LocationSystem, UnifiedLocationInput } from "~/types/location";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

/**
 * 統一地點管理 API（多系統架構）
 */
export const useLocationApi = () => {
	const { request } = useApiBase();

	const buildSystemTypeParams = (systemType?: SystemType): Record<string, unknown> => {
		const params: Record<string, unknown> = {};
		if (systemType) {
			params.locationType = systemType; // 後端仍使用 locationType 參數名
		}
		return params;
	};

	return {
		getZones: (systemType?: SystemType) => {
			const params = buildSystemTypeParams(systemType);
			const path = buildPathWithQuery("/locations/zones", params);
			return request<{ zones: UnifiedZone[] }>(path);
		},

		getZone: (id: string, systemType?: SystemType) => {
			const params = buildSystemTypeParams(systemType);
			const path = buildPathWithQuery(`/locations/zones/${id}`, params);
			return request<{ zone: UnifiedZone }>(path);
		},

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

		deleteZone: (id: string) => {
			return request<{ message: string }>(`/locations/zones/${id}`, {
				method: "DELETE"
			});
		},

		getLocation: (id: string) => {
			return request<{ location: UnifiedLocation }>(`/locations/${id}`);
		},

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

		deleteLocation: (id: string) => {
			return request<{ message: string }>(`/locations/${id}`, {
				method: "DELETE"
			});
		}
	};
};

