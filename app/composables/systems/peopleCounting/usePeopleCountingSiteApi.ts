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
 * 工地配置介面
 */
interface SiteConfig {
	siteId: number;
	siteName: string;
	region: string;
	personGroupIds: number[]; // 對應的 person_group.id
	status?: "active" | "equipment_anomaly" | "intrusion_detected";
}

/**
 * 人流統計工地配置 API
 */
export const usePeopleCountingSiteApi = () => {
	const siteApiLogger = logger.createLogger("PeopleCounting Site API");
	const { request } = useApiBase();
	const locationApi = usePeopleCountingLocationApi();

	/**
	 * 從地點管理系統取得工地配置（保留供其他 composables 使用）
	 */
	const getSiteConfigFromLocationApi = async (siteId: number): Promise<SiteConfig | null> => {
		try {
			const floorsResponse = await locationApi.getFloors();
			const floors = floorsResponse.floors || [];

			// 查找對應的工地地點
			for (const floor of floors) {
				for (const location of floor.locations || []) {
					const locationId = location.id ? Number(location.id) : undefined;
					if (locationId === siteId && location.personGroupIds && location.personGroupIds.length > 0) {
						const region = extractRegionFromFloorName(floor.name) || "未分類";
						return {
							siteId,
							siteName: location.name,
							region,
							personGroupIds: location.personGroupIds,
							status: "active" as const
						};
					}
				}
			}

			return null;
		} catch (error) {
			siteApiLogger.error("從地點管理系統取得工地配置失敗", { siteId, error });
			return null;
		}
	};

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

			// 取得單位列表
			const units = await getSiteUnits(siteId);

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

	/**
	 * 取得工地統計（今日進場/出場人數）
	 * 使用後端 API，後端已處理統計計算
	 */
	const getSiteStats = async (
		siteId: number
	): Promise<{ entryCount: number; exitCount: number }> => {
		try {
			const response = await request<{
				entryCount: number;
				exitCount: number;
				currentCount: number;
			}>("/people-counting/sites/" + siteId + "/stats");

			return {
				entryCount: response.entryCount,
				exitCount: response.exitCount
			};
		} catch (error) {
			siteApiLogger.error("取得工地統計失敗", { siteId, error });
			throw error;
		}
	};

	/**
	 * 取得工地單位列表（進場單位）
	 * 從工地詳情中取得單位列表
	 */
	const getSiteUnits = async (siteId: number): Promise<PeopleCountingUnit[]> => {
		try {
			const siteDetail = await getSiteDetail(siteId);
			return siteDetail.units || [];
		} catch (error) {
			siteApiLogger.error("取得工地單位列表失敗", { siteId, error });
			throw error;
		}
	};

	return {
		getSiteConfigFromLocationApi,
		getSites,
		getSiteDetail,
		getSiteStats,
		getSiteUnits
	};
};
