/**
 * 區域驗證 Composable
 * 統一處理區域表單的驗證邏輯
 */

export interface ZoneValidationResult {
	isValid: boolean;
	errors: string[];
}

export function useZoneValidation() {
	/**
	 * 驗證區域名稱
	 */
	const validateZoneName = (name: string | undefined | null): string | null => {
		if (!name || name.trim().length === 0) {
			return "區域名稱不能為空";
		}
		if (name.length > 100) {
			return "區域名稱長度不能超過 100 字元";
		}
		return null;
	};

	/**
	 * 驗證區域示意圖
	 */
	const validateZoneImage = (imageUrl: string | undefined | null): string | null => {
		if (!imageUrl) return null; // 選填欄位

		// 檢查是否為 Base64 格式
		if (imageUrl.startsWith("data:image/")) {
			const base64Data = imageUrl.split(",")[1];
			if (!base64Data) {
				return "圖片格式不正確";
			}

			// 檢查檔案大小（Base64 編碼後會增加約 33% 的大小）
			const sizeInBytes = (base64Data.length * 3) / 4;
			const maxSize = 10 * 1024 * 1024; // 10MB
			if (sizeInBytes > maxSize) {
				return "圖片大小不能超過 10MB";
			}

			// 檢查檔案格式
			const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
			const mimeType = imageUrl.match(/data:([^;]+);/)?.[1];
			if (mimeType && !validTypes.includes(mimeType)) {
				return "不支援的圖片格式，請使用 PNG、JPG、GIF 或 WEBP";
			}
		} else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			// URL 格式，不進行大小檢查
			return null;
		} else {
			return "圖片格式不正確";
		}

		return null;
	};

	/**
	 * 驗證區域描述
	 */
	const validateZoneDescription = (description: string | undefined | null): string | null => {
		if (!description) return null; // 選填欄位
		if (description.length > 500) {
			return "區域描述長度不能超過 500 字元";
		}
		return null;
	};

	/**
	 * 驗證完整區域資料
	 */
	const validateZone = (zone: {
		name?: string | null;
		imageUrl?: string | null;
		description?: string | null;
	}): ZoneValidationResult => {
		const errors: string[] = [];

		const nameError = validateZoneName(zone.name);
		if (nameError) errors.push(nameError);

		const imageError = validateZoneImage(zone.imageUrl);
		if (imageError) errors.push(imageError);

		const descriptionError = validateZoneDescription(zone.description);
		if (descriptionError) errors.push(descriptionError);

		return {
			isValid: errors.length === 0,
			errors
		};
	};

	return {
		validateZoneName,
		validateZoneImage,
		validateZoneDescription,
		validateZone
	};
}

