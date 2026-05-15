import {
	LICENSE_MESSAGE_LOCKED,
	PERMISSION_MESSAGE_LOCKED,
} from "~/utils/licenseUtils"
import {
	USER_FACING_API_BAD_REQUEST,
	USER_FACING_API_CONFLICT,
	USER_FACING_API_BAD_GATEWAY,
	USER_FACING_API_NOT_FOUND,
	USER_FACING_API_UNAUTHORIZED,
	USER_FACING_CONNECTION_ERROR,
} from "~/utils/errorUtils"

/** 精選後端 error.code → 使用者固定文案（其餘走 HTTP fallback 或前綴規則） */
export const API_ERROR_USER_MESSAGES: Record<string, string> = {
	FEATURE_NOT_LICENSED: LICENSE_MESSAGE_LOCKED,
	LICENSE_QUOTA_EXCEEDED: "授權配額已用盡，請聯絡管理員",
	LICENSE_CHECK_FAILED: "授權狀態檢查失敗，請稍後再試",
	PERMISSION_DENIED: PERMISSION_MESSAGE_LOCKED,
	CONFLICT: USER_FACING_API_CONFLICT,
	BAD_GATEWAY: USER_FACING_API_BAD_GATEWAY,
	DEVICE_NOT_FOUND: USER_FACING_API_NOT_FOUND,
	LOCATION_ZONE_NOT_FOUND: USER_FACING_API_NOT_FOUND,
	LOCATION_NOT_FOUND: USER_FACING_API_NOT_FOUND,
}

const MODBUS_CONNECTION_PREFIXES = [
	"MODBUS_CONNECTION_",
	"MODBUS_READ_TIMEOUT",
	"MODBUS_WRITE_TIMEOUT",
] as const

export const getUserMessageForBackendCode = (backendCode: string | undefined): string | undefined => {
	if (!backendCode) return undefined

	const exact = API_ERROR_USER_MESSAGES[backendCode]
	if (exact) return exact

	if (backendCode.startsWith("AUTH_")) return USER_FACING_API_UNAUTHORIZED
	if (backendCode.startsWith("VALIDATION_")) return USER_FACING_API_BAD_REQUEST
	if (backendCode.startsWith("MODBUS_")) {
		if (MODBUS_CONNECTION_PREFIXES.some((p) => backendCode.startsWith(p) || backendCode === p)) {
			return USER_FACING_CONNECTION_ERROR
		}
		if (
			backendCode.includes("TIMEOUT") ||
			backendCode.includes("CONNECTION") ||
			backendCode.includes("UNAVAILABLE")
		) {
			return USER_FACING_CONNECTION_ERROR
		}
	}
	if (backendCode.startsWith("DEVICE_CONNECTIVITY_")) return USER_FACING_CONNECTION_ERROR
	if (backendCode.endsWith("_NOT_FOUND") || backendCode.includes("NOT_FOUND")) {
		return USER_FACING_API_NOT_FOUND
	}
	if (backendCode.includes("DUPLICATE") || backendCode.includes("IN_USE")) {
		return USER_FACING_API_CONFLICT
	}

	return undefined
}
