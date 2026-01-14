/**
 * 串流錯誤類型
 */
export enum StreamErrorType {
	NETWORK = "network",
	CODEC = "codec",
	PERMISSION = "permission",
	TIMEOUT = "timeout",
	MANIFEST = "manifest",
	MEDIA = "media",
	UNKNOWN = "unknown"
}

/**
 * 錯誤恢復策略
 */
export interface ErrorRecoveryStrategy {
	retry: boolean;
	retryDelay: number;
	maxRetries: number;
	fallback?: () => void;
}

/**
 * 從錯誤對象判斷錯誤類型
 */
export const getErrorType = (error: any): StreamErrorType => {
	// HLS.js 錯誤
	if (error?.type) {
		if (error.type === "networkError") {
			return StreamErrorType.NETWORK;
		}
		if (error.type === "mediaError") {
			return StreamErrorType.MEDIA;
		}
	}

	// HTTP 狀態碼
	if (error?.response?.code) {
		const code = error.response.code;
		if (code === 401 || code === 403) {
			return StreamErrorType.PERMISSION;
		}
		if (code === 404 || code === 500) {
			return StreamErrorType.MANIFEST;
		}
		if (code >= 500) {
			return StreamErrorType.NETWORK;
		}
	}

	// 錯誤訊息關鍵字
	const message = error?.message?.toLowerCase() || "";
	if (message.includes("timeout") || message.includes("timed out")) {
		return StreamErrorType.TIMEOUT;
	}
	if (message.includes("dts") || message.includes("codec") || message.includes("decode")) {
		return StreamErrorType.CODEC;
	}
	if (
		message.includes("permission") ||
		message.includes("unauthorized") ||
		message.includes("forbidden")
	) {
		return StreamErrorType.PERMISSION;
	}
	if (message.includes("manifest") || message.includes("playlist")) {
		return StreamErrorType.MANIFEST;
	}
	if (message.includes("network") || message.includes("connection")) {
		return StreamErrorType.NETWORK;
	}

	return StreamErrorType.UNKNOWN;
};

/**
 * 獲取用戶友好的錯誤訊息
 */
export const getErrorMessage = (errorType: StreamErrorType, originalError?: any): string => {
	const originalMsg = originalError?.message || "";

	switch (errorType) {
		case StreamErrorType.NETWORK:
			return `網路連接失敗：${originalMsg || "請檢查網路連線"}`;
		case StreamErrorType.CODEC:
			return `編解碼器不支援：${originalMsg || "建議使用 H264 編碼"}`;
		case StreamErrorType.PERMISSION:
			return `權限不足：${originalMsg || "請檢查帳號密碼"}`;
		case StreamErrorType.TIMEOUT:
			return `連接超時：${originalMsg || "請稍後重試"}`;
		case StreamErrorType.MANIFEST:
			return `串流文件尚未就緒：${originalMsg || "請檢查後端服務或稍後重試"}`;
		case StreamErrorType.MEDIA:
			return `媒體錯誤：${originalMsg || "請嘗試重新載入"}`;
		default:
			return `發生未知錯誤：${originalMsg || "請稍後重試"}`;
	}
};

/**
 * 獲取錯誤恢復策略
 */
export const getErrorRecoveryStrategy = (errorType: StreamErrorType): ErrorRecoveryStrategy => {
	switch (errorType) {
		case StreamErrorType.NETWORK:
		case StreamErrorType.TIMEOUT:
			// 網路錯誤：重試，延遲較長
			return {
				retry: true,
				retryDelay: 1000,
				maxRetries: 5
			};
		case StreamErrorType.MANIFEST:
			// 清單錯誤：重試，延遲較短（可能是 MediaMTX 尚未生成文件）
			return {
				retry: true,
				retryDelay: 300,
				maxRetries: 8
			};
		case StreamErrorType.MEDIA:
			// 媒體錯誤：嘗試恢復
			return {
				retry: true,
				retryDelay: 500,
				maxRetries: 3
			};
		case StreamErrorType.CODEC:
		case StreamErrorType.PERMISSION:
			// 編解碼器和權限錯誤：不重試（需要用戶介入）
			return {
				retry: false,
				retryDelay: 0,
				maxRetries: 0
			};
		default:
			// 未知錯誤：保守重試
			return {
				retry: true,
				retryDelay: 1000,
				maxRetries: 3
			};
	}
};
