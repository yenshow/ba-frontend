import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

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

	return {
		getPersonInfo,
		getPersonPicture,
	};
};

