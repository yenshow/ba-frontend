import { ref, readonly } from "vue";
import { useToast } from "~/composables/useToast";

/**
 * 錯誤優先級定義
 */
export enum ErrorPriority {
	CRITICAL = 100, // 連線錯誤、認證錯誤
	HIGH = 80, // 設備離線、服務不可用
	MEDIUM = 50, // 數值錯誤、閾值超標
	LOW = 20 // 一般錯誤、警告
}

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

	// 當前最高優先級錯誤
	const currentPriority = ref<ErrorPriority>(ErrorPriority.LOW);

	/**
	 * 從錯誤訊息提取優先級
	 */
	const getErrorPriority = (error: Error): ErrorPriority => {
		const message = error.message.toLowerCase();

		// 後端連接錯誤（CRITICAL）- 真正的後端服務器連接問題
		if (
			message.includes("無法連接到後端伺服器") ||
			message.includes("無法連接到後端") ||
			message.includes("後端服務是否正常運行") ||
			message.includes("econnrefused") && !message.includes("連接到") ||
			message.includes("enotfound") && !message.includes("連接到") ||
			message.includes("networkerror") ||
			message.includes("failed to fetch")
		) {
			return ErrorPriority.CRITICAL;
		}

		// 認證錯誤（CRITICAL）
		if (
			message.includes("認證") ||
			message.includes("auth") ||
			message.includes("401") ||
			message.includes("登入") ||
			message.includes("token")
		) {
			return ErrorPriority.CRITICAL;
		}

		// 設備連接錯誤、設備離線、服務不可用（HIGH）
		// 包括：設備連接超時、設備離線、503 錯誤等
		if (
			message.includes("503") ||
			message.includes("連接超時") ||
			message.includes("無法在") && message.includes("連接到") ||
			message.includes("連接被拒絕") ||
			message.includes("無法到達設備") ||
			message.includes("連接已斷開") ||
			message.includes("離線") ||
			message.includes("offline") ||
			message.includes("服務不可用") ||
			message.includes("service unavailable") ||
			message.includes("設備連接失敗") ||
			message.includes("設備離線")
		) {
			return ErrorPriority.HIGH;
		}

		// 數值錯誤、閾值超標（MEDIUM）
		if (
			message.includes("閾值") ||
			message.includes("threshold") ||
			message.includes("超標") ||
			message.includes("數值")
		) {
			return ErrorPriority.MEDIUM;
		}

		// 默認為低優先級
		return ErrorPriority.LOW;
	};

	/**
	 * 優先級判斷：是否應該處理此錯誤
	 */
	const shouldProcessError = (error: Error): boolean => {
		const errorPriority = getErrorPriority(error);

		// 如果當前有更高優先級的錯誤，忽略此錯誤
		if (currentPriority.value > errorPriority) {
			return false;
		}

		// 特殊規則：連線錯誤時，不處理數值錯誤
		if (
			currentPriority.value >= ErrorPriority.HIGH &&
			errorPriority <= ErrorPriority.MEDIUM
		) {
			return false;
		}

		return true;
	};

	/**
	 * 生成錯誤唯一標識
	 */
	const generateErrorKey = (errorMsg: string, priority: ErrorPriority): string => {
		// 簡化錯誤訊息作為 key（移除動態部分如 URL、時間戳等）
		const simplifiedMsg = errorMsg
			.replace(/https?:\/\/[^\s]+/g, "[URL]")
			.replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*/g, "[TIME]")
			.replace(/\d+/g, "[NUM]");
		return `${simplifiedMsg}:${priority}`;
	};

	/**
	 * 統一錯誤處理函數
	 * @param error - 錯誤物件
	 * @param defaultMessage - 默認錯誤訊息
	 * @returns 處理後的錯誤訊息，如果被忽略則返回 null
	 */
	const handleError = (
		error: unknown,
		defaultMessage: string
	): string | null => {
		const errorMsg = error instanceof Error ? error.message : defaultMessage;
		const errorObj = error instanceof Error ? error : new Error(errorMsg);
		const errorPriority = getErrorPriority(errorObj);

		// 錯誤去重檢查
		const errorKey = generateErrorKey(errorMsg, errorPriority);
		if (errorDeduplication.isDuplicate(errorKey)) {
			return null; // 重複錯誤，不處理
		}

		// 優先級判斷
		if (!shouldProcessError(errorObj)) {
			return null; // 低優先級錯誤被忽略
		}

		// 更新當前優先級
		if (errorPriority > currentPriority.value) {
			currentPriority.value = errorPriority;
		}

		// 根據優先級選擇 Toast 類型和持續時間
		let toastType: "error" | "warning" | "info" = "error";
		let duration = 5000;

		if (errorPriority >= ErrorPriority.CRITICAL) {
			toastType = "error";
			duration = 10000; // 10 秒
		} else if (errorPriority >= ErrorPriority.HIGH) {
			toastType = "warning";
			duration = 8000; // 8 秒
		} else if (errorPriority >= ErrorPriority.MEDIUM) {
			toastType = "warning";
			duration = 5000; // 5 秒
		} else {
			toastType = "info";
			duration = 3000; // 3 秒
		}

		// 記錄錯誤（開發模式，只記錄簡要資訊，避免重複）
		if (process.dev) {
			// 只在錯誤去重和優先級判斷通過後才記錄，避免重複日誌
			console.warn("[Error Handler]", {
				message: errorMsg.substring(0, 100), // 只顯示前100個字符
				priority: errorPriority
			});
		}

		// 顯示 Toast
		toast.showToast(toastType, errorMsg, duration);

		return errorMsg;
	};

	/**
	 * 重置優先級（當錯誤恢復時調用）
	 */
	const resetPriority = () => {
		currentPriority.value = ErrorPriority.LOW;
	};

	// 定期清理過期記錄
	if (process.client) {
		setInterval(() => {
			errorDeduplication.cleanup();
		}, 60000); // 每分鐘清理一次
	}

	return {
		handleError,
		currentPriority: readonly(currentPriority),
		resetPriority,
		getErrorPriority,
		shouldProcessError
	};
};

