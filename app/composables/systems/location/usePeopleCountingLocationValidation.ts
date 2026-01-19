/**
 * 人流統計系統地點驗證 Composable
 * 處理人流統計系統特定的驗證邏輯
 */

import type { PeopleCountingLocation } from "~/types/peopleCounting";
import { useLocationValidation } from "~/composables/systems/location/useLocationValidation";

export interface PeopleCountingLocationValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export function usePeopleCountingLocationValidation() {
	const { validateLocationName } = useLocationValidation();

	/**
	 * 驗證 personGroupIds
	 */
	const validatePersonGroupIds = (personGroupIds: number[] | undefined | null): string | null => {
		if (!personGroupIds || !Array.isArray(personGroupIds)) {
			return "personGroupIds 必須是陣列";
		}

		if (personGroupIds.length === 0) {
			return "personGroupIds 至少需要一個元素";
		}

		// 檢查是否都是有效的數字
		for (const id of personGroupIds) {
			if (typeof id !== "number" || id <= 0 || !Number.isInteger(id)) {
				return "personGroupIds 中的每個元素必須是正整數";
			}
		}

		// 檢查是否有重複
		const uniqueIds = new Set(personGroupIds);
		if (personGroupIds.length !== uniqueIds.size) {
			return "personGroupIds 中不能有重複的元素";
		}

		return null;
	};

	/**
	 * 驗證門禁設備 ID
	 */
	const validateDoorId = (doorId: number | undefined | null, fieldName: string): string | null => {
		if (doorId === undefined || doorId === null) {
			return null; // 選填欄位
		}

		if (typeof doorId !== "number") {
			return `${fieldName} 必須是數字`;
		}

		if (doorId <= 0 || !Number.isInteger(doorId)) {
			return `${fieldName} 必須是正整數`;
		}

		return null;
	};

	/**
	 * 驗證完整的地點資料
	 */
	const validatePeopleCountingLocation = (
		location: PeopleCountingLocation
	): PeopleCountingLocationValidationResult => {
		const errors: string[] = [];
		const warnings: string[] = [];

		// 基礎驗證
		const nameError = validateLocationName(location.name);
		if (nameError) errors.push(nameError);

		// 驗證 personGroupIds
		const personGroupIdsError = validatePersonGroupIds(location.personGroupIds);
		if (personGroupIdsError) errors.push(personGroupIdsError);

		// 驗證門禁設備 ID
		const entryDoorError = validateDoorId(location.entryDoorId, "入口設備 ID");
		if (entryDoorError) errors.push(entryDoorError);

		const exitDoorError = validateDoorId(location.exitDoorId, "出口設備 ID");
		if (exitDoorError) errors.push(exitDoorError);

		// 如果只有入口或只有出口，給出警告
		if (location.entryDoorId && !location.exitDoorId) {
			warnings.push("已設定入口設備，但未設定出口設備");
		}
		if (location.exitDoorId && !location.entryDoorId) {
			warnings.push("已設定出口設備，但未設定入口設備");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings
		};
	};

	return {
		validatePersonGroupIds,
		validateDoorId,
		validatePeopleCountingLocation
	};
}

