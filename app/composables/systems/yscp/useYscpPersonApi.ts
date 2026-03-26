import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

/** 批次人員資訊 API 回傳單筆（與人流統計人員名單大頭照同一來源） */
export interface YscpBatchPersonResult {
	personId: number | string;
	success: boolean;
	personInfo?: YscpPersonInfo;
	picture?: string;
	pictureError?: string;
	error?: string;
}

export interface YscpPersonInfo {
	personId: string;
	personCode: string;
	personName: string;
	gender: number;
	orgIndexCode: string;
	personPhoto?: {
		picUri: string;
	};
	phoneNo: string;
	email: string;
	remark: string;
	beginTime: string;
	endTime: string;
	personFamilyName: string;
	personGivenName: string;
	cards: Array<{
		cardNo: string;
	}>;
	customFieldList: any[];
}

export const useYscpPersonApi = () => {
	const { request } = useApiBase();

	const getPersonInfo = async (personId: string | number): Promise<YscpPersonInfo> => {
		const data = await request<YscpPersonInfo>(
			buildPathWithQuery("/yscp/person/info", { personId: String(personId) })
		);
		return data;
	};

	const getPersonPicture = async (
		personId: string | number,
		picUri: string
	): Promise<string> => {
		const data = await request<string>(
			buildPathWithQuery("/yscp/person/picture", {
				personId: String(personId),
				picUri,
			})
		);
		return data;
	};

	const getBatchPersonInfo = async (
		personIds: number[],
		includePicture = false
	): Promise<YscpBatchPersonResult[]> => {
		if (!personIds?.length) return [];
		const raw = await request<{ code: string; data?: { results: YscpBatchPersonResult[] } }>(
			"/yscp/person/batch-info",
			{
				method: "POST",
				body: JSON.stringify({
					personIds: [...new Set(personIds)].filter((id) => id != null && id > 0 && !Number.isNaN(id)),
					includePicture
				})
			}
		);
		const results =
			(raw &&
				typeof raw === "object" &&
				(raw as { data?: { results?: YscpBatchPersonResult[] } }).data?.results) ??
			[];
		return results;
	};

	return {
		getPersonInfo,
		getPersonPicture,
		getBatchPersonInfo
	};
};

