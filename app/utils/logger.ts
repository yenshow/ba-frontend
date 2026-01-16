/**
 * 統一日誌工具
 * 提供統一的日誌記錄功能，自動處理開發/生產環境區分
 */

export type LogLevel = "log" | "info" | "warn" | "error";

/**
 * 統一日誌工具
 */
export const logger = {
	/**
	 * 記錄一般訊息（僅開發環境）
	 */
	log: (msg: string, ...args: unknown[]) => {
		if (process.dev) {
			console.log(`[${new Date().toISOString()}] ${msg}`, ...args);
		}
	},

	/**
	 * 記錄資訊訊息（僅開發環境）
	 */
	info: (msg: string, ...args: unknown[]) => {
		if (process.dev) {
			console.info(`[${new Date().toISOString()}] ${msg}`, ...args);
		}
	},

	/**
	 * 記錄警告訊息（僅開發環境）
	 */
	warn: (msg: string, ...args: unknown[]) => {
		if (process.dev) {
			console.warn(`[${new Date().toISOString()}] ${msg}`, ...args);
		}
	},

	/**
	 * 記錄錯誤訊息（總是記錄）
	 */
	error: (msg: string, ...args: unknown[]) => {
		console.error(`[${new Date().toISOString()}] ${msg}`, ...args);
	},

	/**
	 * 創建模組專用記錄器
	 * @param moduleName 模組名稱
	 * @returns 模組專用記錄器
	 */
	createLogger: (moduleName: string) => ({
		log: (msg: string, ...args: unknown[]) => logger.log(`[${moduleName}] ${msg}`, ...args),
		info: (msg: string, ...args: unknown[]) => logger.info(`[${moduleName}] ${msg}`, ...args),
		warn: (msg: string, ...args: unknown[]) => logger.warn(`[${moduleName}] ${msg}`, ...args),
		error: (msg: string, ...args: unknown[]) => logger.error(`[${moduleName}] ${msg}`, ...args)
	})
};
