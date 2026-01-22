/**
 * 人流統計人員管理 API Composable
 * 負責人員相關 API
 * 
 * 重構說明：
 * - 使用後端新 API，移除前端業務邏輯計算
 * - 狀態計算、進出場時間判斷等由後端處理
 * - 前端只負責資料展示和簡單格式化
 */

import type { PeopleCountingPersonnel } from "~/types/peopleCounting";
import { useApiBase } from "~/composables/core/useApiBase";
import { logger } from "~/utils/logger";
import { formatDateTime } from "~/utils/dateUtils";

/**
 * 人流統計人員管理 API
 */
export const usePeopleCountingPersonnelApi = () => {
	const personnelApiLogger = logger.createLogger("PeopleCounting Personnel API");
	const { request } = useApiBase();

	/**
	 * 取得單位人員列表
	 * 使用後端 API，後端已處理狀態計算和進出場時間
	 */
	const getUnitPersonnel = async (unitId: number, locationId?: number): Promise<PeopleCountingPersonnel[]> => {
		try {
			const url = locationId 
				? `/people-counting/units/${unitId}/personnel?siteId=${locationId}` // 注意：後端 API 參數可能還是 siteId
				: `/people-counting/units/${unitId}/personnel`;
			
			const response = await request<{ 
				personnel: Array<{
				id: number;
				employeeId: string;
				name: string;
				photoUrl?: string;
				isInside: boolean;
				lastEntryTime: string | null;
				lastExitTime: string | null;
					lastEntryDate: string | null; // 最近進場日期（不含時分秒）
					entryTime: string | null; // 進場時間（時分秒）
					exitTime: string | null; // 離場時間（時分秒）
					isTodayEntry?: boolean; // 是否為今日進場
				}>;
				entryCount: number;
				exitCount: number;
			}>(url);

			// 轉換為前端格式
			return response.personnel.map(person => {
				// 處理 Base64 圖片：如果後端返回的是純 Base64，需要加上前綴
				const photoUrl = person.photoUrl
					? person.photoUrl.startsWith("data:image")
						? person.photoUrl
						: `data:image/jpeg;base64,${person.photoUrl}`
					: undefined;

				return {
					id: person.id,
					unitId,
					employeeId: person.employeeId,
					name: person.name,
					photoUrl,
					lastEntryTime: person.lastEntryTime ? formatDateTime(person.lastEntryTime) : undefined,
					lastExitTime: person.lastExitTime ? formatDateTime(person.lastExitTime) : undefined,
					lastEntryDate: person.lastEntryDate || undefined,
					entryTime: person.entryTime || undefined,
					exitTime: person.exitTime || undefined,
					isPresent: person.isInside ?? false,
					isTodayEntry: person.isTodayEntry ?? false
				};
			});
		} catch (error) {
			personnelApiLogger.error("取得單位人員失敗", { unitId, error });
			throw error;
		}
	};

	return {
		getUnitPersonnel
	};
};
