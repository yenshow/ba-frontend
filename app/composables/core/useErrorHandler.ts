import { ref, readonly } from "vue";
import { useToast } from "~/composables/core/useToast";
import { logger } from "~/utils/logger";
import {
	APP_SEVERITY_RANK,
	inferSeverityFromApiError,
	simplifyUserFacingToastMessage,
	severityToToastType,
	type AppSeverity
} from "~/utils/errorUtils";

const errorHandlerLogger = logger.createLogger("Error Handler");

/**
 * 錯誤去重機制
 */
const errorDeduplication = {
	// 記錄最近處理的錯誤
	recentErrors: new Map<string, number>(),

	/**
	 * 檢查是否為重複錯誤
	 * @param errorKey - 錯誤唯一標識
	 * @param timeWindow - 時間窗口（毫秒），默認 5 秒
	 * @returns 是否為重複錯誤
	 */
	isDuplicate(errorKey: string, timeWindow: number = 5000): boolean {
		const lastTime = this.recentErrors.get(errorKey);
		if (lastTime && Date.now() - lastTime < timeWindow) {
			return true;
		}
		this.recentErrors.set(errorKey, Date.now());
		return false;
	},

	/**
	 * 清理過期記錄
	 */
	cleanup() {
		const now = Date.now();
		for (const [key, time] of this.recentErrors.entries()) {
			if (now - time > 60000) {
				// 1分鐘
				this.recentErrors.delete(key);
			}
		}
	}
};

/**
 * 統一錯誤處理 composable
 * 提供錯誤去重、優先級判斷、統一顯示等功能
 */
export const useErrorHandler = () => {
	const toast = useToast();

	// 當前最高嚴重度（三段 SSOT：warning/error/critical）
	const currentSeverity = ref<AppSeverity>("warning");

	/**
	 * 從錯誤推導嚴重度（優先 status/code，其次少量字串兜底）
	 */
	const getErrorSeverity = (error: unknown): AppSeverity => inferSeverityFromApiError(error);

	/**
	 * 嚴重度判斷：是否應該處理此錯誤
	 */
	const shouldProcessError = (error: unknown): boolean => {
		const nextSeverity = getErrorSeverity(error);

		// 如果當前有更高嚴重度，忽略此錯誤
		if (APP_SEVERITY_RANK[currentSeverity.value] > APP_SEVERITY_RANK[nextSeverity]) {
			return false;
		}

		return true;
	};

	/**
	 * 生成錯誤唯一標識
	 */
	const generateErrorKey = (errorMsg: string, severity: AppSeverity): string => {
		// 簡化錯誤訊息作為 key（移除動態部分如 URL、時間戳等）
		const simplifiedMsg = errorMsg
			.replace(/https?:\/\/[^\s]+/g, "[URL]")
			.replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*/g, "[TIME]")
			.replace(/\d+/g, "[NUM]");
		return `${simplifiedMsg}:${severity}`;
	};

	/**
	 * 輪詢類快照錯誤（status / readings timeout）已由系統警報統一呈現，
	 * 這裡避免再重複 Toast 造成干擾。
	 */
	const shouldSilenceOperationalError = (error: unknown, errorMsg: string): boolean => {
		const msg = String(errorMsg || "").toLowerCase();
		const isSnapshotPolling =
			msg.includes("/status") || msg.includes("/readings") || msg.includes("/aggregated");
		if (!isSnapshotPolling) return false;

		const hasNoResponseTimeout =
			msg.includes("<no response>") ||
			msg.includes("timeouterror") ||
			msg.includes("timed out") ||
			msg.includes("timeout") ||
			msg.includes("請求超時");
		if (!hasNoResponseTimeout) return false;

		const code = String((error as any)?.code || "");
		const errorName = String((error as any)?.name || "").toLowerCase();
		if (code === "TIMEOUT" || errorName === "timeouterror") return true;

		return true;
	};

	/**
	 * 統一錯誤處理函數
	 * @param error - 錯誤物件
	 * @param defaultMessage - 默認錯誤訊息
	 * @returns 處理後的錯誤訊息，如果被忽略則返回 null
	 */
	const handleError = (error: unknown, defaultMessage: string): string | null => {
		// 確保 errorMsg 永遠是字符串
		const errorMsg = simplifyUserFacingToastMessage(
			error instanceof Error
				? error.message || String(error) || defaultMessage
				: typeof error === "string"
					? error
					: defaultMessage
		);
		// 未儲存／無效 id 等情境觸發的參數錯誤，不顯示 toast（非使用者需處理的錯誤）
		if (/無效的整數參數|Invalid integer parameter/i.test(errorMsg)) {
			return null;
		}
		if (shouldSilenceOperationalError(error, errorMsg)) {
			errorHandlerLogger.warn("靜默輪詢錯誤", {
				message: errorMsg.substring(0, 120)
			});
			return null;
		}
		const errorSeverity = getErrorSeverity(error);

		// 錯誤去重檢查
		const errorKey = generateErrorKey(errorMsg, errorSeverity);
		if (errorDeduplication.isDuplicate(errorKey)) {
			return null; // 重複錯誤，不處理
		}

		// 嚴重度判斷
		if (!shouldProcessError(error)) {
			return null; // 低優先級錯誤被忽略
		}

		// 更新當前嚴重度
		if (APP_SEVERITY_RANK[errorSeverity] > APP_SEVERITY_RANK[currentSeverity.value]) {
			currentSeverity.value = errorSeverity;
		}

		const { type: toastType, duration } = severityToToastType(errorSeverity);

		// 記錄錯誤（開發模式，只記錄簡要資訊，避免重複）
		errorHandlerLogger.warn("處理錯誤", {
			message: errorMsg.substring(0, 100), // 只顯示前100個字符
			severity: errorSeverity
		});

		// 顯示 Toast
		toast.showToast(toastType, errorMsg, duration);

		return errorMsg;
	};

	/**
	 * 重置優先級（當錯誤恢復時調用）
	 */
	const resetPriority = () => {
		currentSeverity.value = "warning";
	};

	// 定期清理過期記錄
	if (process.client) {
		setInterval(() => {
			errorDeduplication.cleanup();
		}, 60000); // 每分鐘清理一次
	}

	return {
		handleError,
		currentSeverity: readonly(currentSeverity),
		resetPriority,
		getErrorSeverity,
		shouldProcessError
	};
};
