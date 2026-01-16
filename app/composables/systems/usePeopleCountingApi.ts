/**
 * 人流統計 API Composable（主文件）
 *
 * 此文件作為入口點，委派給專用的子 composables：
 * - usePeopleCountingSiteApi: 工地配置和工地相關 API
 * - usePeopleCountingPersonnelApi: 人員管理 API
 * - usePeopleCountingEntryApi: 進出場記錄 API
 *
 * 架構說明：
 * - 工地（Site）：需要透過配置定義，將 person_group 映射到工地
 * - 單位（Unit）：對應到 platform.person_group
 * - 人員（Personnel）：對應到 platform.person
 * - 進出場記錄（Log）：對應到 baseacs.slot_card_records
 *
 * 注意：所有資料都直接從外部資料庫查詢，不進行快取
 */

import type {
	PeopleCountingSite,
	PeopleCountingUnit,
	PeopleCountingPersonnel,
	PeopleCountingLog
} from "~/types/peopleCounting";
import { usePeopleCountingSiteApi } from "./peopleCounting/usePeopleCountingSiteApi";
import { usePeopleCountingPersonnelApi } from "./peopleCounting/usePeopleCountingPersonnelApi";
import { usePeopleCountingEntryApi } from "./peopleCounting/usePeopleCountingEntryApi";

/**
 * 人流統計 API Composable（主入口）
 * 委派給專用的子 composables
 */
export const usePeopleCountingApi = () => {
	// 使用專用的子 composables
	const siteApi = usePeopleCountingSiteApi();
	const personnelApi = usePeopleCountingPersonnelApi();
	const entryApi = usePeopleCountingEntryApi();

	/**
	 * 取得所有工地列表（含統計）
	 */
	const getSites = async (): Promise<PeopleCountingSite[]> => {
		return siteApi.getSites();
	};

	/**
	 * 取得單一工地詳情
	 */
	const getSiteDetail = async (siteId: number): Promise<PeopleCountingSite> => {
		return siteApi.getSiteDetail(siteId);
	};


	/**
	 * 取得單位人員列表
	 */
	const getUnitPersonnel = async (unitId: number): Promise<PeopleCountingPersonnel[]> => {
		return personnelApi.getUnitPersonnel(unitId);
	};

	/**
	 * 取得工地進出場記錄
	 */
	const getSiteLogs = async (
		siteId: number,
		options?: { limit?: number; unitId?: number }
	): Promise<PeopleCountingLog[]> => {
		return entryApi.getSiteLogs(siteId, options);
	};

	return {
		// 工地相關 API
		getSites,
		getSiteDetail,

		// 人員相關 API
		getUnitPersonnel,

		// 進出場記錄相關 API
		getSiteLogs
	};
};
