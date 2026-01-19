import type { PeopleCountingZone, PeopleCountingLocation } from "~/types/peopleCounting";
import type { UnifiedZone, UnifiedLocation } from "~/types/location";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";
import { logger } from "~/utils/logger";
import {
	backendToPeopleCountingZone,
	peopleCountingToUnifiedZone,
	peopleCountingLocationToUnified
} from "~/utils/locationAdapter";

const peopleCountingLogger = logger.createLogger("PeopleCounting");

// 工地名稱快取（siteId -> siteName）
const siteNameCache = new Map<number, string | null>();

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
 * 參考 useEnvironmentApi，用於管理工地名稱和地點配置
 *
 * 注意：人流統計地點也可以通過獨立 API (/api/people-counting/locations) 管理
 * 但樓層管理統一使用 /api/locations API
 */
export const usePeopleCountingLocationApi = () => {
	const locationApi = useLocationApi();
	const { request } = useApiBase();

	return {
		// ========== 區域管理 API ==========
		// 注意：地點（locations）統一通過區域的 locations 來管理
		// 所有操作都通過統一地點管理 API 進行

		// 取得區域列表
		getZones: async () => {
			const response = await locationApi.getZones("people_counting");
			return {
				zones: response.zones.map(zone => backendToPeopleCountingZone(zone))
			};
		},

		// 取得單一區域
		getZone: async (id: string) => {
			const response = await locationApi.getZone(id, "people_counting");
			return {
				zone: backendToPeopleCountingZone(response.zone)
			};
		},

		// 建立區域
		createZone: async (data: CreatePeopleCountingZoneData) => {
			const unifiedData = peopleCountingToUnifiedZone(
				{ name: data.name, locations: data.locations || [] },
				"people_counting"
			);
			const response = await locationApi.createZone(unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: backendToPeopleCountingZone(response.zone)
			};
		},

		// 更新區域
		updateZone: async (id: string, data: UpdatePeopleCountingZoneData) => {
			// 直接構建統一格式資料（後端支援部分更新）
			const unifiedData: {
				name?: string;
				locations?: (UnifiedLocation | Omit<UnifiedLocation, "id" | "zoneId">)[];
			} = {};
			
			if (data.name !== undefined) {
				unifiedData.name = data.name;
			}
			
			if (data.locations !== undefined) {
				// 將人流統計地點轉換為統一格式
				unifiedData.locations = data.locations.map((loc) => {
					const converted = peopleCountingLocationToUnified(loc, "people_counting");
					// 如果有 id，保留它；如果沒有，則符合 Omit<UnifiedLocation, "id" | "zoneId">
					return converted as UnifiedLocation | Omit<UnifiedLocation, "id" | "zoneId">;
				});
			}

			const response = await locationApi.updateZone(id, unifiedData);
			return {
				merged: response.merged,
				message: response.message,
				zone: backendToPeopleCountingZone(response.zone)
			};
		},

		// 刪除區域
		deleteZone: locationApi.deleteZone,

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

		// ========== 工地名稱查詢 API ==========

		/**
		 * 根據工地 ID 取得工地名稱
		 * 從地點管理系統中查找對應的工地名稱
		 * 使用快取機制優化性能，避免重複查詢
		 */
		getSiteName: async (siteId: number): Promise<string | null> => {
			// 檢查快取
			if (siteNameCache.has(siteId)) {
				return siteNameCache.get(siteId) || null;
			}

			try {
				// 取得所有區域和地點（只查詢一次，後續使用快取）
				const zonesResponse = await locationApi.getZones("people_counting");
				const zones = zonesResponse.zones.map(zone => backendToPeopleCountingZone(zone));

				// 建立完整的快取映射（一次查詢，多次使用）
				for (const zone of zones) {
					for (const location of zone.locations || []) {
						// 檢查地點的 personGroupIds 是否包含 siteId
						if (location.personGroupIds?.includes(siteId)) {
							siteNameCache.set(siteId, location.name);
							return location.name;
						}
						// 或者地點 ID 是否等於 siteId（如果使用地點 ID 作為工地 ID）
						if (location.id === String(siteId)) {
							siteNameCache.set(siteId, location.name);
							return location.name;
						}
					}
				}

				// 如果沒找到，快取 null 值，避免重複查詢
				siteNameCache.set(siteId, null);
				return null;
			} catch (error) {
				// 靜默處理錯誤，避免影響主流程
				peopleCountingLogger.error("取得工地名稱失敗", { siteId, error });
				return null;
			}
		}
	};
};
