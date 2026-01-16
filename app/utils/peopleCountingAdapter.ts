/**
 * 人流統計數據轉換工具
 * 
 * 重構說明：
 * - 移除所有業務邏輯處理函數（已移至後端）
 * - 只保留前端展示層需要的工具函數
 */

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

