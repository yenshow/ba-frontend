/**
 * 人流統計工地配置 API Composable
 * 負責工地配置管理和工地相關 API
 * 
 * 重構說明：
 * - 使用後端新 API，移除前端業務邏輯計算
 * - 統計計算、事件類型判斷等由後端處理
 * - 前端只負責資料展示和簡單格式化
 */

import type { PeopleCountingSite, PeopleCountingUnit } from "~/types/peopleCounting";
import { useApiBase } from "~/composables/core/useApiBase";
import { usePeopleCountingLocationApi } from "~/composables/systems/usePeopleCountingLocationApi";
import { logger } from "~/utils/logger";
import { extractRegionFromFloorName } from "~/utils/peopleCountingAdapter";

/**
 * 人流統計工地配置 API
 */
export const usePeopleCountingSiteApi = () => {
	const siteApiLogger = logger.createLogger("PeopleCounting Site API");
	const { request } = useApiBase();
	const locationApi = usePeopleCountingLocationApi();

	/**
	 * 取得所有工地列表（含統計）
	 * 使用後端 API，後端已處理統計計算
	 */
	const getSites = async (): Promise<PeopleCountingSite[]> => {
		try {
			const response = await request<{ sites: Array<{
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
			}> }>("/people-counting/sites");

			// 取得樓層資訊以提取區域
			let floorsResponse;
			try {
				floorsResponse = await locationApi.getFloors();
			} catch (error) {
				siteApiLogger.warn("無法載入地點管理系統，使用預設區域", { error });
				floorsResponse = { floors: [] };
			}

			const floors = floorsResponse.floors || [];
			const locationMap = new Map<number, { floorName: string }>();

			floors.forEach(floor => {
				floor.locations?.forEach(location => {
					const siteId = location.id ? Number(location.id) : undefined;
					if (siteId) {
						locationMap.set(siteId, { floorName: floor.name });
					}
				});
			});

			// 轉換為前端格式
			return response.sites.map(site => {
				const locationInfo = locationMap.get(site.id);
				const region = locationInfo
					? extractRegionFromFloorName(locationInfo.floorName) || "未分類"
					: "未分類";

				return {
					id: site.id,
					name: site.name,
					region,
					status: "active" as const,
					entryCount: site.entryCount,
					exitCount: site.exitCount,
					units: site.units.map(unit => ({
						id: unit.id,
						siteId: site.id,
						name: unit.name,
						capacity: unit.totalCount,
						currentCount: unit.currentCount
					}))
				};
			});
		} catch (error) {
			siteApiLogger.error("取得工地列表失敗", { error });
			throw error;
		}
	};

	/**
	 * 取得單一工地詳情
	 * 使用後端 API，後端已處理統計計算
	 * 注意：units 需要從 getSites 結果中取得，因為後端 API 不返回 units
	 */
	const getSiteDetail = async (siteId: number): Promise<PeopleCountingSite> => {
		try {
			const response = await request<{
				location: {
					id: number;
					name: string;
					personGroupIds: number[];
				};
				stats: {
					entryCount: number;
					exitCount: number;
					currentCount: number;
				};
			}>("/people-counting/sites/" + siteId);

			// 取得樓層資訊以提取區域
			let floorsResponse;
			try {
				floorsResponse = await locationApi.getFloors();
			} catch (error) {
				siteApiLogger.warn("無法載入地點管理系統，使用預設區域", { error });
				floorsResponse = { floors: [] };
			}

			const floors = floorsResponse.floors || [];
			let region = "未分類";

			for (const floor of floors) {
				for (const location of floor.locations || []) {
					const locationId = location.id ? Number(location.id) : undefined;
					if (locationId === siteId) {
						region = extractRegionFromFloorName(floor.name) || "未分類";
						break;
					}
				}
				if (region !== "未分類") break;
			}

			// 從 getSites 結果中取得該工地的 units
			// 為了取得 units，我們需要調用 getSites 並查找對應的工地
			const sitesResponse = await getSites();
			const site = sitesResponse.find(s => s.id === siteId);
			const units = site?.units || [];

			return {
				id: response.location.id,
				name: response.location.name,
				region,
				status: "active" as const,
				entryCount: response.stats.entryCount,
				exitCount: response.stats.exitCount,
				units
			};
		} catch (error) {
			siteApiLogger.error("取得工地詳情失敗", { siteId, error });
			throw error;
		}
	};

	return {
		getSites,
		getSiteDetail
	};
};
