/**
 * 統一的時間處理工具函數
 * 使用 UTC 時間，與後端保持一致
 */

/**
 * 獲取當天的開始和結束時間（UTC）
 * 與後端 getTodayDateRange() 邏輯一致
 */
export function getTodayDateRangeUTC(): { start: Date; end: Date } {
	const now = new Date();
	const todayStart = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
	);
	const todayEnd = new Date(todayStart);
	todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
	return { start: todayStart, end: todayEnd };
}

/**
 * 獲取時間範圍（回傳 Date 以 toISOString() 送後端）
 * 以「使用者本地日曆 00:00」為日界，避免 UTC 午夜在台灣變成 08:00 換日的錯覺
 */
export function getTimeRangeUTC(preset: string): { start: Date; end: Date } {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	const d = now.getDate();
	const endDefault = new Date(y, m, d + 1, 0, 0, 0, 0);
	let start = new Date(now);
	let end = new Date(endDefault);

	switch (preset) {
		case "past_hour":
			start = new Date(now.getTime() - 60 * 60 * 1000);
			end = new Date(now);
			break;
		case "today":
			return { start: new Date(y, m, d, 0, 0, 0, 0), end: endDefault };
		case "yesterday":
			return {
				start: new Date(y, m, d - 1, 0, 0, 0, 0),
				end: new Date(y, m, d, 0, 0, 0, 0)
			};
		case "this_week": {
			const dayOfWeek = now.getDay();
			const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			start = new Date(y, m, d + toMonday, 0, 0, 0, 0);
			end = endDefault;
			break;
		}
		case "last_week": {
			const dayOfWeek = now.getDay();
			const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			start = new Date(y, m, d + toMonday - 7, 0, 0, 0, 0);
			end = new Date(y, m, d + toMonday, 0, 0, 0, 0);
			return { start, end };
		}
		case "last_7_days":
			start = new Date(y, m, d - 7, 0, 0, 0, 0);
			end = endDefault;
			break;
		case "last_30_days":
			start = new Date(y, m, d - 30, 0, 0, 0, 0);
			end = endDefault;
			break;
		default:
			return { start: new Date(), end: new Date() };
	}

	return { start, end };
}

/** 趨勢圖用時間範圍（UTC）：日／週／月／年，與後端 aggregated API 對齊 */
export function getTimeRangeForTrendUTC(
	period: "day" | "week" | "month" | "year"
): { start: Date; end: Date } {
	const { start: todayStart, end: tomorrowStart } = getTodayDateRangeUTC();
	const todayEnd = new Date(tomorrowStart.getTime() - 1);

	const now = new Date();
	switch (period) {
		case "day":
			return { start: new Date(todayStart), end: todayEnd };
		case "week":
			return {
				start: new Date(
					Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0)
				),
				end: todayEnd
			};
		case "month":
			return {
				start: new Date(
					Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29, 0, 0, 0, 0)
				),
				end: todayEnd
			};
		case "year":
			return {
				start: new Date(
					Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, now.getUTCDate(), 0, 0, 0, 0)
				),
				end: todayEnd
			};
		default:
			return { start: new Date(todayStart), end: todayEnd };
	}
}

/** 時間範圍預設選項（與 TimeRangePicker 共用） */
export const TIME_RANGE_PRESETS = [
	{ value: "past_hour", label: "過去一小時" },
	{ value: "today", label: "今天" },
	{ value: "yesterday", label: "昨天" },
	{ value: "this_week", label: "本週" },
	{ value: "last_week", label: "上周" },
	{ value: "last_7_days", label: "近七天" },
	{ value: "last_30_days", label: "最近三十天" },
	{ value: "custom", label: "自訂" },
] as const;

/** 完整報表用：不含「過去一小時」 */
export const TIME_RANGE_PRESETS_FULL_REPORT = TIME_RANGE_PRESETS.filter(
	(p) => p.value !== "past_hour"
);

/**
 * 格式化日期為本地顯示格式（YYYY/MM/DD）
 */
export function formatDateLocal(date: Date): string {
	const padZero = (n: number): string => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(date.getDate())}`;
}

/**
 * 格式化日期為 date input 格式（YYYY-MM-DD）
 */
export function formatDateInput(date: Date): string {
	const padZero = (n: number): string => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

/**
 * 格式化日期時間為本地顯示格式（YYYY/MM/DD HH:mm）
 * @param dateString - ISO 8601 格式的日期時間字符串
 * @param includeSeconds - 是否包含秒數（預設為 false）
 * @returns 格式化後的本地日期時間字符串
 */
export function formatDateTime(dateString: string, includeSeconds = false): string {
	return new Date(dateString).toLocaleString("zh-TW", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: includeSeconds ? "2-digit" : undefined,
		hour12: false
	});
}

/**
 * 格式化日期時間為本地顯示格式（僅日期，YYYY/MM/DD）
 * @param dateString - ISO 8601 格式的日期時間字符串（可選）
 * @returns 格式化後的本地日期字符串，如果為空則返回 "-"
 */
export function formatDate(dateString?: string | null): string {
	if (!dateString) return "-";
	return formatDateLocal(new Date(dateString));
}

/**
 * 格式化日期時間為本地顯示格式（僅時間，HH:mm:ss）
 * @param dateString - ISO 8601 格式的日期時間字符串（可選）
 * @returns 格式化後的本地時間字符串，如果為空則返回 "-"
 */
export function formatTime(dateString?: string | null): string {
	if (!dateString) return "-";
	return new Date(dateString).toLocaleTimeString("zh-TW", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	});
}
