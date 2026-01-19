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
import { formatDateTime } from "~/utils/dateUtils";

/**
 * 人流統計進出場記錄 API
 */
export const usePeopleCountingEntryApi = () => {
	const entryApiLogger = logger.createLogger("PeopleCounting Entry API");
	const { request } = useApiBase();

	/**
	 * 取得工地進出場記錄
	 * 使用後端 API，後端已處理事件類型判斷和資料關聯
	 */
	const getSiteLogs = async (
		siteId: number,
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
			const url = `/people-counting/sites/${siteId}/logs${queryString ? `?${queryString}` : ""}`;

			const response = await request<{ logs: Array<{
				id: string;
				personId: number;
				personName: string;
				unitId: number | null;
				unitName: string;
				eventType: "entry" | "exit";
				timestamp: string;
				deviceScreenshotUrl: string;
			}> }>>(url);

			// 轉換為前端格式
			return response.logs.map(log => ({
				id: log.id,
					siteId,
				unitId: log.unitId || 0,
				personnelId: log.personId !== -1 ? log.personId : undefined,
				personId: log.personId !== -1 ? log.personId : undefined,
				deviceId: 0, // 後端未提供設備 ID
				eventType: log.eventType,
				employeeId: log.personId !== -1 ? String(log.personId) : undefined,
				name: log.personName || undefined,
				personName: log.personName || undefined,
				deviceScreenshotUrl: log.deviceScreenshotUrl || undefined,
				unitName: log.unitName || undefined,
				timestamp: formatDateTime(log.timestamp, true) // 格式化時間
			}));
		} catch (error) {
			entryApiLogger.error("取得進出場記錄失敗", { siteId, options, error });
			throw error;
		}
	};

	return {
		getSiteLogs
	};
};
