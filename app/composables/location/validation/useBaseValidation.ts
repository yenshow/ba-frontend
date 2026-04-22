/**
 * 區域／地點基礎驗證 Composable
 * 統一處理區域與地點表單的基礎驗證邏輯
 * 系統特定的驗證邏輯請使用對應的系統驗證 composable
 */

/** 區域示意圖：允許的 MIME 類型（上傳與 base64 驗證共用） */
export const ZONE_IMAGE_ACCEPT_TYPES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/webp",
] as const

export const ZONE_IMAGE_ACCEPT_ATTR = ZONE_IMAGE_ACCEPT_TYPES.join(",")

/** 區域示意圖大小上限（位元組） */
export const MAX_ZONE_IMAGE_BYTES = 10 * 1024 * 1024

export interface ZoneValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface LocationValidationResult {
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

export function useLocationValidation() {
	const validateLocationName = (name: string | undefined | null): string | null => {
		if (!name || name.trim().length === 0) {
			return "地點名稱不能為空";
		}
		if (name.length > 100) {
			return "地點名稱長度不能超過 100 字元";
		}
		return null;
	};

	const validateLocationDescription = (description: string | undefined | null): string | null => {
		if (!description) return null;
		if (description.length > 500) {
			return "地點描述長度不能超過 500 字元";
		}
		return null;
	};

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
