export const YSCP_SUCCESS_CODE = "0"

export type BackendApiFailure = {
	backendCode?: string
	message?: string
	details?: unknown
	isYscp?: boolean
}

export const isYscpPath = (path: string): boolean => path.includes("/yscp/")

export const isYscpSuccessCode = (code: unknown): boolean => String(code ?? "") === YSCP_SUCCESS_CODE

const clipText = (raw: unknown): string => {
	if (raw === undefined || raw === null) return ""
	return String(raw).trim()
}

const parseBodyObject = (body: Record<string, unknown>, path?: string): BackendApiFailure | null => {
	const hasStandardError =
		body.error &&
		typeof body.error === "object" &&
		(body.error as Record<string, unknown>).code != null

	if (hasStandardError) {
		const errObj = body.error as Record<string, unknown>
		return {
			backendCode: clipText(errObj.code) || undefined,
			message: clipText(errObj.message) || undefined,
			details: errObj.details,
			isYscp: false,
		}
	}

	const pathIsYscp = Boolean(path && isYscpPath(path))
	const hasYscpShape = pathIsYscp
		? body.code != null && typeof body.msg === "string"
		: body.code != null &&
			typeof body.msg === "string" &&
			!("success" in body) &&
			!("error" in body)

	if (hasYscpShape) {
		const code = clipText(body.code)
		if (isYscpSuccessCode(code)) return null
		return {
			backendCode: code || undefined,
			message: clipText(body.msg) || undefined,
			details: body.data,
			isYscp: true,
		}
	}

	if (typeof body.message === "string" && body.message) {
		return {
			backendCode: clipText(body.code) || undefined,
			message: clipText(body.message),
			details: body.details,
			isYscp: false,
		}
	}

	return null
}

export const parseResponseBodyFailure = (
	body: unknown,
	ctx?: { path?: string }
): BackendApiFailure | null => {
	if (!body || typeof body !== "object") return null
	return parseBodyObject(body as Record<string, unknown>, ctx?.path)
}

/** 從 ofetch 錯誤或 YSCP 業務失敗物件解析失敗資訊 */
export const parseBackendApiFailure = (
	error: unknown,
	ctx?: { path?: string }
): BackendApiFailure => {
	const e = error as {
		data?: unknown
		response?: { _data?: unknown; data?: unknown }
		cause?: { data?: unknown }
		isYscpBusinessError?: boolean
		yscpFailure?: BackendApiFailure
	}

	if (e?.isYscpBusinessError && e.yscpFailure) {
		return e.yscpFailure
	}

	const data = e?.data ?? e?.response?._data ?? e?.response?.data ?? e?.cause?.data

	if (typeof data === "string") {
		try {
			const parsed = JSON.parse(data) as Record<string, unknown>
			if (parsed && typeof parsed === "object") {
				return parseBodyObject(parsed, ctx?.path) ?? { message: clipText(data), isYscp: false }
			}
		} catch {
			return { message: clipText(data), isYscp: false }
		}
	}

	if (data && typeof data === "object") {
		return parseBodyObject(data as Record<string, unknown>, ctx?.path) ?? {}
	}

	return { message: clipText((error as Error)?.message), isYscp: false }
}

export class YscpApiBusinessError extends Error {
	readonly isYscpBusinessError = true
	readonly yscpFailure: BackendApiFailure

	constructor(failure: BackendApiFailure) {
		super(failure.message || "YSCP 請求失敗")
		this.name = "YscpApiBusinessError"
		this.yscpFailure = failure
	}
}

export const assertYscpResponseSuccess = (response: unknown, path: string): void => {
	if (!isYscpPath(path) || !response || typeof response !== "object") return
	const body = response as Record<string, unknown>
	if (body.code == null) return
	const failure = parseResponseBodyFailure(body, { path })
	if (failure) throw new YscpApiBusinessError(failure)
}

export const unwrapYscpSuccessData = <T>(response: unknown): T => {
	if (!response || typeof response !== "object") return response as T
	const body = response as Record<string, unknown>
	if (body.code != null && isYscpSuccessCode(body.code) && "data" in body) {
		return body.data as T
	}
	return response as T
}
