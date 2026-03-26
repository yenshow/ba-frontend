/**
 * 照明系統地點驗證 Composable
 * 處理照明系統特定的驗證邏輯
 */

import type { LightingLocation } from "~/types/lighting";
import { useLocationValidation } from "~/composables/location/validation/useLocationValidation";
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation";

export interface LightingLocationValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export function useLightingLocationValidation() {
	const { validateLocationName, checkDuplicateLocationName } = useLocationValidation();
	const { validateModbusAddress, validateModbusType } = useModbusValidation();

	/**
	 * 檢查地址是否重複（同一區域內，相同設備，相同類型）
	 */
	const checkDuplicateAddress = (
		location: LightingLocation,
		locations: LightingLocation[],
		currentIndex: number
	): boolean => {
		if (!location.deviceId || !location.modbus?.points?.[0]) {
			return false;
		}

		const deviceId = location.deviceId;
		const type = location.modbus.points[0].type;
		const address = location.modbus.points[0].address;

		if (address === undefined) {
			return false;
		}

		return locations.some((loc, index) => {
			if (index === currentIndex) return false;
			if (!loc.deviceId || !loc.modbus?.points?.[0]) return false;

			return (
				loc.deviceId === deviceId &&
				loc.modbus.points[0].type === type &&
				loc.modbus.points[0].address === address
			);
		});
	};

	/**
	 * 驗證完整的地點資料
	 */
	const validateLightingLocation = (
		location: LightingLocation,
		allLocations: LightingLocation[] = [],
		currentIndex: number = -1
	): LightingLocationValidationResult => {
		const errors: string[] = [];
		const warnings: string[] = [];

		// 基礎驗證
		const nameError = validateLocationName(location.name);
		if (nameError) errors.push(nameError);

		// 檢查名稱重複
		if (location.name && allLocations.length > 0) {
			const isDuplicate = checkDuplicateLocationName(
				location.name,
				allLocations,
				location.id
			);
			if (isDuplicate) {
				warnings.push("地點名稱與其他地點重複");
			}
		}

		// 如果選擇了設備，驗證 Modbus 配置
		if (location.deviceId && location.deviceId > 0) {
			const typeError = validateModbusType(
				location.modbus?.points?.[0]?.type,
				location.deviceId
			);
			if (typeError) errors.push(typeError);

			const addressError = validateModbusAddress(
				location.modbus?.points?.[0]?.address,
				location.deviceId
			);
			if (addressError) errors.push(addressError);

			// 檢查地址重複
			if (currentIndex >= 0 && checkDuplicateAddress(location, allLocations, currentIndex)) {
				warnings.push("Modbus 地址與其他點位重複（相同設備、相同類型）");
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings
		};
	};

	/**
	 * 驗證區域內所有地點
	 */
	const validateZoneLocations = (locations: LightingLocation[]): {
		isValid: boolean;
		errors: string[];
		warnings: string[];
	} => {
		const allErrors: string[] = [];
		const allWarnings: string[] = [];

		locations.forEach((location, index) => {
			const result = validateLightingLocation(location, locations, index);
			if (!result.isValid) {
				allErrors.push(...result.errors.map(err => `點位「${location.name || `點位 ${index + 1}`}」: ${err}`));
			}
			if (result.warnings.length > 0) {
				allWarnings.push(...result.warnings.map(warn => `點位「${location.name || `點位 ${index + 1}`}」: ${warn}`));
			}
		});

		return {
			isValid: allErrors.length === 0,
			errors: allErrors,
			warnings: allWarnings
		};
	};

	return {
		validateModbusAddress,
		validateModbusType,
		checkDuplicateAddress,
		validateLightingLocation,
		validateZoneLocations
	};
}

