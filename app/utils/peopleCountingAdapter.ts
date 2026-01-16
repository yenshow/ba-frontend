/**
 * 人流統計數據轉換工具
 * 提供外部資料庫格式與前端格式之間的轉換函數
 */

import type {
	PeopleCountingPersonnel,
	PeopleCountingUnit
} from "~/types/peopleCounting";
import { formatDateTime } from "~/utils/dateUtils";

/**
 * 外部資料庫的原始資料格式
 */
export interface ExternalPerson {
	id: number;
	person_group_id: number;
	full_name: string;
	person_type: number; // 0: 一般人員, 1: 訪客, 2: 黑名單
}

export interface ExternalPersonGroup {
	id: number;
	name: string;
	is_deleted: number;
}

export interface ExternalPersonHeadPic {
	id: number;
	person_id: number;
	standard_head_portrait?: string; // Base64 編碼的圖片
	thumbnail_head_portrait?: string;
}

export interface ExternalSlotCardRecord {
	person_id: number; // -1 表示未註冊人員
	swip_card_rev_time: string; // ISO 8601 格式
	snap_pic_url?: string; // 設備截圖 URL（格式：Vsm://...）
	is_registered: boolean; // 是否為已註冊人員
}

/**
 * 轉換外部人員資料為前端格式
 */
export const transformPerson = (
	person: ExternalPerson,
	headPic?: ExternalPersonHeadPic
): PeopleCountingPersonnel => {
	// 處理照片 URL（Base64 轉換）
	let photoUrl: string | undefined;
	if (headPic?.standard_head_portrait) {
		photoUrl = `data:image/jpeg;base64,${headPic.standard_head_portrait}`;
	} else if (headPic?.thumbnail_head_portrait) {
		photoUrl = `data:image/jpeg;base64,${headPic.thumbnail_head_portrait}`;
	}

	return {
		id: person.id,
		unitId: person.person_group_id,
		employeeId: String(person.id), // 使用 person.id 作為工號（實際資料沒有 person_code）
		name: person.full_name,
		photoUrl,
		photo: photoUrl, // 向後兼容
		// 這些欄位需要從刷卡記錄計算
		lastEntryTime: undefined,
		lastExitTime: undefined,
		isInside: undefined,
		isPresent: undefined // 向後兼容
	};
};

/**
 * 轉換外部人員群組為前端單位格式
 */
export const transformPersonGroup = (
	group: ExternalPersonGroup,
	siteId: number,
	currentCount?: number
): PeopleCountingUnit => {
	return {
		id: group.id,
		siteId,
		name: group.name,
		capacity: 0, // 需要從配置或計算得出
		currentCount
	};
};

/**
 * 生成刷卡記錄的唯一 ID
 * 因為實際資料中沒有 id 欄位，需要生成唯一識別碼
 */
export const generateRecordId = (personId: number, timestamp: string): string => {
	// 使用 person_id + timestamp 組合生成唯一 ID
	const timestampNum = new Date(timestamp).getTime();
	return `${personId}-${timestampNum}`;
};

/**
 * 解析刷卡記錄的事件類型（Entry/Exit）
 *
 * ⚠️ 注意：實際資料中沒有 message_key 欄位
 * 需要使用時間序列分析或智能判斷邏輯
 *
 * 策略：追蹤每個人的在場狀態，基於前一次事件類型判斷
 */
export const parseEventType = (
	record: ExternalSlotCardRecord,
	allRecords: ExternalSlotCardRecord[],
	recordIndex: number,
	personPresenceMap: Map<number, { lastEvent: "entry" | "exit"; lastTime: Date }>
): "entry" | "exit" => {
	const personId = record.person_id;
	const recordTime = new Date(record.swip_card_rev_time);

	// 未註冊人員預設為 entry
	if (personId === -1) {
		return "entry";
	}

	// 取得該人員的前一筆記錄狀態
	const previousPresence = personPresenceMap.get(personId);

	if (!previousPresence) {
		// 第一次記錄，預設為 entry
		personPresenceMap.set(personId, {
			lastEvent: "entry",
			lastTime: recordTime
		});
		return "entry";
	}

	// 計算時間間隔
	const timeDiff = recordTime.getTime() - previousPresence.lastTime.getTime();
	const SHORT_INTERVAL = 5 * 60 * 1000; // 5 分鐘
	const LONG_INTERVAL = 30 * 60 * 1000; // 30 分鐘

	// 判斷邏輯：
	// 1. 如果前一次是 entry 且時間間隔很短（< 5 分鐘），這次應該是 exit
	// 2. 如果前一次是 exit 且時間間隔很長（> 30 分鐘），這次應該是 entry
	// 3. 其他情況，取相反類型（交替進出）

	let eventType: "entry" | "exit";

	if (previousPresence.lastEvent === "entry" && timeDiff < SHORT_INTERVAL) {
		eventType = "exit"; // 短時間內再次刷卡，應該是出場
	} else if (previousPresence.lastEvent === "exit" && timeDiff > LONG_INTERVAL) {
		eventType = "entry"; // 長時間後刷卡，應該是進場
	} else {
		// 取相反類型（交替進出）
		eventType = previousPresence.lastEvent === "entry" ? "exit" : "entry";
	}

	// 更新狀態
	personPresenceMap.set(personId, {
		lastEvent: eventType,
		lastTime: recordTime
	});

	return eventType;
};

/**
 * 按時間排序記錄（最早的在前）
 */
export const sortRecordsByTime = (records: ExternalSlotCardRecord[]): ExternalSlotCardRecord[] => {
	return [...records].sort(
		(a, b) => new Date(a.swip_card_rev_time).getTime() - new Date(b.swip_card_rev_time).getTime()
	);
};

/**
 * 建立 person_group_id -> person_group.name 的映射表
 */
export const buildUnitNameMap = (groups: ExternalPersonGroup[]): Map<number, string> => {
	const unitNameMap = new Map<number, string>();
	groups.forEach(group => {
		unitNameMap.set(group.id, group.name);
	});
	return unitNameMap;
};

/**
 * 從樓層名稱提取區域資訊
 */
export const extractRegionFromFloorName = (floorName: string): string | null => {
	const regionKeywords = ["北部", "中部", "南部", "東部"];
	for (const keyword of regionKeywords) {
		if (floorName.includes(keyword)) {
			return keyword;
		}
	}
	return null;
};

/**
 * 從群組名稱提取區域資訊（保留用於向後兼容）
 */
export const extractRegionFromGroupName = (groupName: string): string | null => {
	return extractRegionFromFloorName(groupName);
};

