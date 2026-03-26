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

	const getPersons = async (
		filters: {
			person_group_id?: number;
			person_type?: number;
			search?: string;
			limit?: number;
			offset?: number;
		} = {}
	) => {
		return getList("platform", "person", filters);
	};

	const getPersonGroups = async (
		filters: {
			is_deleted?: number;
			search?: string;
			limit?: number;
			offset?: number;
		} = {}
	) => {
		return getList("platform", "person_group", filters);
	};

	const getSlotCardRecords = async (
		filters: {
			person_id?: number;
			timeRange?: "today";
			startTime?: string;
			endTime?: string;
			is_deleted?: boolean;
			search?: string;
			limit?: number;
			offset?: number;
			orderBy?: string;
			orderDirection?: "ASC" | "DESC";
		} = {}
	) => {
		return getList("baseacs", "slot_card_records", filters);
	};

	const getSlotCardRecordPicture = async (
		id: number
	): Promise<
		ExternalDataResponse<{
			recordId: number;
			picUri: string;
			image: string;
		}>
	> => {
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

	const getPictureByUri = async (picUri: string) => {
		type PictureResult = {
			picUri: string;
			image: string;
		};

		const data = await request<PictureResult>(`/external-data/baseacs/slot_card_records/picture`, {
			method: "POST",
			body: JSON.stringify({ picUri })
		});
		return {
			success: true,
			data
		} as ExternalDataResponse<PictureResult>;
	};

	const getBatchPicturesByUri = async (picUris: string[]) => {
		type BatchPictureResult = {
			results: Array<{
				picUri: string;
				success: boolean;
				image?: string;
				error?: string;
			}>;
			total: number;
			success: number;
			failed: number;
		};

		const data = await request<BatchPictureResult>(
			`/external-data/baseacs/slot_card_records/pictures`,
			{
				method: "POST",
				body: JSON.stringify({ picUris })
			}
		);
		return {
			success: true,
			data
		} as ExternalDataResponse<BatchPictureResult>;
	};

	return {
		getList,
		getById,
		getCount,
		getPersons,
		getPersonGroups,
		getSlotCardRecords,
		getSlotCardRecordPicture,
		getPictureByUri,
		getBatchPicturesByUri
	};
};

