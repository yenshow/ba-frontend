/**
 * 錯誤處理相關工具函數
 */

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
 * 錯誤優先級關鍵字映射（集中管理，供 useErrorHandler 使用）
 */
export const ERROR_KEYWORDS = {
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
 * 檢查是否為設備連接錯誤
 * @param errorMessage - 錯誤訊息
 * @returns 是否為設備連接錯誤
 */
export const isDeviceConnectionError = (errorMessage: string): boolean => {
	return (
		errorMessage.includes("503") ||
		errorMessage.includes("服務不可用") ||
		errorMessage.includes("設備離線") ||
		errorMessage.includes("設備連接失敗") ||
		errorMessage.includes("連接超時") ||
		errorMessage.includes("連接被拒絕") ||
		errorMessage.includes("無法到達設備") ||
		errorMessage.includes("連接已斷開") ||
		(errorMessage.includes("無法連接到後端伺服器") && 
		 (errorMessage.includes("/modbus/") || errorMessage.includes("/device/")))
	);
};

/**
 * 檢查是否為設備 API 請求
 * @param path - API 路徑
 * @returns 是否為設備 API 請求
 */
export const isDeviceApiRequest = (path: string): boolean => {
	return path.includes("/modbus/") || path.includes("/device/");
};

