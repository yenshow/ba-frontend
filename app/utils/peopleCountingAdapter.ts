/**
 * 人流統計數據轉換工具
 * 
 * 職權分離：
 * - 統一所有數據轉換邏輯
 * - 提供標準化的數據適配函數
 */

import type { PeopleCountingLog } from "~/types/peopleCounting";
import { formatDateTime } from "~/utils/dateUtils";

/**
 * 從樓層名稱提取區域資訊
 */
export const extractRegionFromZoneName = (zoneName: string): string | null => {
	const regionKeywords = ["北部", "中部", "南部", "東部"];
	for (const keyword of regionKeywords) {
		if (zoneName.includes(keyword)) {
			return keyword;
		}
	}
	return null;
};

/**
 * 將後端 API 返回的記錄轉換為前端格式
 * 統一處理字段映射和格式轉換
 */
export const convertApiLogToFrontend = (
	log: {
		id: string;
		personId: number;
		personName: string;
		unitId: number | null;
		unitName: string;
		eventType: "entry" | "exit" | "failed";
		timestamp: string;
		deviceScreenshotUrl: string;
	},
	locationId: number
): PeopleCountingLog => {
	const personnelId = log.personId !== -1 ? log.personId : undefined;

	return {
		id: log.id,
		locationId,
		unitId: log.unitId || 0,
		personnelId,
		deviceId: 0,
		eventType: log.eventType,
		personName: log.personName || undefined,
		deviceScreenshotUrl: log.deviceScreenshotUrl || undefined,
		unitName: log.unitName || undefined,
		timestamp: formatDateTime(log.timestamp, true)
	};
};

