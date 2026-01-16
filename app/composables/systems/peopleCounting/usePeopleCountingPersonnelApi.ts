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
	const getUnitPersonnel = async (unitId: number): Promise<PeopleCountingPersonnel[]> => {
		try {
			const response = await request<{ personnel: Array<{
				id: number;
				employeeId: string;
				name: string;
				photoUrl?: string;
				isInside: boolean;
				lastEntryTime: string | null;
				lastExitTime: string | null;
			}> }>("/people-counting/units/" + unitId + "/personnel");

			// 轉換為前端格式
			return response.personnel.map(person => {
				// 處理 Base64 圖片：如果後端返回的是純 Base64，需要加上前綴
				let photoUrl: string | undefined = undefined;
				if (person.photoUrl) {
					// 如果已經是 data:image 格式，直接使用；否則加上前綴
					if (person.photoUrl.startsWith("data:image")) {
						photoUrl = person.photoUrl;
					} else {
						photoUrl = `data:image/jpeg;base64,${person.photoUrl}`;
					}
				}

				return {
					id: person.id,
					unitId,
					employeeId: person.employeeId,
					name: person.name,
					photoUrl,
					photo: photoUrl, // 支援兩種命名方式
					lastEntryTime: person.lastEntryTime ? formatDateTime(person.lastEntryTime) : undefined,
					lastExitTime: person.lastExitTime ? formatDateTime(person.lastExitTime) : undefined,
					lastEntryDate: person.lastEntryTime ? formatDateTime(person.lastEntryTime, false) : undefined,
					entryTime: person.lastEntryTime ? formatDateTime(person.lastEntryTime) : undefined,
					exitTime: person.lastExitTime ? formatDateTime(person.lastExitTime) : undefined,
					isInside: person.isInside,
					isPresent: person.isInside // 支援兩種命名方式
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
