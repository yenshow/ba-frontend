import { useRequestFetch } from "#app"
import { useAuth } from "~/composables/core/useAuth"
import { useAuthSession } from "~/composables/core/useAuthSession"
import {
	ApiRequestError,
	extractBackendApiErrorText,
	isDeviceApiRequest,
	isDeviceConnectionError,
	resolveFetchHttpStatus,
	USER_FACING_API_UNEXPECTED,
	USER_FACING_CONNECTION_ERROR,
	USER_FACING_REQUEST_TIMEOUT,
	isApiRequestTimeout,
	type ApiErrorCode,
	type ErrorContext,
	resolveUserFacingApiError,
	assertYscpResponseSuccess,
	isYscpPath,
	parseBackendApiFailure,
	unwrapYscpSuccessData,
	YscpApiBusinessError,
} from "~/utils/apiError"

// GET 同 URL 同時間去重（避免多個元件/多個 watch 同步觸發造成 burst）
const inFlightGetRequests = new Map<string, Promise<unknown>>()

const MAX_RATE_LIMIT_GET_RETRIES = 2
const sleepMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

let permissionRefreshInFlight: Promise<void> | null = null

type RequestOptions = Omit<RequestInit, "body"> & {
	timeout?: number
	body?: unknown
	/** API 失敗時的操作情境，供錯誤文案 fallback */
	errorContext?: ErrorContext
}

const toApiErrorCode = (code: string): ApiErrorCode => {
	if (
		code === "HTTP_400" ||
		code === "HTTP_401" ||
		code === "HTTP_403" ||
		code === "HTTP_429" ||
		code === "HTTP_404" ||
		code === "HTTP_500" ||
		code === "HTTP_503" ||
		code === "NETWORK_ERROR" ||
		code === "TIMEOUT" ||
		code === "BACKEND_CODE" ||
		code === "UNKNOWN"
	) {
		return code
	}
	return "UNKNOWN"
}

