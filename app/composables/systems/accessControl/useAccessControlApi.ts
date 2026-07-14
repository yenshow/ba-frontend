/**
 * 門禁設備 ISAPI 代理 API（後端 /api/access-control/*）
 * 需認證；寫入類需管理員或操作員。
 */
import { useApiBase } from "~/composables/core/useApiBase"

/** 人員簡化欄位（與後端回傳一致） */
export interface AccessControlUserInfo {
	employeeNo?: string
	name?: string
	userType?: string
	Valid?: { enable?: boolean; beginTime?: string; endTime?: string }
	doorRight?: string
	RightPlan?: Array<{ doorNo?: number; planTemplateNo?: string }>
	faceURL?: string
}

export interface SearchUserInfoResult {
	list: AccessControlUserInfo[]
	totalMatches: number
	numOfMatches: number
}

export interface UserInfoPayload {
	employeeNo: string
	name?: string
	userType?: string
	Valid?: { enable?: boolean; beginTime?: string; endTime?: string }
	doorRight?: string
	RightPlan?: Array<{ doorNo: number; planTemplateNo: string }>
	userVerifyMode?: string
	password?: string
	[key: string]: unknown
}

export type CaptureFaceBinaryResult = {
	dataType: "binary"
	contentType: string
	base64: string
	size: number
}
export type CaptureFaceResult = CaptureFaceBinaryResult

export type CaptureCardInfoResult = Record<string, unknown>

export type SetCardInfoPayload = {
	employeeNo: string
	cardNo: string
	cardType?: "normalCard" | string
}

export type CaptureFingerPrintPayload = {
	fingerNo: number
}

export type CaptureFingerPrintResult = {
	contentType: string
	bodyText: string
	base64: string
	size: number
}

export type SetFingerPrintPayload = {
	employeeNo: string
	fingerPrintID: number
	fingerType?: "normalFP" | string
	fingerData: string
	enableCardReader?: number[]
}

/** ISAPI RemoteControlDoor cmd */
export type RemoteDoorCmd = "open" | "close" | "alwaysOpen" | "alwaysClose"

export const useAccessControlApi = () => {
	const { request } = useApiBase()

	return {
		/** 取得門禁設備上的人員列表 */
		searchUserInfo: (
			deviceId: number,
			params?: { searchResultPosition?: number; maxResults?: number }
		) => {
			return request<SearchUserInfoResult>(`/access-control/devices/${deviceId}/user-info`, {
				method: "POST",
				body: JSON.stringify(params ?? {}),
			})
		},

		/** 修改單一人員資料 */
		updateUserInfo: (deviceId: number, userInfo: UserInfoPayload) => {
			return request<{ success: boolean }>(`/access-control/devices/${deviceId}/user-info`, {
				method: "PUT",
				body: JSON.stringify({ UserInfo: userInfo }),
			})
		},

		/** 刪除人員（單一或多筆） */
		deleteUserInfo: (
			deviceId: number,
			payload: { employeeNo?: string; employeeNoList?: string[] }
		) => {
			return request<{ success: boolean }>(`/access-control/devices/${deviceId}/user-info`, {
				method: "DELETE",
				body: JSON.stringify(payload),
			})
		},

		/** 上傳人臉圖（multipart：img 檔案） */
		uploadFace: (
			deviceId: number,
			employeeNo: string,
			file: File,
			options?: { faceLibType?: string; FDID?: string; faceType?: string }
		) => {
			const form = new FormData()
			const faceURL = JSON.stringify({
				faceLibType: options?.faceLibType ?? "blackFD",
				FDID: options?.FDID ?? "1",
				FPID: employeeNo,
				faceType: options?.faceType ?? "normalFace",
			})
			form.append("faceURL", faceURL)
			form.append("img", file)
			return request<{ success: boolean }>(
				`/access-control/devices/${deviceId}/user-info/${encodeURIComponent(employeeNo)}/face`,
				{
					method: "PUT",
					body: form,
				}
			)
		},

		/** 呼叫設備截圖（捕獲人臉資料） */
		captureFace: (deviceId: number, params?: { captureInfrared?: boolean; readerID?: number }) => {
			return request<CaptureFaceResult>(`/access-control/devices/${deviceId}/capture-face`, {
				method: "POST",
				body: JSON.stringify(params ?? {}),
			})
		},

		/** 呼叫設備讀卡（CaptureCardInfo） */
		captureCard: (deviceId: number) => {
			return request<CaptureCardInfoResult>(`/access-control/devices/${deviceId}/capture-card`, {
				method: "GET",
			})
		},

		/** 綁定卡片到員工（CardInfo/SetUp） */
		setCardInfo: (deviceId: number, payload: SetCardInfoPayload) => {
			return request<{ success: boolean }>(`/access-control/devices/${deviceId}/card-info`, {
				method: "PUT",
				body: JSON.stringify({ CardInfo: payload }),
			})
		},

		/** 呼叫設備讀取指紋模板（CaptureFingerPrint） */
		captureFingerPrint: (deviceId: number, payload: CaptureFingerPrintPayload) => {
			return request<CaptureFingerPrintResult>(
				`/access-control/devices/${deviceId}/capture-fingerprint`,
				{
					method: "POST",
					body: JSON.stringify(payload),
					timeout: 60000,
				}
			)
		},

		/** 上傳指紋模板並綁定 employeeNo（FingerPrint/SetUp） */
		setFingerPrint: (deviceId: number, payload: SetFingerPrintPayload) => {
			return request<{ success: boolean }>(`/access-control/devices/${deviceId}/fingerprint`, {
				method: "POST",
				body: JSON.stringify({ FingerPrintCfg: payload }),
				timeout: 60000,
			})
		},

		/** 遠端門控（RemoteControlDoor） */
		controlRemoteDoor: (
			deviceId: number,
			body: { cmd: RemoteDoorCmd; doorNo?: number }
		) => {
			return request<{ success: boolean; doorNo: number; cmd: string }>(
				`/access-control/devices/${deviceId}/remote-control-door`,
				{
					method: "PUT",
					body: JSON.stringify(body),
				}
			)
		},
	}
}
