import type { EnvironmentParameterLevelBand, EnvironmentParameterStatusBand } from "~/types/environmentCatalog"
import { getEnvironmentParameterDefinition } from "~/utils/environmentCatalogRuntime"

export type DerivedMetricStatus = "normal" | "warning" | "alarm" | "offline"

export type HeatIndexResult = {
	/** Heat Index (°C)，來自後端 data.heatIndex */
	valueC: number | null
	/** 1~5 等級；0 表示無資料 */
	level: number
	status: DerivedMetricStatus
}

const resolveStatusFromBands = (
	value: number,
	bands: EnvironmentParameterStatusBand[] | undefined,
): DerivedMetricStatus => {
	if (!bands?.length) return "normal"
	for (const band of bands) {
		if (band.max == null || value <= band.max) {
			if (band.status === "warning") return "warning"
			if (band.status === "alarm") return "alarm"
			return "normal"
		}
	}
	return "alarm"
}

const resolveLevelFromBands = (
	value: number,
	bands: EnvironmentParameterLevelBand[] | undefined,
): number => {
	if (!bands?.length) return 0
	for (const band of bands) {
		if (band.max == null || value <= band.max) return band.level
	}
	return bands[bands.length - 1]?.level ?? 0
}

export const getAqiDerivedStatusFromValue = (
	aqi: number | null | undefined,
): { aqi: number | null; status: DerivedMetricStatus } => {
	if (aqi == null || !Number.isFinite(aqi)) return { aqi: null, status: "offline" }
	const bands = getEnvironmentParameterDefinition("aqi")?.display?.statusBands
	return {
		aqi: Math.round(aqi),
		status: resolveStatusFromBands(aqi, bands),
	}
}

export const getAqiDerivedStatusFromReading = (data: {
	aqi?: number | null
}): { aqi: number | null; status: DerivedMetricStatus } =>
	getAqiDerivedStatusFromValue(data.aqi ?? null)

export const getHeatIndexLevelFromValue = (
	heatIndex: number | null | undefined,
): number => {
	if (heatIndex == null || !Number.isFinite(heatIndex)) return 0
	const bands = getEnvironmentParameterDefinition("heatIndex")?.display?.levelBands
	return resolveLevelFromBands(heatIndex, bands)
}

export const getHeatIndexDerivedResultFromReading = (data: {
	heatIndex?: number | null
}): HeatIndexResult => {
	const valueC = data.heatIndex ?? null
	if (valueC == null || !Number.isFinite(valueC)) {
		return { valueC: null, level: 0, status: "offline" }
	}
	const level = getHeatIndexLevelFromValue(valueC)
	const status: DerivedMetricStatus =
		level <= 2 ? "normal" : level === 3 ? "warning" : "alarm"
	return { valueC, level, status }
}
