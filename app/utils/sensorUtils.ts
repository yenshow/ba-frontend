import type {
	SensorParameterType,
	SensorParameter,
	EnvironmentLocation,
	EnvironmentZone
} from "~/types/environment";
import { getEnvironmentParameterDefinition } from "~/utils/environmentCatalogRuntime";

/**
 * 參數類型顯示名稱映射
 */
export const getParameterDisplayName = (type: SensorParameterType | string): string => {
	const def = getEnvironmentParameterDefinition(type);
	if (def) return def.label;
	return String(type);
};

/**
 * 參數類型單位映射
 */
export const getParameterUnit = (type: SensorParameterType | string): string => {
	return getEnvironmentParameterDefinition(type)?.unit ?? "";
};

/**
 * 參數類型圖標映射
 */
export const getParameterIcon = (type: SensorParameterType | string): string => {
	return getEnvironmentParameterDefinition(type)?.icon ?? "";
};

/**
 * 取得地點的感測器設備 ID 列表（支援 deviceIds 與舊版 deviceId）
 */
export const getLocationDeviceIds = (
	location: EnvironmentLocation | null | undefined
): number[] => {
	if (!location) return [];
	if (Array.isArray(location.deviceIds) && location.deviceIds.length > 0) return location.deviceIds;
	if (location.deviceId != null && location.deviceId > 0) return [location.deviceId];
	return [];
};

/**
 * 參數類型小數位數映射
 */
export const getParameterFractionDigits = (type: SensorParameterType | string): number => {
	const fromCatalog = getEnvironmentParameterDefinition(type)?.fractionDigits;
	if (fromCatalog != null) return fromCatalog;
	return 0;
};

type FormatSensorValueOptions = {
	fallback?: string;
};

/**
 * 統一感測器數值顯示格式（避免同一參數在不同元件顯示不一致）
 */
export const formatSensorValue = (
	type: SensorParameterType | string,
	value: number | null | undefined,
	options: FormatSensorValueOptions = {}
): string => {
	const fallback = options.fallback ?? "--";
	if (value === null || value === undefined || Number.isNaN(value)) return fallback;

	const digits = getParameterFractionDigits(type);
	return value.toFixed(digits);
};

/**
 * 清理參數格式（移除舊格式的欄位，只保留 type 和 enabled）
 * 支援多種 enabled 格式：布林值、字串 "true"/"false"、數字 1/0
 */
export const cleanParameters = (parameters: any[]): SensorParameter[] => {
	if (!Array.isArray(parameters)) return [];

	return parameters
		.filter(p => p && p.type)
		.map(p => {
			// 處理 enabled 欄位：支援布林值、字串、數字
			let enabled = false;
			if (typeof p.enabled === "boolean") {
				enabled = p.enabled;
			} else if (typeof p.enabled === "string") {
				enabled = p.enabled.toLowerCase() === "true" || p.enabled === "1";
			} else if (typeof p.enabled === "number") {
				enabled = p.enabled !== 0;
			} else if (p.enabled === undefined || p.enabled === null) {
				// 如果沒有 enabled 欄位，預設為 false
				enabled = false;
			}

			return {
				type: p.type as SensorParameterType,
				enabled
			};
		});
};

/**
 * 清理地點資料（確保參數格式正確）
 */
export const cleanLocation = (location: EnvironmentLocation): EnvironmentLocation => {
	return {
		...location,
		parameters: cleanParameters(location.parameters || [])
	};
};

/**
 * 清理區域資料（確保所有地點的參數格式正確）
 */
export const cleanZone = (zone: EnvironmentZone): EnvironmentZone => {
	// 過濾掉名稱為空的地點，然後清理參數格式
	const validLocations = (zone.locations || [])
		.filter(loc => loc.name && loc.name.trim().length > 0)
		.map(cleanLocation);
	
	return {
		...zone,
		locations: validLocations
	};
};
