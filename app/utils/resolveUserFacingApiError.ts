import { getUserMessageForBackendCode } from "~/constants/apiErrorUserMessages"
import {
	mapHttpStatusToUserFacingError,
	type ApiErrorCode,
	USER_FACING_API_UNEXPECTED,
} from "~/utils/errorUtils"

export type ResolveUserFacingApiErrorInput = {
	statusCode?: number
	backendCode?: string
	path: string
	originalMessage?: string
}

export type ResolvedUserFacingApiError = {
	message: string
	code: ApiErrorCode
}

export const resolveUserFacingApiError = (
	input: ResolveUserFacingApiErrorInput
): ResolvedUserFacingApiError => {
	const { statusCode, backendCode, path, originalMessage } = input
	const isExternalDataQuery = path.includes("/external-data/")

	const fromBackendCode = getUserMessageForBackendCode(backendCode)
	if (fromBackendCode) {
		return { message: fromBackendCode, code: "BACKEND_CODE" }
	}

	if (statusCode !== undefined && statusCode !== null) {
		const fromStatus = mapHttpStatusToUserFacingError(statusCode, isExternalDataQuery)
		return { message: fromStatus.message, code: fromStatus.code }
	}

	if (originalMessage) {
		return { message: USER_FACING_API_UNEXPECTED, code: "UNKNOWN" }
	}

	return { message: USER_FACING_API_UNEXPECTED, code: "UNKNOWN" }
}
