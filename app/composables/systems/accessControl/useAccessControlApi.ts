/**
 * 門禁設備 ISAPI 代理 API（後端 /api/access-control/*）
 * 需認證；寫入類需管理員或操作員。
 */
import { useApiBase } from "~/composables/core/useApiBase";

/** 人員簡化欄位（與後端回傳一致） */
export interface AccessControlUserInfo {
	employeeNo?: string;
	name?: string;
	userType?: string;
	Valid?: { enable?: boolean; beginTime?: string; endTime?: string };
	doorRight?: string;
	RightPlan?: Array<{ doorNo?: number; planTemplateNo?: string }>;
	faceURL?: string;
}

export interface SearchUserInfoResult {
	list: AccessControlUserInfo[];
	totalMatches: number;
	numOfMatches: number;
}

export interface UserInfoPayload {
	employeeNo: string;
	name?: string;
	userType?: string;
	Valid?: { enable?: boolean; beginTime?: string; endTime?: string };
	doorRight?: string;
	RightPlan?: Array<{ doorNo: number; planTemplateNo: string }>;
	userVerifyMode?: string;
	password?: string;
	[key: string]: unknown;
}

export const useAccessControlApi = () => {
	const { request } = useApiBase();

	return {
		/** 取得門禁設備上的人員列表 */
		searchUserInfo: (
			deviceId: number,
			params?: { searchResultPosition?: number; maxResults?: number }
		) => {
			return request<SearchUserInfoResult>(
				`/access-control/devices/${deviceId}/user-info`,
				{
					method: "POST",
					body: JSON.stringify(params ?? {}),
				}
			);
		},

		/** 修改單一人員資料 */
		updateUserInfo: (deviceId: number, userInfo: UserInfoPayload) => {
			return request<{ success: boolean }>(
				`/access-control/devices/${deviceId}/user-info`,
				{
					method: "PUT",
					body: JSON.stringify({ UserInfo: userInfo }),
				}
			);
		},

		/** 刪除人員（單一或多筆） */
		deleteUserInfo: (
			deviceId: number,
			payload: { employeeNo?: string; employeeNoList?: string[] }
		) => {
			return request<{ success: boolean }>(
				`/access-control/devices/${deviceId}/user-info`,
				{
					method: "DELETE",
					body: JSON.stringify(payload),
				}
			);
		},

		/** 上傳人臉圖（multipart：img 檔案） */
		uploadFace: (
			deviceId: number,
			employeeNo: string,
			file: File,
			options?: { faceLibType?: string; FDID?: string; faceType?: string }
		) => {
			const form = new FormData();
			const faceURL = JSON.stringify({
				faceLibType: options?.faceLibType ?? "blackFD",
				FDID: options?.FDID ?? "1",
				FPID: employeeNo,
				faceType: options?.faceType ?? "normalFace",
			});
			form.append("faceURL", faceURL);
			form.append("img", file);
			return request<{ success: boolean }>(
				`/access-control/devices/${deviceId}/user-info/${encodeURIComponent(employeeNo)}/face`,
				{
					method: "PUT",
					body: form,
				}
			);
		},

		/** 呼叫設備截圖（捕獲人臉資料） */
		captureFace: (
			deviceId: number,
			params?: { dataType?: string; captureInfrared?: boolean; readerID?: number }
		) => {
			return request<unknown>(
				`/access-control/devices/${deviceId}/capture-face`,
				{
					method: "POST",
					body: JSON.stringify(params ?? {}),
				}
			);
		},
	};
};

