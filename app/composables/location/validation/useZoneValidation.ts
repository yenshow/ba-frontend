/**
 * 區域驗證 Composable
 * 統一處理區域表單的驗證邏輯
 */

import { MAX_ZONE_IMAGE_BYTES, ZONE_IMAGE_ACCEPT_TYPES } from "~/constants/zoneImage"

export interface ZoneValidationResult {
	isValid: boolean;
	errors: string[];
}

export function useZoneValidation() {
	const validateZoneName = (name: string | undefined | null): string | null => {
		if (!name || name.trim().length === 0) {
			return "區域名稱不能為空";
		}
		if (name.length > 100) {
			return "區域名稱長度不能超過 100 字元";
		}
		return null;
	};

	const validateZoneImage = (imageUrl: string | undefined | null): string | null => {
		if (!imageUrl) return null;

		if (imageUrl.startsWith("data:image/")) {
			const base64Data = imageUrl.split(",")[1];
			if (!base64Data) {
				return "圖片格式不正確";
			}

			const sizeInBytes = (base64Data.length * 3) / 4;
			if (sizeInBytes > MAX_ZONE_IMAGE_BYTES) {
				return "圖片大小不能超過 10MB";
			}

			const mimeType = imageUrl.match(/data:([^;]+);/)?.[1];
			if (mimeType && !ZONE_IMAGE_ACCEPT_TYPES.includes(mimeType as (typeof ZONE_IMAGE_ACCEPT_TYPES)[number])) {
				return "不支援的圖片格式，請使用 PNG、JPG、GIF 或 WEBP";
			}
		} else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
			return null;
		} else {
			return "圖片格式不正確";
		}

		return null;
	};

	const validateZoneDescription = (description: string | undefined | null): string | null => {
		if (!description) return null;
		if (description.length > 500) {
			return "區域描述長度不能超過 500 字元";
		}
		return null;
	};

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

