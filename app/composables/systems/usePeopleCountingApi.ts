/**
 * 人流統計 API Composable（主文件）
 *
 * 此文件作為入口點，委派給專用的子 composables：
 * - usePeopleCountingLocationBusinessApi: 地點配置和地點相關 API
 * - usePeopleCountingPersonnelApi: 人員管理 API
 * - usePeopleCountingEntryApi: 進出場記錄 API
 *
 * 架構說明：
 * - 地點（Location）：需要透過配置定義，將 person_group 映射到地點
 * - 區域（Zone）：對應到地點管理系統的區域
 * - 單位（Unit）：對應到 platform.person_group
 * - 人員（Personnel）：對應到 platform.person
 * - 進出場記錄（Log）：對應到 baseacs.slot_card_records
 *
 * 注意：所有資料都直接從外部資料庫查詢，不進行快取
 */

import type {
	PeopleCountingLocation,
	PeopleCountingUnit,
	PeopleCountingPersonnel,
	PeopleCountingLog,
	PeopleCountingZone
} from "~/types/peopleCounting";
import { usePeopleCountingLocationBusinessApi } from "./peopleCounting/usePeopleCountingLocationBusinessApi";
import { usePeopleCountingPersonnelApi } from "./peopleCounting/usePeopleCountingPersonnelApi";
import { usePeopleCountingEntryApi } from "./peopleCounting/usePeopleCountingEntryApi";

/**
 * 人流統計 API Composable（主入口）
 * 委派給專用的子 composables
 */
export const usePeopleCountingApi = () => {
	// 使用專用的子 composables
	const locationApi = usePeopleCountingLocationBusinessApi();
	const personnelApi = usePeopleCountingPersonnelApi();
	const entryApi = usePeopleCountingEntryApi();

	/**
	 * 取得所有地點列表（含統計）
	 * @param existingZones - 可選的現有區域列表，如果提供則直接使用，避免重複 API 調用
	 * @returns 返回地點列表和區域列表
	 */
	const getLocations = async (existingZones?: { zones: PeopleCountingZone[] }): Promise<{
		locations: PeopleCountingLocation[];
		zones: PeopleCountingZone[];
	}> => {
		return locationApi.getLocations(existingZones);
	};

	/**
	 * 取得單一地點詳情
	 * @param locationId - 地點 ID
	 * @param existingLocations - 可選的現有地點列表，如果提供則直接使用，避免重複 API 調用
	 */
	const getLocationDetail = async (
		locationId: number,
		existingLocations?: PeopleCountingLocation[]
	): Promise<PeopleCountingLocation> => {
		return locationApi.getLocationDetail(locationId, existingLocations);
	};


	/**
	 * 取得單位人員列表
	 * @param unitId - 單位 ID
	 * @param locationId - 地點 ID（可選，用於取得設備配置）
	 */
	const getUnitPersonnel = async (unitId: number, locationId?: number): Promise<PeopleCountingPersonnel[]> => {
		return personnelApi.getUnitPersonnel(unitId, locationId);
	};

	/**
	 * 取得地點進出場記錄
	 */
	const getLocationLogs = async (
		locationId: number,
		options?: { limit?: number; unitId?: number }
	): Promise<PeopleCountingLog[]> => {
		return entryApi.getLocationLogs(locationId, options);
	};

	return {
		// 地點相關 API
		getLocations,
		getLocationDetail,

		// 人員相關 API
		getUnitPersonnel,

		// 進出場記錄相關 API
		getLocationLogs
	};
};
