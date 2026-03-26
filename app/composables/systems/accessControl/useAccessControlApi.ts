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

		updateUserInfo: (deviceId: number, userInfo: UserInfoPayload) => {
			return request<{ success: boolean }>(
				`/access-control/devices/${deviceId}/user-info`,
				{
					method: "PUT",
					body: JSON.stringify({ UserInfo: userInfo }),
				}
			);
		},

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

