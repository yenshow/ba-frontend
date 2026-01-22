/**
 * 人流統計地點配置 API Composable
 * 負責地點配置管理和地點相關 API
 * 
 * 重構說明：
 * - 使用後端新 API，移除前端業務邏輯計算
 * - 統計計算、事件類型判斷等由後端處理
 * - 前端只負責資料展示和簡單格式化
 * - 統一使用 location 命名，不再使用 site
 */

import type { PeopleCountingLocation, PeopleCountingUnit, PeopleCountingZone } from "~/types/peopleCounting";
import { useApiBase } from "~/composables/core/useApiBase";
import { usePeopleCountingLocationApi } from "~/composables/systems/location/usePeopleCountingLocationApi";
import { logger } from "~/utils/logger";
import { extractRegionFromZoneName } from "~/utils/peopleCountingAdapter";

/**
 * 人流統計地點業務 API
 * 注意：此 composable 處理業務邏輯層的 API（包含統計信息）
 * 配置層的 API 請使用 app/composables/systems/location/usePeopleCountingLocationApi
 */
export const usePeopleCountingLocationBusinessApi = () => {
	const locationApiLogger = logger.createLogger("PeopleCounting Location Business API");
	const { request } = useApiBase();
	const peopleCountingLocationApi = usePeopleCountingLocationApi();

	/**
	 * 取得所有地點列表（含統計）
	 * 使用後端 API，後端已處理統計計算
	 * 
	 * @param existingZones - 可選的現有區域列表，如果提供則直接使用，避免重複 API 調用
	 * @returns 返回地點列表和區域列表（用於共享數據）
	 */
	const getLocations = async (existingZones?: { zones: PeopleCountingZone[] }): Promise<{
		locations: PeopleCountingLocation[];
		zones: PeopleCountingZone[];
	}> => {
		try {
			// 並行請求 locations 和 zones（如果沒有提供現有 zones）
			const [locationsResponse, zonesResponse] = await Promise.all([
				request<{ sites: Array<{
					id: number;
					name: string;
					entryCount: number;
					exitCount: number;
					units: Array<{
						id: number;
						name: string;
						currentCount: number;
						totalCount: number;
					}>;
				}> }>("/people-counting/sites"), // 注意：後端 API 路徑可能還是 /sites
				existingZones 
					? Promise.resolve(existingZones)
					: peopleCountingLocationApi.getZones().catch(error => {
						locationApiLogger.warn("無法載入地點管理系統，使用預設區域", { error });
						return { zones: [] };
					})
			]);

			const zones = zonesResponse.zones || [];
			const locationMap = new Map<number, { zoneName: string }>();

			zones.forEach(zone => {
				zone.locations?.forEach(location => {
					const locationId = location.id ? Number(location.id) : undefined;
					if (locationId) {
						locationMap.set(locationId, { zoneName: zone.name });
					}
				});
			});

			// 轉換為前端格式
			const locations = locationsResponse.sites.map(site => {
				const locationInfo = locationMap.get(site.id);
				const region = locationInfo
					? extractRegionFromZoneName(locationInfo.zoneName) || "未分類"
					: "未分類";

				return {
					locationId: site.id, // 業務層的地點 ID
					name: site.name,
					region,
					status: "active" as const,
					entryCount: site.entryCount,
					exitCount: site.exitCount,
					units: site.units.map(unit => ({
						id: unit.id,
						locationId: site.id, // 改為 locationId
						name: unit.name,
						capacity: unit.totalCount,
						currentCount: unit.currentCount
					}))
				} as PeopleCountingLocation;
			});

			return { locations, zones };
		} catch (error) {
			locationApiLogger.error("取得地點列表失敗", { error });
			throw error;
		}
	};

	/**
	 * 取得單一地點詳情
	 * 注意：為了確保統計數字與 getLocations 一致，直接從 getLocations 結果中取得
	 * 
	 * @param locationId - 地點 ID
	 * @param existingLocations - 可選的現有地點列表，如果提供則直接使用，避免重複 API 調用
	 */
	const getLocationDetail = async (
		locationId: number,
		existingLocations?: PeopleCountingLocation[]
	): Promise<PeopleCountingLocation> => {
		try {
			// 如果提供了現有列表，直接使用
			if (existingLocations) {
				const location = existingLocations.find(l => l.locationId === locationId);
				if (location) {
					return location;
				}
			}

			// 否則從 API 獲取
			const locationsResponse = await getLocations();
			const location = locationsResponse.locations.find(l => l.locationId === locationId);
			
			if (!location) {
				throw new Error(`找不到地點 ID: ${locationId}`);
			}

			return location;
		} catch (error) {
			locationApiLogger.error("取得地點詳情失敗", { locationId, error });
			throw error;
		}
	};

	return {
		getLocations,
		getLocationDetail
	};
};

