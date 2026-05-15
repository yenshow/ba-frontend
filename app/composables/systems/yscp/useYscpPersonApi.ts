import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

/** 批次人員資訊 API 回傳單筆（與人流統計人員名單大頭照同一來源） */
export interface YscpBatchPersonResult {
	personId: number | string;
	success: boolean;
	personInfo?: YscpPersonInfo;
	/** Base64 圖片（includePicture: true 時由 YSCP 取得，與人流人員名單相同） */
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
		return request<YscpPersonInfo>(
			buildPathWithQuery("/yscp/person/info", { personId: String(personId) })
		);
	};

	const getPersonPicture = async (
		personId: string | number,
		picUri: string
	): Promise<string> => {
		return request<string>(
			buildPathWithQuery("/yscp/person/picture", {
				personId: String(personId),
				picUri,
			})
		);
	};

	/**
	 * 批次取得人員資訊（含大頭照），與人流統計「人員名單」同一 YSCP 來源
	 */
	const getBatchPersonInfo = async (
		personIds: number[],
		includePicture = false
	): Promise<YscpBatchPersonResult[]> => {
		if (!personIds?.length) return [];
		const data = await request<{ results?: YscpBatchPersonResult[] }>("/yscp/person/batch-info", {
			method: "POST",
			body: {
				personIds: [...new Set(personIds)].filter(
					(id) => id != null && id > 0 && !Number.isNaN(id)
				),
				includePicture,
			},
		});
		return data?.results ?? [];
	};

	return {
		getPersonInfo,
		getPersonPicture,
		getBatchPersonInfo,
	};
};
