import type { SensorParameterType } from "~/types/environment"
import { normalizeMonitoringStatusText } from "~/utils/monitoringStatus"

const GAUGE_ARC_MAX: Record<SensorParameterType, number> = {
	pm25: 150,
	pm10: 150,
	tvoc: 10,
	hcho: 1,
	humidity: 100,
	temperature: 50,
	co2: 2000,
	noise: 100,
	wind: 30,
}

const ARC_COLOR_BY_STATUS: Record<string, string> = {
	警報: "#FF0000",
	異常: "#FFC701",
	離線: "#888888",
}

export const getGaugeArcPercentage = (
	type: SensorParameterType,
	value: number | null
): number => {
	if (value === null || value < 0) return 0
	const max = GAUGE_ARC_MAX[type] ?? 100
	return Math.min((value / max) * 100, 100)
}

export const getGaugeArcColor = (
	type: SensorParameterType,
	value: number | null,
	getStatusText: (type: string, value: number | null) => string
): string => {
	if (value === null) return "#00ffb4"
	const status = normalizeMonitoringStatusText(getStatusText(type, value))
	return ARC_COLOR_BY_STATUS[status] ?? "#00ffb4"
}
