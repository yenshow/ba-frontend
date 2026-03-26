/**
 * 環境監測系統地點驗證 Composable
 * 處理環境監測系統特定的驗證邏輯
 */

import type { EnvironmentLocation, SensorParameterType } from "~/types/environment";
import { useLocationValidation } from "~/composables/location/validation/useLocationValidation";

export interface EnvironmentLocationValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

const VALID_PARAMETER_TYPES: SensorParameterType[] = [
	"pm25",
	"pm10",
	"tvoc",
	"hcho",
	"humidity",
	"temperature",
	"co2",
	"noise",
	"wind"
];

export function useEnvironmentLocationValidation() {
	const { validateLocationName } = useLocationValidation();

	const validateParameterType = (type: string | undefined | null): string | null => {
		if (!type) {
			return "參數類型不能為空";
		}

		if (!VALID_PARAMETER_TYPES.includes(type as SensorParameterType)) {
			return `無效的參數類型: ${type}`;
		}

		return null;
	};

	const validateParameters = (parameters: Array<{ type: string; enabled: boolean }>): string | null => {
		if (!Array.isArray(parameters)) {
			return "參數列表必須是陣列";
		}

		const types = parameters.map(p => p.type).filter(Boolean);
		const uniqueTypes = new Set(types);
		if (types.length !== uniqueTypes.size) {
			return "參數列表中不能有重複的參數類型";
		}

		for (const param of parameters) {
			const typeError = validateParameterType(param.type);
			if (typeError) {
				return typeError;
			}

			if (typeof param.enabled !== "boolean") {
				return "參數的 enabled 欄位必須是布林值";
			}
		}

		return null;
	};

	const validateEnvironmentLocation = (
		location: EnvironmentLocation
	): EnvironmentLocationValidationResult => {
		const errors: string[] = [];
		const warnings: string[] = [];

		const nameError = validateLocationName(location.name);
		if (nameError) errors.push(nameError);

		if (location.parameters && location.parameters.length > 0) {
			const paramError = validateParameters(location.parameters);
			if (paramError) errors.push(paramError);
		}

		if (location.deviceId && location.deviceId > 0) {
			const enabledParams = location.parameters?.filter(p => p.enabled) || [];
			if (enabledParams.length === 0) {
				warnings.push("已選擇感測器設備，但未啟用任何參數");
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings
		};
	};

	return {
		validateParameterType,
		validateParameters,
		validateEnvironmentLocation
	};
}

