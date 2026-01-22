import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import { useSystemLocationApiFactory } from "~/composables/systems/location/useSystemLocationApiFactory";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { logger } from "~/utils/logger";
import {
	backendToPeopleCountingZone,
	peopleCountingToUnifiedZone,
	peopleCountingLocationToUnified
} from "~/utils/locationAdapter";

const peopleCountingLogger = logger.createLogger("PeopleCounting");

// 地點名稱快取（locationId -> locationName）
const locationNameCache = new Map<number, string | null>();

export interface CreatePeopleCountingZoneData {
	name: string;
	locations?: Omit<PeopleCountingLocation, "id">[];
}

export interface UpdatePeopleCountingZoneData {
	name?: string;
	locations?: (PeopleCountingLocation | Omit<PeopleCountingLocation, "id">)[];
}

/**
 * 人流統計地點管理 API Composable
 * 參考 useEnvironmentApi，用於管理地點名稱和地點配置
 *
 * 注意：人流統計地點也可以通過獨立 API (/api/people-counting/locations) 管理
 * 但樓層管理統一使用 /api/locations API
 */
export const usePeopleCountingLocationApi = () => {
	const locationApi = useLocationApi();
	const { request } = useApiBase();

	// 使用通用 Factory 創建區域管理 API
	const zoneApi = useSystemLocationApiFactory<PeopleCountingZone, PeopleCountingLocation>({
		systemType: "people_counting",
		backendToSystemZone: backendToPeopleCountingZone,
		systemToUnifiedZone: (zone) => peopleCountingToUnifiedZone(zone, "people_counting"),
		locationToUnified: peopleCountingLocationToUnified
	});

	return {
		// ========== 區域管理 API ==========
		// 注意：地點（locations）統一通過區域的 locations 來管理
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

		// ========== 地點管理 API（獨立 API，用於直接管理地點）==========
		// 注意：這些 API 使用 /api/people-counting/locations，不是統一 API

		// 取得地點列表（直接調用 /api/people-counting/locations）
		getLocations: async (zoneId?: string) => {
			const params: Record<string, unknown> = {};
			if (zoneId) params.zoneId = zoneId;

			const path = buildPathWithQuery("/people-counting/locations", params);
			const response = await request<{ locations: PeopleCountingLocation[] }>(path);
			return response;
		},

		// 取得單一地點
		getLocation: async (id: string) => {
			const response = await request<{ location: PeopleCountingLocation }>(
				`/people-counting/locations/${id}`
			);
			return response;
		},

		// 建立地點
		createLocation: async (data: {
			name: string;
			zoneId: string;
			personGroupIds: number[];
			entryDoorId: number;
			exitDoorId: number;
		}) => {
			const response = await request<{ message: string; location: PeopleCountingLocation }>(
				"/people-counting/locations",
				{
					method: "POST",
					body: JSON.stringify(data)
				}
			);
			return response;
		},

		// 更新地點
		updateLocation: async (
			id: string,
			data: {
				name?: string;
				personGroupIds?: number[];
				entryDoorId?: number;
				exitDoorId?: number;
			}
		) => {
			const response = await request<{ message: string; location: PeopleCountingLocation }>(
				`/people-counting/locations/${id}`,
				{
					method: "PUT",
					body: JSON.stringify(data)
				}
			);
			return response;
		},

		// 刪除地點
		deleteLocation: async (id: string) => {
			const response = await request<{ message: string }>(`/people-counting/locations/${id}`, {
				method: "DELETE"
			});
			return response;
		},

		// ========== 地點名稱查詢 API ==========

		/**
		 * 根據地點 ID 取得地點名稱
		 * 從地點管理系統中查找對應的地點名稱
		 * 使用快取機制優化性能，避免重複查詢
		 * 
		 * @param locationId - 地點 ID（業務層的數字 ID）
		 * @returns 地點名稱，如果找不到則返回 null
		 */
		getLocationName: async (locationId: number): Promise<string | null> => {
			// 檢查快取
			if (locationNameCache.has(locationId)) {
				return locationNameCache.get(locationId) || null;
			}

			try {
				// 取得所有區域和地點（只查詢一次，後續使用快取）
				const zonesResponse = await locationApi.getZones("people_counting");
				const zones = zonesResponse.zones.map(zone => backendToPeopleCountingZone(zone));

				// 建立完整的快取映射（一次查詢，多次使用）
				for (const zone of zones) {
					for (const location of zone.locations || []) {
						// 檢查地點的 personGroupIds 是否包含 locationId
						if (location.personGroupIds?.includes(locationId)) {
							locationNameCache.set(locationId, location.name);
							return location.name;
						}
						// 或者地點 ID 是否等於 locationId（如果使用地點 ID 作為業務 ID）
						if (location.id === String(locationId)) {
							locationNameCache.set(locationId, location.name);
							return location.name;
						}
					}
				}

				// 如果沒找到，快取 null 值，避免重複查詢
				locationNameCache.set(locationId, null);
				return null;
			} catch (error) {
				// 靜默處理錯誤，避免影響主流程
				peopleCountingLogger.error("取得地點名稱失敗", { locationId, error });
				return null;
			}
		}
	};
};
