import { calculateAqiScore } from "~/utils/environmentAqi";

export type DerivedMetricStatus = "normal" | "abnormal" | "alarm" | "offline";

export type HeatIndexResult = {
	/** Heat Index (°C) */
	valueC: number | null;
	/** 1~5 等級；0 表示無資料 */
	level: number;
	status: DerivedMetricStatus;
};

export const getAqiDerivedStatus = (
	pm25: number | null,
	pm10: number | null
): { aqi: number | null; status: DerivedMetricStatus } => {
	const aqi = calculateAqiScore({ pm25, pm10 });
	if (aqi === null) return { aqi: null, status: "offline" };

	// UI 需求：AQI 0~100 視為正常（與現場常見判讀一致）
	if (aqi <= 100) return { aqi, status: "normal" };
	if (aqi <= 150) return { aqi, status: "abnormal" };
	return { aqi, status: "alarm" };
};

/**
 * 熱指數：沿用現有 Construction dashboard 的簡化公式與分級
 * - valueC: \(HI = T + 0.5 * (T - 14.4) * ((RH - 50) / 100)\)
 * - 若 T < 27°C，HI = T
 * - level:
 *   1: <27
 *   2: 27~<32
 *   3: 32~<41
 *   4: 41~<54
 *   5: >=54
 */
export const getHeatIndexDerivedResult = (
	temperatureC: number | null,
	humidityPercent: number | null
): HeatIndexResult => {
	if (temperatureC === null || humidityPercent === null) {
		return { valueC: null, level: 0, status: "offline" };
	}
	if (!Number.isFinite(temperatureC) || !Number.isFinite(humidityPercent)) {
		return { valueC: null, level: 0, status: "offline" };
	}

	const t = temperatureC;
	const rh = humidityPercent;
	let hi = t + 0.5 * (t - 14.4) * ((rh - 50) / 100);
	if (t < 27) {
		hi = t;
	}

	const valueC = Math.round(hi * 10) / 10;

	let level = 1;
	if (valueC >= 54) level = 5;
	else if (valueC >= 41) level = 4;
	else if (valueC >= 32) level = 3;
	else if (valueC >= 27) level = 2;

	const status: DerivedMetricStatus = level <= 2 ? "normal" : level === 3 ? "abnormal" : "alarm";

	return { valueC, level, status };
};
