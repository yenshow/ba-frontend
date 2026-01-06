/**
 * 錯誤處理相關工具函數
 */

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

