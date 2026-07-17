import type { SensorParameterType } from "~/types/environment";
import type { MonitoringStatusText } from "~/utils/monitoringStatus";
import { normalizeMonitoringStatusText } from "~/utils/monitoringStatus";
import { getEnvironmentParameterDefinition } from "~/utils/environmentCatalogRuntime";

const ARC_COLOR_BY_STATUS: Record<MonitoringStatusText, string> = {
	正常: "#00FFB5",
	異常: "#FFC701",
	警報: "#FF0000",
	離線: "#888888"
};

export const getGaugeArcPercentage = (
	type: SensorParameterType | string,
	value: number | null
): number => {
	if (value === null || value < 0) return 0;
	const max = getEnvironmentParameterDefinition(type)?.gaugeMax ?? 100;
	return Math.min((value / max) * 100, 100);
};

/** 依警報規則狀態上色（與首頁儀表一致：正常綠、異常黃、警報紅） */
export const getGaugeArcColor = (
	type: SensorParameterType | string,
	value: number | null,
	getStatusText: (type: string, value: number | null) => string
): string => ARC_COLOR_BY_STATUS[normalizeMonitoringStatusText(getStatusText(type, value))];
