/** 人流／車輛完整報表單次上限（與後端 ENTRY_EXIT_MAX_RECORDS 一致） */
export const ENTRY_EXIT_FULL_REPORT_LIMIT = 10000;

/** 主畫面進出／過車記錄：每頁 5 筆、最多 25 筆（5 頁） */
export const ENTRY_EXIT_DASHBOARD_LOGS_PAGE_SIZE = 5;
export const ENTRY_EXIT_DASHBOARD_LOGS_MAX_RECORDS = 25;

export const maxEntryExitDashboardLogsOffset = (): number =>
	Math.max(0, ENTRY_EXIT_DASHBOARD_LOGS_MAX_RECORDS - ENTRY_EXIT_DASHBOARD_LOGS_PAGE_SIZE);

export const capEntryExitDashboardLogsTotal = (total: number): number =>
	Math.min(Math.max(0, total), ENTRY_EXIT_DASHBOARD_LOGS_MAX_RECORDS);

export type EntryExitBackendPreset = "today" | "yesterday" | "last7days";

export interface OperationalDayRangeResponse {
	preset: EntryExitBackendPreset;
	start: string;
	end: string;
	maxRecords: number;
}

/** UI TimeRangePicker preset → 後端 timeRange */
export const mapUiPresetToBackend = (preset: string): EntryExitBackendPreset | "custom" => {
	if (preset === "today") return "today";
	if (preset === "yesterday") return "yesterday";
	if (preset === "last_7_days") return "last7days";
	return "custom";
};

export const buildLogsTimeQuery = (
	preset: string,
	startDate: string,
	endDate: string
): { timeRange?: EntryExitBackendPreset; startTime?: string; endTime?: string } => {
	const mapped = mapUiPresetToBackend(preset);
	if (mapped !== "custom") {
		return { timeRange: mapped };
	}
	return { startTime: startDate, endTime: endDate };
};

export const toSimulationTimeRange = (
	range: OperationalDayRangeResponse,
	preset = "today"
): { startDate: string; endDate: string; preset: string } => ({
	startDate: range.start,
	endDate: range.end,
	preset
});
