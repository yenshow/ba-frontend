import { useToast } from "~/composables/core/useToast"
import { logger } from "~/utils/logger"
import {
	ApiRequestError,
	inferSeverityFromApiError,
	simplifyUserFacingToastMessage,
	severityToToastType,
	type AppSeverity,
	type ErrorContext,
} from "~/utils/errorUtils"

const errorHandlerLogger = logger.createLogger("Error Handler")

export type HandleErrorOptions = {
	/** 操作情境；映射未命中時優先於通用 HTTP 句 */
	context?: ErrorContext
	/** 背景輪詢逾時等可靜默 */
	silentIfPolling?: boolean
}

const errorDeduplication = {
	recentErrors: new Map<string, number>(),

	isDuplicate(errorKey: string, timeWindow: number = 5000): boolean {
		const lastTime = this.recentErrors.get(errorKey)
		if (lastTime && Date.now() - lastTime < timeWindow) {
			return true
		}
		this.recentErrors.set(errorKey, Date.now())
		return false
	},

	cleanup() {
		const now = Date.now()
		for (const [key, time] of this.recentErrors.entries()) {
			if (now - time > 60000) {
				this.recentErrors.delete(key)
			}
		}
	},
}

let errorDeduplicationCleanupTimer: ReturnType<typeof setInterval> | null = null

const ensureErrorDeduplicationCleanup = () => {
	if (!process.client || errorDeduplicationCleanupTimer) return
	errorDeduplicationCleanupTimer = setInterval(() => {
		errorDeduplication.cleanup()
	}, 60000)
}

export const useErrorHandler = () => {
	const toast = useToast()
	ensureErrorDeduplicationCleanup()

	const getErrorSeverity = (error: unknown): AppSeverity => inferSeverityFromApiError(error)

	const generateErrorKey = (errorMsg: string, severity: AppSeverity): string => {
		const simplifiedMsg = errorMsg
			.replace(/https?:\/\/[^\s]+/g, "[URL]")
			.replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*/g, "[TIME]")
			.replace(/\d+/g, "[NUM]")
		return `${simplifiedMsg}:${severity}`
	}

	const shouldSilenceOperationalError = (
		error: unknown,
		errorMsg: string,
		options?: HandleErrorOptions,
	): boolean => {
		if (!options?.silentIfPolling) return false

		const e = error as { originalMessage?: string; message?: string }
		const haystack = [errorMsg, String(e?.originalMessage ?? ""), String(e?.message ?? "")]
			.join("\n")
			.toLowerCase()
		const isSnapshotPolling =
			haystack.includes("/status") ||
			haystack.includes("/readings") ||
			haystack.includes("/aggregated")
		if (!isSnapshotPolling) return false

		return (
			haystack.includes("<no response>") ||
			haystack.includes("timeouterror") ||
			haystack.includes("timed out") ||
			haystack.includes("timeout") ||
			haystack.includes("請求超時")
		)
	}

	const resolveToastMessage = (
		error: unknown,
		defaultMessage: string,
		_options?: HandleErrorOptions,
	): string => {
		if (error instanceof ApiRequestError) {
			if (error.isGenericMessage && defaultMessage) {
				return defaultMessage
			}
			return error.message || defaultMessage
		}
		if (error instanceof Error) {
			return simplifyUserFacingToastMessage(error.message || String(error) || defaultMessage)
		}
		return simplifyUserFacingToastMessage(
			typeof error === "string" ? error : defaultMessage,
		)
	}

	const handleError = (
		error: unknown,
		defaultMessage: string,
		options?: HandleErrorOptions,
	): string | null => {
		const errorMsg = resolveToastMessage(error, defaultMessage, options)

		if (shouldSilenceOperationalError(error, errorMsg, options)) {
			errorHandlerLogger.warn("靜默輪詢錯誤", {
				message: errorMsg.substring(0, 120),
			})
			return null
		}

		const errorSeverity = getErrorSeverity(error)
		const errorKey = generateErrorKey(errorMsg, errorSeverity)
		if (errorDeduplication.isDuplicate(errorKey)) {
			return null
		}

		const { type: toastType, duration } = severityToToastType(errorSeverity)

		const logPayload: Record<string, unknown> = {
			message: errorMsg.substring(0, 100),
			severity: errorSeverity,
		}
		if (error instanceof ApiRequestError) {
			if (error.backendCode) logPayload.backendCode = error.backendCode
			if (error.originalMessage) {
				logPayload.originalMessage = error.originalMessage.substring(0, 120)
			}
		}
		errorHandlerLogger.warn("處理錯誤", logPayload)

		toast.showToast(toastType, errorMsg, duration)
		return errorMsg
	}

	const resetPriority = () => {
		// 保留 API 相容；已不再使用模組級嚴重度抑制
	}

	return {
		handleError,
		resetPriority,
		getErrorSeverity,
	}
}
