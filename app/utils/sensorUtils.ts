import type {
	SensorParameterType,
	SensorParameter,
	EnvironmentLocation,
	EnvironmentZone
} from "~/types/environment";

/**
 * 參數類型顯示名稱映射
 */
export const getParameterDisplayName = (type: SensorParameterType): string => {
	const nameMap: Record<SensorParameterType, string> = {
		pm25: "PM2.5",
		pm10: "PM10",
		tvoc: "TVOC",
		hcho: "HCHO",
		humidity: "濕度",
		temperature: "溫度",
		co2: "CO2",
		noise: "噪音值",
		wind: "風速"
	};
	return nameMap[type] || type;
};

/**
 * 參數類型單位映射
 */
export const getParameterUnit = (type: SensorParameterType): string => {
	const unitMap: Record<SensorParameterType, string> = {
		pm25: "µg/m³",
		pm10: "µg/m³",
		tvoc: "ppm",
		hcho: "ppm",
		humidity: "%",
		temperature: "°C",
		co2: "ppm",
		noise: "dB",
		wind: "m/s"
	};
	return unitMap[type] || "";
};

/**
 * 參數類型圖標映射
 */
export const getParameterIcon = (type: SensorParameterType): string => {
	const iconMap: Record<SensorParameterType, string> = {
		pm25: "/environment/PM2.5.png",
		pm10: "/environment/PM10.png",
		tvoc: "/environment/TVOC.png",
		hcho: "/environment/HCHO.png",
		humidity: "/environment/humidity.png",
		temperature: "/environment/temperature.png",
		co2: "/environment/CO2.png",
		noise: "/environment/noise.png",
		wind: "/environment/wind-speed.png"
	};
	return iconMap[type] || "";
};

/**
 * 參數類型小數位數映射
 */
export const getParameterFractionDigits = (type: SensorParameterType): number => {
	if (type === "temperature" || type === "humidity" || type === "wind") return 1;
	if (type === "tvoc") return 3;
	return 0;
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

