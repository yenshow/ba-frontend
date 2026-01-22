/**
 * 人流統計數據轉換工具
 * 
 * 職權分離：
 * - 統一所有數據轉換邏輯
 * - 確保 API 和 WebSocket 數據格式一致
 * - 提供標準化的數據適配函數
 */

import type { PeopleCountingLog } from "~/types/peopleCounting";
import type { PeopleCountingRecordNewEvent } from "~/composables/websocket/useWebSocket";
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
 * 將記錄數據轉換為前端格式的通用邏輯
 */
const createLogFromData = (
	data: {
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
	const personnelId = data.personId !== -1 ? data.personId : undefined;

	return {
		id: data.id,
		locationId,
		unitId: data.unitId || 0,
		personnelId,
		deviceId: 0,
		eventType: data.eventType,
		personName: data.personName || undefined,
		deviceScreenshotUrl: data.deviceScreenshotUrl || undefined,
		unitName: data.unitName || undefined,
		timestamp: formatDateTime(data.timestamp, true)
	};
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
	return createLogFromData(log, locationId);
};

/**
 * 將 WebSocket 事件數據轉換為前端格式
 * 確保與 API 返回格式一致
 */
export const convertWebSocketEventToLog = (
	data: PeopleCountingRecordNewEvent
): PeopleCountingLog => {
	return createLogFromData(data, data.locationId || 0);
};

