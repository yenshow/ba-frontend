/**
 * 地點驗證 Composable
 * 統一處理地點表單的基礎驗證邏輯
 * 系統特定的驗證邏輯請使用對應的系統驗證 composable
 */

export interface LocationValidationResult {
	isValid: boolean;
	errors: string[];
}

export function useLocationValidation() {
	/**
	 * 驗證地點名稱
	 */
	const validateLocationName = (name: string | undefined | null): string | null => {
		if (!name || name.trim().length === 0) {
			return "地點名稱不能為空";
		}
		if (name.length > 100) {
			return "地點名稱長度不能超過 100 字元";
		}
		return null;
	};

	/**
	 * 驗證地點描述
	 */
	const validateLocationDescription = (description: string | undefined | null): string | null => {
		if (!description) return null; // 選填欄位
		if (description.length > 500) {
			return "地點描述長度不能超過 500 字元";
		}
		return null;
	};

	/**
	 * 驗證地點基礎資料
	 */
	const validateLocation = (location: {
		name?: string | null;
		description?: string | null;
	}): LocationValidationResult => {
		const errors: string[] = [];

		const nameError = validateLocationName(location.name);
		if (nameError) errors.push(nameError);

		const descriptionError = validateLocationDescription(location.description);
		if (descriptionError) errors.push(descriptionError);

		return {
			isValid: errors.length === 0,
			errors
		};
	};

	/**
	 * 檢查同一區域內地點名稱是否重複
	 */
	const checkDuplicateLocationName = (
		locationName: string,
		locations: Array<{ name?: string; id?: string }>,
		currentLocationId?: string
	): boolean => {
		const trimmedName = locationName.trim();
		return locations.some(
			loc =>
				loc.name?.trim() === trimmedName &&
				loc.id !== currentLocationId &&
				loc.name?.trim().length > 0
		);
	};

	return {
		validateLocationName,
		validateLocationDescription,
		validateLocation,
		checkDuplicateLocationName
	};
}