export const useApiBase = () => {
	const nuxtApp = useNuxtApp()
	const config = useRuntimeConfig()
	const fetcher = useRequestFetch()
	const apiBase = config.public.apiBase || "/api"

	const runWithNuxtContext = <T>(fn: () => T): T => nuxtApp.runWithContext(fn) as T
	const authToken = useState<string | null>("auth_token")

	const getAuthHeaders = (): HeadersInit => {
		const token = authToken.value

		const headers: HeadersInit = {
			"Content-Type": "application/json",
			Accept: "application/json",
		}
		if (token) {
			headers.Authorization = `Bearer ${token}`
		}
		return headers
	}

	const throwApiRequestError = async (
		error: unknown,
		path: string,
		options?: { fallbackStatus?: number; context?: ErrorContext }
	): Promise<never> => {
		const failure = parseBackendApiFailure(error, { path })
		const statusCode = resolveFetchHttpStatus(error) ?? options?.fallbackStatus
		const originalMessage = failure.message || extractBackendApiErrorText(error, path) || undefined

		if (statusCode === 403 && failure.backendCode === "PERMISSION_DENIED" && process.client) {
			const { fetchUser } = runWithNuxtContext(() => useAuth())
			if (!permissionRefreshInFlight) {
				permissionRefreshInFlight = fetchUser()
					.catch(() => undefined)
					.finally(() => {
						permissionRefreshInFlight = null
					}) as Promise<void>
			}
			await permissionRefreshInFlight
		}

		if (statusCode === 401 && path.split("?")[0] !== "/users/login") {
			const { handleUnauthorized } = runWithNuxtContext(() => useAuthSession())
			await handleUnauthorized()
		}

		if (statusCode !== undefined && statusCode !== null) {
			const resolved = resolveUserFacingApiError({
				statusCode,
				backendCode: failure.backendCode,
				path,
				originalMessage,
				details: failure.details,
				context: options?.context,
			})
			throw new ApiRequestError(resolved.message, {
				statusCode,
				code: toApiErrorCode(resolved.code),
				backendCode: failure.backendCode,
				originalMessage,
				details: failure.details,
				isGenericMessage: resolved.isGeneric,
			})
		}

		const errorMessage =
			error instanceof Error
				? error.message
				: String((error as { message?: string })?.message ?? "")

		if (isApiRequestTimeout({ message: errorMessage, originalMessage })) {
			throw new ApiRequestError(USER_FACING_REQUEST_TIMEOUT, {
				code: "TIMEOUT",
				backendCode: failure.backendCode,
				originalMessage: originalMessage || errorMessage,
				details: failure.details,
			})
		}

		const isDeviceRequest = isDeviceApiRequest(path)

		const isNetworkError =
			errorMessage.includes("ERR_ADDRESS_UNREACHABLE") ||
			errorMessage.includes("ERR_CONNECTION_REFUSED") ||
			errorMessage.includes("ERR_NETWORK") ||
			errorMessage.includes("Failed to fetch") ||
			errorMessage.includes("NetworkError") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ENOTFOUND") ||
			(error as { code?: string })?.code === "ECONNREFUSED" ||
			(error as { code?: string })?.code === "ENOTFOUND" ||
			((error as { statusCode?: number }).statusCode === undefined &&
				(error as { status?: number }).status === undefined &&
				errorMessage.includes("<no response>"))

		if (isDeviceRequest) {
			const isDeviceConn =
				isDeviceConnectionError(error) || (errorMessage.includes("??????????") && !isNetworkError)

			if (isDeviceConn) {
				throw new ApiRequestError(USER_FACING_CONNECTION_ERROR, {
					code: "NETWORK_ERROR",
					backendCode: failure.backendCode,
					originalMessage: originalMessage || errorMessage,
					details: failure.details,
				})
			}
		}

		if (isNetworkError) {
			throw new ApiRequestError(USER_FACING_CONNECTION_ERROR, {
				code: "NETWORK_ERROR",
				backendCode: failure.backendCode,
				originalMessage: originalMessage || errorMessage,
				details: failure.details,
			})
		}

		if (
			errorMessage.includes("CORS") ||
			errorMessage.includes("cross-origin") ||
			errorMessage.includes("Access-Control") ||
			((error as { statusCode?: number }).statusCode === 0 && !isNetworkError)
		) {
			throw new ApiRequestError(USER_FACING_CONNECTION_ERROR, {
				code: "NETWORK_ERROR",
				backendCode: failure.backendCode,
				originalMessage: originalMessage || errorMessage,
				details: failure.details,
			})
		}

		if (error instanceof YscpApiBusinessError) {
			const resolved = resolveUserFacingApiError({
				backendCode: failure.backendCode,
				path,
				originalMessage,
				details: failure.details,
				context: options?.context,
			})
			throw new ApiRequestError(resolved.message, {
				code: toApiErrorCode(resolved.code),
				backendCode: failure.backendCode,
				originalMessage,
				details: failure.details,
				isGenericMessage: resolved.isGeneric,
			})
		}

		if (error instanceof Error) {
			const resolved = resolveUserFacingApiError({
				backendCode: failure.backendCode,
				path,
				originalMessage,
				details: failure.details,
				context: options?.context,
			})
			throw new ApiRequestError(resolved.message || USER_FACING_API_UNEXPECTED, {
				code: toApiErrorCode(resolved.code),
				backendCode: failure.backendCode,
				originalMessage: originalMessage || errorMessage,
				details: failure.details,
				isGenericMessage: resolved.isGeneric,
			})
		}

		throw error
	}

	const unwrapSuccessResponse = <T>(response: unknown, path: string): T => {
		if (isYscpPath(path)) {
			assertYscpResponseSuccess(response, path)
			return unwrapYscpSuccessData<T>(response)
		}

		if (response && typeof response === "object") {
			if (
				"success" in response &&
				"data" in response &&
				(response as { success: boolean }).success === true
			) {
				return (response as { data: T }).data
			}
			const obj = response as Record<string, unknown>
			const hasDevicesArray = Array.isArray(obj.devices)
			const hasSnapshotWrapper = !!obj.snapshot && typeof obj.snapshot === "object"
			if ("timestamp" in obj && !hasDevicesArray && !hasSnapshotWrapper) {
				const { timestamp: _ts, ...data } = obj
				return data as T
			}
		}

		return response as T
	}

	const buildRequestInit = (path: string, options: RequestOptions = {}) => {
		const url = `${apiBase}${path}`
		const method = String(options.method || "GET").toUpperCase()
		const isFormData = options.body instanceof FormData
		const baseHeaders = getAuthHeaders() as Record<string, string>
		if (isFormData) {
			delete baseHeaders["Content-Type"]
		}
		const headers: Record<string, string> = {
			...baseHeaders,
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Pragma: "no-cache",
			...(options.headers as Record<string, string>),
		}
		const timeout = options.timeout ?? 5000
		const { timeout: _timeout, ...fetcherOptions } = options
		const contentType = String(headers["Content-Type"] || headers["content-type"] || "")
		const shouldStringifyJsonBody =
			!isFormData &&
			fetcherOptions.body != null &&
			typeof fetcherOptions.body === "object" &&
			contentType.includes("application/json")
		const finalBody = shouldStringifyJsonBody
			? JSON.stringify(fetcherOptions.body)
			: fetcherOptions.body

		return { url, method, headers, timeout, fetcherOptions, finalBody }
	}

	const request = async <T>(path: string, options: RequestOptions = {}) => {
		const { url, method, headers, timeout, fetcherOptions, finalBody } = buildRequestInit(
			path,
			options
		)

		if (method === "GET") {
			const existing = inFlightGetRequests.get(url) as Promise<T> | undefined
			if (existing) return await existing
		}

		const run = async (rateLimitAttempt = 0): Promise<T> => {
			try {
				const response = await fetcher<T>(url, {
					...fetcherOptions,
					body: finalBody as BodyInit | null | undefined,
					headers,
					credentials: "include",
					timeout,
				} as Parameters<typeof fetcher>[1])

				return unwrapSuccessResponse<T>(response, path)
			} catch (error: unknown) {
				const statusCode = resolveFetchHttpStatus(error)
				if (
					method === "GET" &&
					statusCode === 429 &&
					rateLimitAttempt < MAX_RATE_LIMIT_GET_RETRIES
				) {
					await sleepMs(1000 * (rateLimitAttempt + 1))
					return run(rateLimitAttempt + 1)
				}
				throw error
			}
		}

		try {
			const promise = run()
			if (method === "GET") {
				inFlightGetRequests.set(url, promise as Promise<unknown>)
			}
			return (await promise) as T
		} catch (error: unknown) {
			return await throwApiRequestError(error, path, { context: options.errorContext })
		} finally {
			if (method === "GET") {
				inFlightGetRequests.delete(url)
			}
		}
	}

	const requestBlob = async (path: string, options: RequestOptions = {}): Promise<Blob> => {
		const { url, method, headers, fetcherOptions, finalBody } = buildRequestInit(path, options)
		const { body: _body, ...fetcherOptionsWithoutBody } = fetcherOptions

		try {
			const response = await fetch(url, {
				...fetcherOptionsWithoutBody,
				method,
				headers,
				body: finalBody as BodyInit | null | undefined,
				credentials: "include",
			})

			if (!response.ok) {
				let errorData: unknown
				const contentType = response.headers.get("content-type") || ""
				if (contentType.includes("application/json")) {
					try {
						errorData = await response.json()
					} catch {
						errorData = { message: await response.text() }
					}
				} else {
					errorData = { message: await response.text() }
				}
				const fetchError = Object.assign(new Error(`HTTP ${response.status}`), {
					statusCode: response.status,
					data: errorData,
				})
				await throwApiRequestError(fetchError, path, { fallbackStatus: response.status })
			}

			return await response.blob()
		} catch (error: unknown) {
			if (error instanceof ApiRequestError) throw error
			return await throwApiRequestError(error, path)
		}
	}

	return {
		apiBase,
		request,
		requestBlob,
	}
}
