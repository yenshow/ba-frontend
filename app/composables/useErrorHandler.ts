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
 * 錯誤優先級關鍵字映射（模組級別，避免重複創建）
 */
const ERROR_KEYWORDS = {
	CRITICAL: [
		"無法連接到後端伺服器",
		"無法連接到後端",
		"後端服務是否正常運行",
		"econnrefused",
		"enotfound",
		"networkerror",
		"failed to fetch",
		"認證",
		"auth",
		"401",
		"登入",
		"token"
	],
	HIGH: [
		"503",
		"連接超時",
		"連接被拒絕",
		"無法到達設備",
		"連接已斷開",
		"離線",
		"offline",
		"服務不可用",
		"service unavailable",
		"設備連接失敗",
		"設備離線",
		"無法在"
	],
	MEDIUM: ["閾值", "threshold", "超標", "數值"]
} as const;

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

		// CRITICAL: 後端連接錯誤、認證錯誤
		// 但如果錯誤訊息包含設備相關的 URL（如 /modbus/），則可能是設備連接錯誤，不應判斷為 CRITICAL
		const isDeviceApiError = message.includes("/modbus/") || message.includes("/device/");
		const hasDeviceIp = message.match(/\d+\.\d+\.\d+\.\d+:\d+/);

		if (
			ERROR_KEYWORDS.CRITICAL.some(keyword => {
				if (keyword === "econnrefused" || keyword === "enotfound") {
					return message.includes(keyword) && !message.includes("連接到");
				}
				// 如果是設備 API 錯誤且包含「無法連接到後端伺服器」和設備 IP，則是設備連接錯誤
				if (isDeviceApiError && keyword === "無法連接到後端伺服器" && hasDeviceIp) {
					return false; // 不判斷為 CRITICAL
				}
				return message.includes(keyword);
			})
		) {
			// 如果是設備 API 錯誤且包含設備相關資訊，降級為 HIGH（設備連接錯誤）
			if (isDeviceApiError && (message.includes("設備") || hasDeviceIp)) {
				return ErrorPriority.HIGH;
			}
			return ErrorPriority.CRITICAL;
		}

		// HIGH: 設備連接錯誤、設備離線、服務不可用
		if (
			ERROR_KEYWORDS.HIGH.some(keyword => {
				// "無法在" 需要配合 "連接到" 一起判斷
				if (keyword === "無法在") {
					return message.includes(keyword) && message.includes("連接到");
				}
				return message.includes(keyword);
			})
		) {
			return ErrorPriority.HIGH;
		}

		// MEDIUM: 數值錯誤、閾值超標
		if (ERROR_KEYWORDS.MEDIUM.some(keyword => message.includes(keyword))) {
			return ErrorPriority.MEDIUM;
		}

		// LOW: 默認優先級
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
		if (currentPriority.value >= ErrorPriority.HIGH && errorPriority <= ErrorPriority.MEDIUM) {
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
	 * 根據優先級獲取 Toast 配置
	 */
	const getToastConfig = (
		priority: ErrorPriority
	): { type: "error" | "warning" | "info"; duration: number } => {
		if (priority >= ErrorPriority.CRITICAL) {
			return { type: "error", duration: 10000 };
		}
		if (priority >= ErrorPriority.HIGH) {
			return { type: "warning", duration: 8000 };
		}
		if (priority >= ErrorPriority.MEDIUM) {
			return { type: "warning", duration: 5000 };
		}
		return { type: "info", duration: 3000 };
	};

	/**
	 * 統一錯誤處理函數
	 * @param error - 錯誤物件
	 * @param defaultMessage - 默認錯誤訊息
	 * @returns 處理後的錯誤訊息，如果被忽略則返回 null
	 */
	const handleError = (error: unknown, defaultMessage: string): string | null => {
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
		const { type: toastType, duration } = getToastConfig(errorPriority);

		// 記錄錯誤（開發模式，只記錄簡要資訊，避免重複）
		if (process.dev) {
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
