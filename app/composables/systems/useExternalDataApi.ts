import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

/**
 * 外部資料 API 回應格式
 */
export interface ExternalDataResponse<T> {
	success: boolean;
	data: T;
	pagination?: {
		limit: number;
		offset: number;
		count: number;
	};
	message?: string;
}

/**
 * 外部資料 API Composable
 * 用於查詢外部資料庫的資料（platform、baseacs schema）
 */
export const useExternalDataApi = () => {
	const { request } = useApiBase();

	/**
	 * 取得資料列表
	 * @param schema - Schema 名稱（如 'platform', 'baseacs'）
	 * @param table - 資料表名稱
	 * @param filters - 篩選參數
	 */
	const getList = async <T = any>(
		schema: string,
		table: string,
		filters: Record<string, any> = {}
	): Promise<ExternalDataResponse<T[]>> => {
		const path = buildPathWithQuery(`/external-data/${schema}/${table}`, filters);
		const data = await request<T[]>(path);
		return {
			success: true,
			data: Array.isArray(data) ? data : []
		} as ExternalDataResponse<T[]>;
	};

	/**
	 * 取得單筆資料
	 * @param schema - Schema 名稱
	 * @param table - 資料表名稱
	 * @param id - 資料 ID
	 */
	const getById = async <T = any>(
		schema: string,
		table: string,
		id: number
	): Promise<ExternalDataResponse<T>> => {
		const data = await request<T>(`/external-data/${schema}/${table}/${id}`);
		return {
			success: true,
			data: data as T
		} as ExternalDataResponse<T>;
	};

	/**
	 * 取得資料總數
	 * @param schema - Schema 名稱
	 * @param table - 資料表名稱
	 * @param filters - 篩選參數
	 */
	const getCount = async (
		schema: string,
		table: string,
		filters: Record<string, any> = {}
	): Promise<ExternalDataResponse<{ count: number }>> => {
		const path = buildPathWithQuery(`/external-data/${schema}/${table}/count`, filters);
		const data = await request<{ count: number }>(path);
		return {
			success: true,
			data: data || { count: 0 }
		} as ExternalDataResponse<{ count: number }>;
	};

	// ========== Platform Schema 專用方法 ==========

	/**
	 * 取得人員列表
	 */
	const getPersons = async (filters: {
		person_group_id?: number;
		person_type?: number;
		search?: string;
		limit?: number;
		offset?: number;
	} = {}) => {
		return getList("platform", "person", filters);
	};

	/**
	 * 取得人員群組列表
	 */
	const getPersonGroups = async (filters: {
		is_deleted?: number;
		search?: string;
		limit?: number;
		offset?: number;
	} = {}) => {
		return getList("platform", "person_group", filters);
	};

	/**
	 * 取得人員頭像
	 */
	const getPersonHeadPics = async (filters: {
		person_id?: number;
		limit?: number;
		offset?: number;
	} = {}) => {
		return getList("platform", "person_head_pic", filters);
	};

	// ========== Baseacs Schema 專用方法 ==========

	/**
	 * 取得刷卡記錄列表
	 */
	const getSlotCardRecords = async (filters: {
		person_id?: number;
		timeRange?: "last_hour" | "today" | "yesterday" | "this_week" | "last_week" | "last_30_days";
		startTime?: string;
		endTime?: string;
		is_deleted?: boolean;
		search?: string;
		limit?: number;
		offset?: number;
		orderBy?: string;
		orderDirection?: "ASC" | "DESC";
	} = {}) => {
		return getList("baseacs", "slot_card_records", filters);
	};

	/**
	 * 根據記錄 ID 獲取快照圖片
	 * @param id - 記錄 ID
	 */
	const getSlotCardRecordPicture = async (id: number): Promise<ExternalDataResponse<{
		recordId: number;
		picUri: string;
		image: string; // Base64 編碼的圖片數據
	}>> => {
		const data = await request<{
			recordId: number;
			picUri: string;
			image: string;
		}>(`/external-data/baseacs/slot_card_records/${id}/picture`);
		return {
			success: true,
			data: data as any
		} as ExternalDataResponse<{
			recordId: number;
			picUri: string;
			image: string;
		}>;
	};

	/**
	 * 根據 picUri 直接獲取圖片
	 * @param picUri - 圖片 URI
	 */
	const getPictureByUri = async (picUri: string): Promise<ExternalDataResponse<{
		picUri: string;
		image: string; // Base64 編碼的圖片數據
	}>> => {
		const data = await request<{
			picUri: string;
			image: string;
		}>(`/external-data/baseacs/slot_card_records/picture`, {
			method: "POST",
			body: JSON.stringify({ picUri })
		});
		return {
			success: true,
			data: data as any
		} as ExternalDataResponse<{
			picUri: string;
			image: string;
		}>;
	};

	return {
		// 通用方法
		getList,
		getById,
		getCount,
		// Platform Schema
		getPersons,
		getPersonGroups,
		getPersonHeadPics,
		// Baseacs Schema
		getSlotCardRecords,
		getSlotCardRecordPicture,
		getPictureByUri
	};
};

