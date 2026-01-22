/**
 * 人流統計進出場記錄 API Composable
 * 負責進出場記錄相關 API
 * 
 * 重構說明：
 * - 使用後端新 API，移除前端業務邏輯計算
 * - 事件類型判斷、資料關聯等由後端處理
 * - 前端只負責資料展示和簡單格式化
 */

import type { PeopleCountingLog } from "~/types/peopleCounting";
import { useApiBase } from "~/composables/core/useApiBase";
import { logger } from "~/utils/logger";
import { convertApiLogToFrontend } from "~/utils/peopleCountingAdapter";

/**
 * 後端 API 回應的進出場記錄格式
 */
type LocationLogsResponse = {
	logs: Array<{
		id: string;
		personId: number;
		personName: string;
		unitId: number | null;
		unitName: string;
		eventType: "entry" | "exit" | "failed";
		timestamp: string;
		deviceScreenshotUrl: string;
	}>;
};

/**
 * 人流統計進出場記錄 API
 */
export const usePeopleCountingEntryApi = () => {
	const entryApiLogger = logger.createLogger("PeopleCounting Entry API");
	const { request } = useApiBase();

	/**
	 * 取得地點進出場記錄
	 * 使用後端 API，後端已處理事件類型判斷和資料關聯
	 */
	const getLocationLogs = async (
		locationId: number,
		options?: { limit?: number; unitId?: number }
	): Promise<PeopleCountingLog[]> => {
		try {
			const params = new URLSearchParams();
			if (options?.limit) {
				params.append("limit", String(options.limit));
			}
			if (options?.unitId) {
				params.append("unitId", String(options.unitId));
			}

			const queryString = params.toString();
			const url = `/people-counting/sites/${locationId}/logs${queryString ? `?${queryString}` : ""}`; // 注意：後端 API 路徑可能還是 /sites

			const response = await request<LocationLogsResponse>(url);

			// 確保 logs 存在，如果不存在則返回空陣列
			const logs = response.logs || [];

			// 使用統一的轉換函數
			return logs.map(log => convertApiLogToFrontend(log, locationId));
		} catch (error) {
			entryApiLogger.error("取得進出場記錄失敗", { locationId, options, error });
			throw error;
		}
	};

	return {
		getLocationLogs
	};
};
